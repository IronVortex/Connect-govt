import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import {
  NO_TEXT_FOUND,
  OcrBlock,
  OcrExtractionResult,
  OcrLine,
  OcrPage,
} from './types/document-intelligence.types';
import { PreprocessingService } from './preprocessing.service';

const MIN_DIGITAL_TEXT_LENGTH = 25;
const MAX_PDF_OCR_PAGES = 10;

// ---------------------------------------------------------------------------
// Module-level Tesseract singleton
// Keeping the worker alive between requests eliminates the 15-20s cold-start
// that occurred when createWorker+terminate was called on every request.
// ---------------------------------------------------------------------------
let _tesseractWorkerPromise: Promise<any> | null = null;

async function getTesseractWorker(): Promise<any> {
  if (!_tesseractWorkerPromise) {
    _tesseractWorkerPromise = (async () => {
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return _tesseractWorkerPromise;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly preprocessingService: PreprocessingService) {}

  async extractFromFile(buffer: Buffer, mimeType?: string): Promise<OcrExtractionResult> {
    if (!buffer?.length) {
      return this.emptyResult(['Empty file — no content to process']);
    }

    if (mimeType === 'application/pdf') {
      return this.extractFromPdf(buffer);
    }

    if (mimeType?.startsWith('image/')) {
      return this.extractFromImage(buffer);
    }

    this.logger.warn(`Unsupported mime type for OCR: ${mimeType || 'unknown'}`);
    return this.emptyResult([`Unsupported file type: ${mimeType || 'unknown'}`]);
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
      .trim();
  }

  private async recognizeAndPostprocess(
    preprocessedBuffer: Buffer,
    pageNumber: number,
    originalBuffer?: Buffer,
  ): Promise<{
    text: string;
    confidence: number;
    pages: OcrPage[];
    blocks: OcrBlock[];
    lines: OcrLine[];
  }> {
    let ocrResult = await this.performDetailedOcr(preprocessedBuffer, pageNumber);
    
    // Check if we should try rotations due to low confidence or no text
    if (ocrResult.confidence < 60 || ocrResult.text.trim().length < 15) {
      this.logger.log(`[OCR] Low confidence (${ocrResult.confidence.toFixed(1)}%) or low text length on page ${pageNumber}. Trying rotation checks...`);
      let bestResult = ocrResult;
      const rotations = [90, 180, 270];
      for (const angle of rotations) {
        try {
          const rotated = await sharp(preprocessedBuffer).rotate(angle).toBuffer();
          const result = await this.performDetailedOcr(rotated, pageNumber);
          if (result.confidence > bestResult.confidence && result.text.trim().length > bestResult.text.trim().length) {
            this.logger.log(`[OCR] Better orientation found at ${angle} degrees (confidence: ${result.confidence.toFixed(1)}%)`);
            bestResult = result;
            if (result.confidence > 80) break;
          }
        } catch (err) {
          this.logger.warn(`Rotation at ${angle} degrees failed: ${err}`);
        }
      }
      ocrResult = bestResult;
    }

    // Try raw image fallback if still very low confidence and original buffer is provided
    if ((ocrResult.confidence < 50 || ocrResult.text.trim().length < 10) && originalBuffer?.length) {
      try {
        this.logger.log(`[OCR] Preprocessing was ineffective for page ${pageNumber}. Trying raw image...`);
        const rawRotated = await sharp(originalBuffer).rotate().toBuffer().catch(() => originalBuffer);
        const rawOcr = await this.performDetailedOcr(rawRotated, pageNumber);
        if (rawOcr.confidence > ocrResult.confidence && rawOcr.text.trim().length > ocrResult.text.trim().length) {
          ocrResult = rawOcr;
        }
      } catch (err) {
        this.logger.warn(`Raw image OCR fallback failed: ${err}`);
      }
    }

    return ocrResult;
  }

  private async extractFromImage(buffer: Buffer): Promise<OcrExtractionResult> {
    const t0 = performance.now();

    const qualityIssues = await this.preprocessingService.assessImageQuality(buffer);
    const preprocessed = await this.preprocessingService.preprocessForOcr(buffer);
    const tPreprocess = performance.now();
    this.logger.log(`[OCR] Preprocess: ${Math.round(tPreprocess - t0)}ms`);

    const ocrResult = await this.recognizeAndPostprocess(preprocessed.buffer, 1, buffer);
    const tOcr = performance.now();
    this.logger.log(`[OCR] Tesseract recognition: ${Math.round(tOcr - tPreprocess)}ms`);

    if (!ocrResult.text.trim() && qualityIssues.length === 0) {
      qualityIssues.push('Text unreadable — no characters detected after preprocessing');
    }

    const text = this.normalizeText(ocrResult.text);
    const confidence = ocrResult.confidence;

    this.logger.log(`[OCR] Image complete: ${Math.round(tOcr - t0)}ms — chars=${text.length}, confidence=${confidence.toFixed(1)}%`);

    return {
      text,
      confidence,
      pages: ocrResult.pages,
      blocks: ocrResult.blocks,
      lines: ocrResult.lines,
      qualityIssues,
      imageProperties: {
        width: preprocessed.width,
        height: preprocessed.height,
        aspect: preprocessed.aspect,
      },
      ocrConfidence: confidence,
    };
  }

  private async extractFromPdf(buffer: Buffer): Promise<OcrExtractionResult> {
    const t0 = performance.now();
    const qualityIssues: string[] = [];
    const allPages: OcrPage[] = [];
    const allBlocks: OcrBlock[] = [];
    const allLines: OcrLine[] = [];
    const textParts: string[] = [];
    const confidences: number[] = [];
    let width: number | undefined;
    let height: number | undefined;

    try {
      const digitalText = await this.extractDigitalPdfText(buffer);
      if (digitalText.length >= MIN_DIGITAL_TEXT_LENGTH) {
        textParts.push(digitalText);
        confidences.push(95);
        this.logger.log(`[OCR] PDF digital text: ${Math.round(performance.now() - t0)}ms (${digitalText.length} chars)`);
      }

      if (this.needsOcrFallback(textParts.join('\n'))) {
        const tOcrStart = performance.now();
        const ocrPages = await this.extractAllPdfPagesWithOcr(buffer);
        this.logger.log(`[OCR] PDF OCR fallback: ${Math.round(performance.now() - tOcrStart)}ms`);
        for (const page of ocrPages.pages) {
          allPages.push(page);
          allBlocks.push(...page.blocks);
          allLines.push(...page.lines);
          if (page.text.trim()) {
            textParts.push(page.text);
            confidences.push(page.confidence);
          }
        }
        width = ocrPages.width;
        height = ocrPages.height;
        qualityIssues.push(...ocrPages.qualityIssues);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[OCR] PDF extraction failed, trying pdf-parse fallback: ${message}`);

      const fallbackText = await this.extractWithPdfParse(buffer);
      if (fallbackText) {
        textParts.push(fallbackText);
        confidences.push(70);
      } else {
        qualityIssues.push('PDF could not be parsed — file may be corrupted or encrypted');
      }
    }

    const merged = this.mergeExtractedParts(textParts);
    const text = this.normalizeText(merged);
    const confidence =
      confidences.length > 0
        ? confidences.reduce((sum, v) => sum + v, 0) / confidences.length
        : 0;

    if (text === NO_TEXT_FOUND) {
      qualityIssues.push('No readable text found — PDF may be scanned at low quality or blank');
    }

    this.logger.log(`[OCR] PDF complete: ${Math.round(performance.now() - t0)}ms — chars=${text.length}`);

    return {
      text,
      confidence,
      pages: allPages,
      blocks: allBlocks,
      lines: allLines,
      qualityIssues: [...new Set(qualityIssues)],
      imageProperties: {
        width,
        height,
        aspect: width && height ? width / height : undefined,
      },
      ocrConfidence: confidence,
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

  private async extractAllPdfPagesWithOcr(
    buffer: Buffer,
  ): Promise<{ pages: OcrPage[]; width?: number; height?: number; qualityIssues: string[] }> {
    const pdfjs = await this.loadPdfJs();
    const napiCanvas = require('@napi-rs/canvas');
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pagesToProcess = Math.min(pdfDoc.numPages, MAX_PDF_OCR_PAGES);
    const pages: OcrPage[] = [];
    const qualityIssues: string[] = [];
    let width: number | undefined;
    let height: number | undefined;

    for (let pageNumber = 1; pageNumber <= pagesToProcess; pageNumber++) {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 3.0 });
      if (pageNumber === 1) {
        width = viewport.width;
        height = viewport.height;
      }

      const canvas = napiCanvas.createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;

      const pageBuffer = canvas.toBuffer('image/png');
      const pageQuality = await this.preprocessingService.assessImageQuality(pageBuffer);
      qualityIssues.push(...pageQuality);

      const preprocessed = await this.preprocessingService.preprocessForOcr(pageBuffer);
      const ocrResult = await this.recognizeAndPostprocess(preprocessed.buffer, pageNumber, pageBuffer);
      pages.push(...ocrResult.pages);
    }

    if (pdfDoc.numPages > MAX_PDF_OCR_PAGES) {
      qualityIssues.push(
        `Only first ${MAX_PDF_OCR_PAGES} of ${pdfDoc.numPages} pages were OCR processed`,
      );
    }

    this.logger.log(`[OCR] PDF OCR completed for ${pagesToProcess} page(s)`);

    return { pages, width, height, qualityIssues: [...new Set(qualityIssues)] };
  }

  /**
   * Runs Tesseract recognition using the shared singleton worker.
   * The worker is initialized once and reused — no per-request cold-start.
   */
  private async performDetailedOcr(
    buffer: Buffer,
    pageNumber: number,
  ): Promise<{
    text: string;
    confidence: number;
    pages: OcrPage[];
    blocks: OcrBlock[];
    lines: OcrLine[];
  }> {
    try {
      const worker = await getTesseractWorker();
      const { data } = await worker.recognize(buffer);

      const blocks: OcrBlock[] = [];
      const lines: OcrLine[] = [];

      for (const block of data.blocks || []) {
        const blockEntry: OcrBlock = {
          text: block.text || '',
          confidence: block.confidence ?? 0,
          bbox: block.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
        };
        if (blockEntry.text.trim()) blocks.push(blockEntry);
      }

      for (const line of data.lines || []) {
        const lineBlocks: OcrBlock[] = [];
        for (const word of line.words || []) {
          lineBlocks.push({
            text: word.text || '',
            confidence: word.confidence ?? 0,
            bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
          });
        }
        if ((line.text || '').trim()) {
          lines.push({
            text: line.text || '',
            confidence: line.confidence ?? 0,
            blocks: lineBlocks,
          });
        }
      }

      const page: OcrPage = {
        pageNumber,
        text: data.text || '',
        confidence: data.confidence ?? 0,
        lines,
        blocks,
      };

      return {
        text: data.text || '',
        confidence: typeof data.confidence === 'number' ? data.confidence : 0,
        pages: [page],
        blocks,
        lines,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[OCR] Tesseract recognition failed: ${message}`);
      // Reset singleton so next request gets a fresh worker
      _tesseractWorkerPromise = null;
      return { text: '', confidence: 0, pages: [], blocks: [], lines: [] };
    }
  }

  private async extractWithPdfParse(buffer: Buffer): Promise<string> {
    try {
      const pdfParse = require('pdf-parse');
      const result = await pdfParse(buffer);
      return (result.text || '').trim();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[OCR] pdf-parse fallback failed: ${message}`);
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
    const uniqueParts = parts.map(part => part.trim()).filter(part => part.length > 0);

    if (uniqueParts.length === 0) return '';
    if (uniqueParts.length === 1) return uniqueParts[0];

    const merged: string[] = [];
    for (const part of uniqueParts) {
      const isDuplicate = merged.some(existing => {
        const shorter = part.length < existing.length ? part : existing;
        const longer = part.length < existing.length ? existing : part;
        return longer.includes(shorter) && shorter.length / longer.length > 0.7;
      });
      if (!isDuplicate) merged.push(part);
    }

    return merged.join('\n');
  }

  private emptyResult(qualityIssues: string[]): OcrExtractionResult {
    return {
      text: NO_TEXT_FOUND,
      confidence: 0,
      pages: [],
      blocks: [],
      lines: [],
      qualityIssues,
      imageProperties: {},
      ocrConfidence: 0,
    };
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
