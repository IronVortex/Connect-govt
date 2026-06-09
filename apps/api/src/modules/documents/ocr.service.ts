import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { NO_TEXT_FOUND, type OcrExtractionResult } from './types/document-intelligence.types';

const MIN_DIGITAL_TEXT_LENGTH = 25;
const MAX_PDF_OCR_PAGES = 3;

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  async extractFromFile(buffer: Buffer, mimeType?: string): Promise<OcrExtractionResult> {
    if (!buffer?.length) {
      return { text: NO_TEXT_FOUND, imageProperties: {}, ocrConfidence: 0 };
    }

    if (mimeType === 'application/pdf') {
      return this.extractFromPdf(buffer);
    }

    if (mimeType?.startsWith('image/')) {
      return this.extractFromImage(buffer);
    }

    this.logger.warn(`Unsupported mime type for OCR: ${mimeType || 'unknown'}`);
    return { text: NO_TEXT_FOUND, imageProperties: {}, ocrConfidence: 0 };
  }

  async preprocessImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize({ width: 2200, withoutEnlargement: true })
        .grayscale()
        .median(3)
        .normalize()
        .sharpen({ sigma: 1 })
        .gamma(1.1)
        .toBuffer();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Image preprocessing failed, using original buffer: ${message}`);
      return buffer;
    }
  }

  normalizeText(text: string): string {
    if (!text || !text.trim()) {
      return NO_TEXT_FOUND;
    }

    return text
      .replace(/\r\n/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/[|¦]/g, 'I')
      .replace(/[`'']/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .replace(/([a-zA-Z])\s+([a-zA-Z])/g, '$1 $2')
      .trim();
  }

  private async extractFromImage(buffer: Buffer): Promise<OcrExtractionResult> {
    let width: number | undefined;
    let height: number | undefined;

    try {
      const metadata = await sharp(buffer).metadata();
      width = metadata.width;
      height = metadata.height;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to read image metadata: ${message}`);
    }

    const preprocessed = await this.preprocessImage(buffer);
    const ocrResult = await this.performOcr(preprocessed);

    return {
      text: this.normalizeText(ocrResult.text),
      imageProperties: {
        width,
        height,
        aspect: width && height ? width / height : undefined,
      },
      ocrConfidence: ocrResult.confidence,
    };
  }

  private async extractFromPdf(buffer: Buffer): Promise<OcrExtractionResult> {
    let width: number | undefined;
    let height: number | undefined;
    const textParts: string[] = [];
    let ocrConfidence = 0;

    try {
      const digitalText = await this.extractDigitalPdfText(buffer);
      if (digitalText.length >= MIN_DIGITAL_TEXT_LENGTH) {
        textParts.push(digitalText);
        this.logger.log(`PDF digital text extracted (${digitalText.length} chars)`);
      }

      if (this.needsOcrFallback(textParts.join('\n'))) {
        const ocrPages = await this.extractPdfPagesWithOcr(buffer);
        if (ocrPages.text) {
          textParts.push(ocrPages.text);
        }
        ocrConfidence = ocrPages.confidence;
        width = ocrPages.width;
        height = ocrPages.height;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`PDF extraction failed, trying pdf-parse fallback: ${message}`);

      const fallbackText = await this.extractWithPdfParse(buffer);
      if (fallbackText) {
        textParts.push(fallbackText);
      }
    }

    const merged = this.mergeExtractedParts(textParts);

    return {
      text: this.normalizeText(merged),
      imageProperties: {
        width,
        height,
        aspect: width && height ? width / height : undefined,
      },
      ocrConfidence,
    };
  }

  private async extractDigitalPdfText(buffer: Buffer): Promise<string> {
    const pdfjs = await this.loadPdfJs();
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
      const page = await pdfDoc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: { str?: string }) => item.str || '')
        .join(' ')
        .trim();
      if (pageText) {
        pages.push(pageText);
      }
    }

    return pages.join('\n');
  }

  private async extractPdfPagesWithOcr(
    buffer: Buffer,
  ): Promise<{ text: string; confidence: number; width?: number; height?: number }> {
    const pdfjs = await this.loadPdfJs();
    const napiCanvas = require('@napi-rs/canvas');
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pagesToProcess = Math.min(pdfDoc.numPages, MAX_PDF_OCR_PAGES);

    const pageTexts: string[] = [];
    const confidences: number[] = [];
    let width: number | undefined;
    let height: number | undefined;

    for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber++) {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      if (pageNumber === 1) {
        width = viewport.width;
        height = viewport.height;
      }

      const canvas = napiCanvas.createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;

      const preprocessed = await this.preprocessImage(canvas.toBuffer('image/png'));
      const ocrResult = await this.performOcr(preprocessed);
      if (ocrResult.text.trim()) {
        pageTexts.push(ocrResult.text.trim());
        confidences.push(ocrResult.confidence);
      }
    }

    const confidence =
      confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : 0;

    this.logger.log(
      `PDF OCR completed for ${pagesToProcess} page(s), avg confidence=${confidence.toFixed(1)}`,
    );

    return {
      text: pageTexts.join('\n'),
      confidence,
      width,
      height,
    };
  }

  private async extractWithPdfParse(buffer: Buffer): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return (result.text || '').trim();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`pdf-parse fallback failed: ${message}`);
      return '';
    }
  }

  private async loadPdfJs(): Promise<{
    getDocument: (options: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
    GlobalWorkerOptions: { workerSrc: string };
  }> {
    if (
      typeof (process as NodeJS.Process & { getBuiltinModule?: (name: string) => unknown })
        .getBuiltinModule !== 'function'
    ) {
      (process as NodeJS.Process & { getBuiltinModule?: (name: string) => unknown }).getBuiltinModule =
        (name: string) => require(name);
    }

    const loadESM = new Function('modulePath', 'return import(modulePath)');
    const pdfjs = await loadESM('pdfjs-dist/legacy/build/pdf.mjs');
    const napiCanvas = require('@napi-rs/canvas');
    const { pathToFileURL } = require('url');
    const path = require('path');

    const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();

    (global as typeof globalThis & { DOMMatrix?: unknown; ImageData?: unknown }).DOMMatrix =
      napiCanvas.DOMMatrix;
    (global as typeof globalThis & { DOMMatrix?: unknown; ImageData?: unknown }).ImageData =
      napiCanvas.ImageData;

    return pdfjs;
  }

  private needsOcrFallback(text: string): boolean {
    const cleaned = text.replace(/\s+/g, '').trim();
    return cleaned.length < MIN_DIGITAL_TEXT_LENGTH;
  }

  private mergeExtractedParts(parts: string[]): string {
    const uniqueParts = parts
      .map(part => part.trim())
      .filter(part => part.length > 0);

    if (uniqueParts.length === 0) {
      return '';
    }

    if (uniqueParts.length === 1) {
      return uniqueParts[0];
    }

    const merged: string[] = [];
    for (const part of uniqueParts) {
      const isDuplicate = merged.some(existing => {
        const shorter = part.length < existing.length ? part : existing;
        const longer = part.length < existing.length ? existing : part;
        return longer.includes(shorter) && shorter.length / longer.length > 0.7;
      });
      if (!isDuplicate) {
        merged.push(part);
      }
    }

    return merged.join('\n');
  }

  private async performOcr(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();

      return {
        text: data.text || '',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tesseract OCR failed: ${message}`);
      return { text: '', confidence: 0 };
    }
  }
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
}

interface PdfPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  render: (context: {
    canvasContext: unknown;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}
