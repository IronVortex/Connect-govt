import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OCRProvider, OCRResult } from './ocr.provider.interface';

@Injectable()
export class AzureOCRProvider implements OCRProvider {
  readonly name = 'Azure Vision';
  private readonly logger = new Logger(AzureOCRProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async recognize(buffer: Buffer, mimeType?: string): Promise<OCRResult> {
    const endpoint = this.configService.get<string>('AZURE_VISION_ENDPOINT');
    const key = this.configService.get<string>('AZURE_VISION_KEY');
    
    if (!endpoint || !key) {
      throw new Error('Azure Vision API credentials not configured');
    }

    const tStart = performance.now();
    try {
      const url = `${endpoint.replace(/\/$/, '')}/vision/v3.2/read/analyze`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': key,
          'Content-Type': 'application/octet-stream',
        },
        body: buffer as any,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Azure Vision API error ${response.status}: ${errText}`);
      }

      // Azure Read API is asynchronous, it returns an Operation-Location header
      const operationLocation = response.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('Azure Vision API did not return Operation-Location');
      }

      // Poll for results
      let status = 'running';
      let data: any = null;
      let attempts = 0;
      
      while ((status === 'running' || status === 'notStarted') && attempts < 15) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        
        const pollResponse = await fetch(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': key,
          },
        });
        
        if (!pollResponse.ok) {
          throw new Error('Failed to poll Azure Vision API');
        }
        
        data = await pollResponse.json();
        status = data.status;
      }
      
      if (status !== 'succeeded') {
        throw new Error(`Azure Vision API failed or timed out: ${status}`);
      }

      // Extract text from Azure result
      let extractedText = '';
      if (data.analyzeResult && data.analyzeResult.readResults) {
        for (const page of data.analyzeResult.readResults) {
          for (const line of page.lines) {
            extractedText += line.text + '\n';
          }
        }
      }
      
      const processingTimeMs = Math.round(performance.now() - tStart);
      
      this.logger.debug(`[${this.name}] Successfully extracted ${extractedText.length} chars in ${processingTimeMs}ms`);

      return {
        text: extractedText.trim(),
        confidence: extractedText ? 90 : 0, 
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
