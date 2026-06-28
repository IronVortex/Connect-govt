import { Injectable, Logger } from '@nestjs/common';
import { OCRProvider, OCRResult } from './ocr.provider.interface';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';

@Injectable()
export class TesseractOCRProvider implements OCRProvider {
  readonly name = 'Tesseract';
  private readonly logger = new Logger(TesseractOCRProvider.name);

  async recognize(buffer: Buffer, mimeType?: string): Promise<OCRResult> {
    const tStart = performance.now();
    try {
      // Basic preprocessing to improve Tesseract accuracy
      const imageBuffer = await sharp(buffer)
        .grayscale()
        .normalize()
        .sharpen()
        .toBuffer();

      const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`[Tesseract] progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      const processingTimeMs = Math.round(performance.now() - tStart);
      
      this.logger.debug(`[${this.name}] Successfully extracted ${data.text?.length || 0} chars in ${processingTimeMs}ms (confidence: ${data.confidence})`);

      return {
        text: data.text ? data.text.trim() : '',
        confidence: data.confidence, 
        provider: this.name,
        processingTimeMs,
        qualityIssues: [],
      };
    } catch (error: any) {
      this.logger.error(`[${this.name}] Recognition failed: ${error.message}`);
      throw error;
    }
  }
}
