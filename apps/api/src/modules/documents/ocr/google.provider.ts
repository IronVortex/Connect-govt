import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OCRProvider, OCRResult } from './ocr.provider.interface';

@Injectable()
export class GoogleOCRProvider implements OCRProvider {
  readonly name = 'Google Vision';
  private readonly logger = new Logger(GoogleOCRProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async recognize(buffer: Buffer, mimeType?: string): Promise<OCRResult> {
    const apiKey = this.configService.get<string>('GOOGLE_VISION_API_KEY');
    if (!apiKey) {
      throw new Error('Google Vision API Key not configured');
    }

    const tStart = performance.now();
    try {
      const base64Image = buffer.toString('base64');
      
      const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
            },
          ],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Vision API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const textAnnotations = data.responses?.[0]?.textAnnotations;
      
      const text = textAnnotations && textAnnotations.length > 0 
        ? textAnnotations[0].description 
        : '';
        
      const processingTimeMs = Math.round(performance.now() - tStart);
      
      this.logger.debug(`[${this.name}] Successfully extracted ${text.length} chars in ${processingTimeMs}ms`);
      
      return {
        text: text.trim(),
        confidence: text ? 95 : 0, // Google Vision is generally high confidence if text is found
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
