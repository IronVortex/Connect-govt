import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface PreprocessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  aspect: number;
}

@Injectable()
export class PreprocessingService {
  private readonly logger = new Logger(PreprocessingService.name);
  private readonly targetWidth = 2400;

  async preprocessForOcr(buffer: Buffer): Promise<PreprocessedImage> {
    try {
      const pipeline = sharp(buffer).rotate(); // auto-rotation from EXIF

      const metadata = await pipeline.metadata();
      let image = pipeline;

      if (metadata.width && metadata.width < this.targetWidth) {
        image = image.resize({ width: this.targetWidth, withoutEnlargement: false });
      } else if (metadata.width && metadata.width > this.targetWidth) {
        image = image.resize({ width: this.targetWidth, withoutEnlargement: true });
      }

      const processed = await image
        .grayscale()
        .median(3)
        .normalize()
        .gamma(1.15)
        .sharpen({ sigma: 1.2 })
        .modulate({ brightness: 1.05 })
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: processed.data,
        width: processed.info.width,
        height: processed.info.height,
        aspect: processed.info.width / processed.info.height,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`OCR preprocessing failed, using original: ${message}`);
      const meta = await sharp(buffer).metadata().catch(() => ({ width: 0, height: 0 }));
      return {
        buffer,
        width: meta.width || 0,
        height: meta.height || 0,
        aspect: meta.width && meta.height ? meta.width / meta.height : 1,
      };
    }
  }

  async preprocessForClassification(buffer: Buffer): Promise<PreprocessedImage> {
    try {
      const processed = await sharp(buffer)
        .rotate()
        .resize({ width: 1600, withoutEnlargement: true })
        .normalize()
        .sharpen({ sigma: 0.8 })
        .toBuffer({ resolveWithObject: true });

      return {
        buffer: processed.data,
        width: processed.info.width,
        height: processed.info.height,
        aspect: processed.info.width / processed.info.height,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Classification preprocessing failed: ${message}`);
      const meta = await sharp(buffer).metadata().catch(() => ({ width: 0, height: 0 }));
      return {
        buffer,
        width: meta.width || 0,
        height: meta.height || 0,
        aspect: meta.width && meta.height ? meta.width / meta.height : 1,
      };
    }
  }

  async toClassificationImage(buffer: Buffer, mimeType?: string): Promise<PreprocessedImage> {
    if (mimeType === 'application/pdf') {
      const pageImage = await this.renderPdfFirstPage(buffer);
      if (pageImage) {
        return this.preprocessForClassification(pageImage);
      }
    }
    return this.preprocessForClassification(buffer);
  }

  async assessImageQuality(buffer: Buffer): Promise<string[]> {
    const issues: string[] = [];
    try {
      const { data, info } = await sharp(buffer)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const pixelCount = info.width * info.height;
      if (pixelCount < 150_000) {
        issues.push('Low resolution — image is too small for reliable text extraction');
      }

      let sum = 0;
      let darkPixels = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i];
        if (data[i] < 30) darkPixels++;
      }
      const mean = sum / data.length;
      const darkRatio = darkPixels / data.length;

      if (mean > 220) {
        issues.push('Excessive glare or overexposure detected');
      }
      if (mean < 40 || darkRatio > 0.85) {
        issues.push('Image is too dark — increase lighting');
      }

      const stats = await sharp(buffer).stats();
      const channelStd = stats.channels[0]?.stdev ?? 0;
      if (channelStd < 18) {
        issues.push('Blurry or low-contrast image — text may be unreadable');
      }
    } catch {
      issues.push('Unable to assess image quality');
    }
    return issues;
  }

  private async renderPdfFirstPage(buffer: Buffer): Promise<Buffer | null> {
    try {
      const pdfjs = await this.loadPdfJs();
      const napiCanvas = require('@napi-rs/canvas');
      const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
      const page = await pdfDoc.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = napiCanvas.createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toBuffer('image/png');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`PDF page render for classification failed: ${message}`);
      return null;
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
    const { pathToFileURL } = require('url');
    const path = require('path');
    const workerPath = path.resolve('node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).toString();
    return pdfjs;
  }
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
}

interface PdfPage {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (context: {
    canvasContext: unknown;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}
