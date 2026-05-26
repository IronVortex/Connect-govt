import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { UploadedDocument, UploadedDocumentDocument } from '../../models/UploadedDocument';
import { RequiredDocument, RequiredDocumentDocument } from '../../models/RequiredDocument';
import { DetectionService, DetectionStatus } from './detection.service';
import { ConfigService } from '@nestjs/config';
import { logger } from '../../logger';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly storageRoot: string;
  private readonly storagePrefix = 'uploads/secure';

  constructor(
    @InjectModel(UploadedDocument.name)
    private uploadModel: Model<UploadedDocumentDocument>,
    @InjectModel(RequiredDocument.name)
    private requiredDocumentModel: Model<RequiredDocumentDocument>,
    private detectionService: DetectionService,
    private configService: ConfigService,
  ) {
    this.storageRoot = this.configService.get<string>('UPLOAD_STORAGE_PATH') || join(process.cwd(), 'uploads', 'secure');
    if (!existsSync(this.storageRoot)) {
      mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  async create(upload: Partial<UploadedDocument>): Promise<UploadedDocument> {
    const newUpload = new this.uploadModel(upload);
    return newUpload.save();
  }

  async getRequiredDocument(id: string): Promise<RequiredDocument | null> {
    return this.requiredDocumentModel.findById(id).exec();
  }

  async findByUser(userId: string): Promise<UploadedDocument[]> {
    return this.uploadModel
      .find({ user: userId })
      .populate('requiredDocument')
      .exec();
  }

  async findOne(uploadId: string): Promise<UploadedDocument | null> {
    return this.uploadModel
      .findById(uploadId)
      .populate('requiredDocument')
      .exec();
  }

  async findWalletDocuments(userId: string): Promise<UploadedDocument[]> {
    return this.uploadModel
      .find({
        user: userId,
        verified: true,
        expiresAt: { $gte: new Date() },
      })
      .populate('requiredDocument')
      .exec();
  }

  getFilePath(storagePath: string) {
    const absolutePath = join(process.cwd(), storagePath);
    if (!absolutePath.startsWith(this.storageRoot)) {
      throw new Error('Invalid storage path');
    }
    return absolutePath;
  }

  storeFile(file: Express.Multer.File): string {
    const extension = extname(file.originalname) || `.${file.mimetype.split('/').pop()}`;
    const safeName = basename(file.originalname, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}-${safeName}${extension}`;
    const relativePath = join(this.storagePrefix, filename);
    const absolutePath = join(process.cwd(), relativePath);

    const directory = join(this.storageRoot);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    writeFileSync(absolutePath, file.buffer);
    return relativePath;
  }

  detectDocumentType(filename: string, content?: string): string {
    return (
      this.getTypeFromText(filename) ??
      this.getTypeFromText(content || '') ??
      'Unknown'
    );
  }

  async analyzeUpload(
    filePath: string,
    expectedDocumentType?: string,
    mimeType?: string,
    fileBuffer?: Buffer,
  ): Promise<{
    detectedType: string;
    status: DetectionStatus;
    confidence: number;
    extractedText: string;
    reasons: string[];
  }> {
    const filename = basename(filePath);
    this.logger.log(`Analyzing upload: filename="${filename}", mimeType="${mimeType}", expectedType="${expectedDocumentType}"`);

    let extractedText = '';
    let imageProperties: { width?: number; height?: number; aspect?: number } = {};

    let buffer = fileBuffer;
    if (!buffer || buffer.length === 0) {
      try {
        const absolutePath = this.getFilePath(filePath);
        if (existsSync(absolutePath)) {
          buffer = require('fs').readFileSync(absolutePath);
        }
      } catch (err) {
        this.logger.error(`Failed to read file from path ${filePath}:`, err);
      }
    }

    if (buffer && buffer.length > 0) {
      try {
        if (mimeType === 'application/pdf') {
          const result = await this.extractTextFromPdf(buffer);
          extractedText = result.text;
          const { width, height } = result;
          if (width !== undefined && height !== undefined) {
            imageProperties = {
              width,
              height,
              aspect: width / height,
            };
          }
        } else if (mimeType && mimeType.startsWith('image/')) {
          const result = await this.processImage(buffer);
          extractedText = result.text;
          const { width, height } = result;
          if (width !== undefined && height !== undefined) {
            imageProperties = {
              width,
              height,
              aspect: width / height,
            };
          }
        }
      } catch (err: any) {
        this.logger.error(`Error processing file content for ${filename}: ${err?.message || String(err)}`, err?.stack);
      }
    } else {
      this.logger.warn('No file buffer provided for OCR analysis. Running filename-only heuristics.');
    }

    // Clean and normalize the text content
    const normalizedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();

    const detection = await this.detectionService.detect(
      filename,
      mimeType,
      normalizedText,
      expectedDocumentType,
      imageProperties,
    );

    return {
      detectedType: detection.documentType,
      status: detection.status,
      confidence: detection.confidence,
      extractedText: normalizedText.slice(0, 5000),
      reasons: detection.reasons,
    };
  }

  private async performOcr(buffer: Buffer): Promise<string> {
    try {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(buffer);
      await worker.terminate();
      return text || '';
    } catch (err) {
      this.logger.error('Tesseract OCR failed:', err);
      return '';
    }
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<{ text: string; width?: number; height?: number }> {
    let text = '';
    let width: number | undefined;
    let height: number | undefined;

    try {
      // 1. Polyfill process.getBuiltinModule
      if (typeof (process as any).getBuiltinModule !== 'function') {
        (process as any).getBuiltinModule = function (name: string) {
          return require(name);
        };
      }

      // 2. Dynamic import pdfjs (bypassing TS require conversion)
      const loadESM = new Function('modulePath', 'return import(modulePath)');
      const pdfjs = await loadESM('pdfjs-dist/legacy/build/pdf.mjs');
      const napiCanvas = require('@napi-rs/canvas');
      const { pathToFileURL } = require('url');
      const path = require('path');

      const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
      pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

      // Polyfill globals for rendering
      (global as any).DOMMatrix = napiCanvas.DOMMatrix;
      (global as any).ImageData = napiCanvas.ImageData;

      const uint8Array = new Uint8Array(buffer);
      const loadingTask = pdfjs.getDocument({ data: uint8Array });
      const pdfDoc = await loadingTask.promise;
      this.logger.log(`PDF loaded. Total pages: ${pdfDoc.numPages}`);

      // Extract digital text first
      let digitalText = '';
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        digitalText += pageText + '\n';
      }

      const trimmedDigital = digitalText.trim();
      if (trimmedDigital.length >= 30) {
        this.logger.log(`Extracted digital PDF text, length: ${trimmedDigital.length}`);
        text = trimmedDigital;
      } else {
        this.logger.log('Digital PDF text empty or too short. Rendering first page to image and running OCR...');
        // Render first page to canvas
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        width = viewport.width;
        height = viewport.height;

        const canvas = napiCanvas.createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        const pngBuffer = canvas.toBuffer('image/png');
        this.logger.log('PDF page 1 rendered successfully. Starting OCR...');
        const ocrText = await this.performOcr(pngBuffer);
        this.logger.log(`OCR extraction completed. Length: ${ocrText.length}`);
        text = ocrText;
      }
    } catch (err: any) {
      this.logger.error(`Failed to extract text from PDF: ${err?.message || String(err)}`);
    }

    return { text, width, height };
  }

  private async processImage(buffer: Buffer): Promise<{ text: string; width?: number; height?: number }> {
    let text = '';
    let width: number | undefined;
    let height: number | undefined;

    try {
      const napiCanvas = require('@napi-rs/canvas');
      const img = new napiCanvas.Image();
      img.src = buffer;
      width = img.width;
      height = img.height;
      this.logger.log(`Image properties: width=${width}, height=${height}, aspect=${width !== undefined && height ? width / height : 'N/A'}`);
    } catch (err: any) {
      this.logger.warn(`Failed to extract image properties: ${err?.message || String(err)}`);
    }

    text = await this.performOcr(buffer);
    this.logger.log(`Image OCR completed. Length: ${text.length}`);

    return { text, width, height };
  }


  private getTypeFromText(text: string): string | null {
    const lower = text.toLowerCase();

    if (lower.includes('aadhaar') || lower.includes('aadhar')) {
      return 'Aadhaar Card';
    }
    if (lower.includes('pan')) {
      return 'PAN Card';
    }
    if (lower.includes('insurance')) {
      return 'Insurance';
    }
    if (lower.includes('invoice')) {
      return 'Invoice';
    }

    return null;
  }
}
