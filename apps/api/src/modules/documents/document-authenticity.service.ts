import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface AuthenticityResult {
  isAuthentic: boolean;
  confidence: number;
  reason: string;
}

@Injectable()
export class DocumentAuthenticityService {
  private readonly logger = new Logger(DocumentAuthenticityService.name);

  async analyze(buffer: Buffer, ocrText: string, mimeType?: string): Promise<AuthenticityResult> {
    const tStart = performance.now();
    this.logger.log(`[Layer 2.5] Starting Document Authenticity Detection`);

    if (mimeType === 'application/pdf') {
      // PDFs are generally documents, we assume authentic structure unless OCR is totally empty
      return {
        isAuthentic: ocrText.length > 50,
        confidence: ocrText.length > 50 ? 90 : 30,
        reason: ocrText.length > 50 ? 'Valid PDF document with text' : 'PDF contains no extractable text',
      };
    }

    try {
      const metadata = await sharp(buffer).metadata();
      const width = metadata.width || 1;
      const height = metadata.height || 1;
      
      const area = width * height;
      const textLength = ocrText.trim().length;
      
      // Calculate text density (characters per 10,000 pixels)
      const textDensity = (textLength / area) * 10000;
      
      let confidence = 50;
      let reasons: string[] = [];
      let isAuthentic = true;

      // Rule 1: Text presence
      if (textLength < 20) {
        confidence -= 30;
        reasons.push('Very little or no text detected');
      } else if (textLength > 150) {
        confidence += 20;
        reasons.push('High text density typical of documents');
      }

      // Rule 2: Image dimensions (documents are rarely perfectly square, usually ID card or A4 aspect ratio)
      const aspect = width / height;
      const isA4 = (aspect >= 0.65 && aspect <= 0.75) || (aspect >= 1.35 && aspect <= 1.55);
      const isIDCard = (aspect >= 1.5 && aspect <= 1.8) || (aspect >= 0.55 && aspect <= 0.66);
      
      if (isA4 || isIDCard) {
        confidence += 15;
        reasons.push('Standard document aspect ratio detected');
      } else if (aspect >= 0.9 && aspect <= 1.1) {
        // Perfect squares are often profile pictures or random crops, not documents
        confidence -= 10;
        reasons.push('Square aspect ratio is unusual for documents');
      }
      
      // Rule 3: Official keywords (Govt, Republic, Department)
      const lowerText = ocrText.toLowerCase();
      const officialKeywords = ['government', 'republic', 'department', 'authority', 'ministry', 'state', 'india', 'tax', 'certificate'];
      const matchedKeywords = officialKeywords.filter(k => lowerText.includes(k));
      
      if (matchedKeywords.length > 0) {
        confidence += 20;
        reasons.push(`Official keywords found (${matchedKeywords.length})`);
      }

      // Final decision
      confidence = Math.min(100, Math.max(0, confidence));
      isAuthentic = confidence >= 40;

      const reason = reasons.length > 0 ? reasons.join('. ') : 'Standard image properties';
      
      this.logger.log(`[Layer 2.5] Authenticity: ${isAuthentic} (confidence: ${confidence}%) - ${Math.round(performance.now() - tStart)}ms`);

      return {
        isAuthentic,
        confidence,
        reason,
      };
    } catch (error: any) {
      this.logger.error(`[Layer 2.5] Analysis failed: ${error.message}`);
      // Fail open if image processing fails
      return {
        isAuthentic: true,
        confidence: 50,
        reason: 'Error analyzing authenticity, falling back to assuming authentic',
      };
    }
  }
}
