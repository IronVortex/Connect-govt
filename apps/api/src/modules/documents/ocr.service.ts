import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OCRProvider, OCRResult } from './ocr/ocr.provider.interface';
import { GoogleOCRProvider } from './ocr/google.provider';
import { AzureOCRProvider } from './ocr/azure.provider';
import { TesseractOCRProvider } from './ocr/tesseract.provider';

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);
  private providers: OCRProvider[] = [];

  constructor(
    private configService: ConfigService,
    private googleProvider: GoogleOCRProvider,
    private azureProvider: AzureOCRProvider,
    private tesseractProvider: TesseractOCRProvider,
  ) {
    this.buildProviderChain();
  }

  private buildProviderChain() {
    const configuredProvider = this.configService.get<string>('OCR_PROVIDER', 'google').toLowerCase();
    
    // Add primary provider
    if (configuredProvider === 'google') {
      this.providers.push(this.googleProvider);
      this.providers.push(this.azureProvider);
    } else if (configuredProvider === 'azure') {
      this.providers.push(this.azureProvider);
      this.providers.push(this.googleProvider);
    } else {
      this.logger.warn(`Unknown OCR_PROVIDER '${configuredProvider}', defaulting to google`);
      this.providers.push(this.googleProvider);
      this.providers.push(this.azureProvider);
    }

    // Always add Tesseract as the final fallback
    const enableLocalFallback = this.configService.get<string>('ENABLE_LOCAL_FALLBACK', 'true') === 'true';
    if (enableLocalFallback) {
      this.providers.push(this.tesseractProvider);
    }
  }

  async extractText(buffer: Buffer, mimeType?: string): Promise<OCRResult> {
    this.logger.log(`[Layer 2] Starting OCR Engine Pipeline`);
    
    let lastError: Error | null = null;
    let fallbackUsed = false;

    for (const provider of this.providers) {
      try {
        if (fallbackUsed) {
          this.logger.warn(`[Layer 2] Falling back to provider: ${provider.name}`);
        }
        
        const result = await provider.recognize(buffer, mimeType);
        
        // If confidence is too low, we might still want to try the next provider
        if (result.confidence < 40 && provider.name !== 'Tesseract') {
          this.logger.warn(`[Layer 2] ${provider.name} returned low confidence (${result.confidence}%), trying next provider`);
          fallbackUsed = true;
          continue;
        }

        return result;
      } catch (error: any) {
        this.logger.warn(`[Layer 2] Provider ${provider.name} failed: ${error.message}`);
        lastError = error;
        fallbackUsed = true;
      }
    }

    // If all providers failed
    if (lastError) {
      this.logger.error(`[Layer 2] All OCR providers failed. Last error: ${lastError.message}`);
    }
    
    return {
      text: '',
      confidence: 0,
      provider: 'None',
      processingTimeMs: 0,
      qualityIssues: ['All OCR providers failed or returned low confidence'],
    };
  }
}
