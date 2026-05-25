import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export type DetectionStatus = 'DETECTED' | 'MISMATCH' | 'UNKNOWN';

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);
  private readonly keywordMap: Record<string, string> = {
    aadhaar: 'Aadhaar',
    aadhar: 'Aadhaar',
    pan: 'PAN',
    insurance: 'Insurance',
    invoice: 'Invoice',
  };
  private readonly openAiKey: string | undefined;
  private readonly openAiModel: string;

  constructor(private configService: ConfigService) {
    this.openAiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.openAiModel = this.configService.get<string>('OPENAI_MODEL') || 'gpt-3.5-turbo';
  }

  async detect(
    filename: string,
    mimeType?: string,
    content?: string,
    expectedType?: string,
  ): Promise<{ documentType: string; status: DetectionStatus }> {
    const lowerName = filename.toLowerCase();
    let detected = this.getFromKeywords(lowerName);

    if (!detected && content) {
      detected = this.getFromKeywords(content.toLowerCase());
    }

    if (!detected && this.openAiKey) {
      detected = await this.runAiFallback(filename, mimeType, content, expectedType);
    }

    if (!detected && mimeType) {
      if (mimeType === 'application/pdf') detected = 'PDF';
      else if (mimeType.startsWith('image/')) detected = 'Image';
    }

    const documentType = detected || 'Unknown';
    const status = this.computeStatus(documentType, expectedType);
    return { documentType, status };
  }

  private async runAiFallback(
    filename: string,
    mimeType?: string,
    content?: string,
    expectedType?: string,
  ): Promise<string | null> {
    try {
      const prompt = [
        {
          role: 'system',
          content:
            'You are a secure document classifier. Return the most likely document type using only one of the following values: Aadhaar, PAN, Insurance, Invoice, PDF, Image, Unknown.',
        },
        {
          role: 'user',
          content: `Filename: ${filename}\nMIME type: ${mimeType || 'unknown'}\nExpected document type: ${expectedType || 'unknown'}\nText content: ${content ? content.slice(0, 1000) : 'none'}`,
        },
      ];

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.openAiModel,
          messages: prompt,
          max_tokens: 32,
          temperature: 0,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openAiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      const aiContent = response.data?.choices?.[0]?.message?.content;
      if (typeof aiContent === 'string') {
        const normalized = aiContent.trim().split(/[\n,:;.]+/)[0].trim();
        return normalized || null;
      }
    } catch (error) {
      this.logger.warn('AI fallback detection failed. Using keyword fallback.', error as Error);
    }

    return null;
  }

  private getFromKeywords(text: string): string | null {
    for (const [key, type] of Object.entries(this.keywordMap)) {
      if (text.includes(key)) return type;
    }
    return null;
  }

  private computeStatus(detected: string, expected?: string): DetectionStatus {
    if (detected === 'Unknown') return 'UNKNOWN';
    if (!expected) return 'DETECTED';
    return detected.toLowerCase() === expected.toLowerCase() ? 'DETECTED' : 'MISMATCH';
  }
}
