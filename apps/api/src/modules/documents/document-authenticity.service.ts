import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface AuthenticityResult {
  isAuthentic: boolean;
  score: number;
  rating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  reason: string;
}

@Injectable()
export class DocumentAuthenticityService {
  private readonly logger = new Logger(DocumentAuthenticityService.name);

  async analyze(buffer: Buffer, ocrText: string, mimeType?: string, expectedType?: string): Promise<AuthenticityResult> {
    const tStart = performance.now();
    this.logger.log(`[Layer 2.5] Starting Document Authenticity Detection`);

    if (mimeType === 'application/pdf') {
      const isAuthentic = ocrText.trim().length > 10;
      return {
        isAuthentic,
        score: isAuthentic ? 95 : 20,
        rating: isAuthentic ? 'Excellent' : 'Poor',
        reason: isAuthentic ? 'Valid PDF document containing text' : 'PDF contains no readable text',
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
      
      let score = 50;
      let reasons: string[] = [];

      // 1. Text presence and density checks
      if (textLength === 0) {
        score -= 40;
        reasons.push('No readable text found');
      } else if (textLength < 20) {
        score -= 20;
        reasons.push('Very low text density');
      } else if (textDensity > 100) {
        score += 20;
        reasons.push('High text density');
      } else {
        score += 10;
        reasons.push('Moderate text density');
      }

      // 2. Aspect Ratio / Dimensions
      const aspect = width / height;
      const isA4 = (aspect >= 0.65 && aspect <= 0.75) || (aspect >= 1.35 && aspect <= 1.55);
      const isIDCard = (aspect >= 1.5 && aspect <= 1.8) || (aspect >= 0.55 && aspect <= 0.66);
      
      if (isA4 || isIDCard) {
        score += 15;
        reasons.push('Standard document aspect ratio');
      } else if (aspect >= 0.9 && aspect <= 1.1) {
        // Perfect squares are less common for documents
        score -= 10;
        reasons.push('Square aspect ratio (atypical for documents)');
      }

      // 3. Official Keywords
      const lowerText = ocrText.toLowerCase();
      const officialKeywords = ['government', 'republic', 'department', 'authority', 'ministry', 'state', 'india', 'tax', 'certificate', 'card'];
      const matchedKeywords = officialKeywords.filter(k => lowerText.includes(k));
      if (matchedKeywords.length > 0) {
        score += 15;
        reasons.push(`Official keywords matched`);
      }

      // 4. Blank Image check using stats
      const stats = await sharp(buffer).stats();
      const stdev = stats.channels.length > 0 ? stats.channels[0].stdev : 0;
      if (stdev < 5) {
        score = 0;
        reasons = ['Unusable blank or solid color image'];
      }

      // Allow selfies/portraits if expected type is passport size photo
      if (expectedType === 'PASSPORT_PHOTO' && textLength < 10) {
        score = Math.max(score, 75); // override low text penalty for photos
        reasons.push('Valid visual characteristics for passport photo');
      }

      score = Math.min(100, Math.max(0, score));
      
      let rating: 'Excellent' | 'Good' | 'Fair' | 'Poor' = 'Fair';
      if (score >= 85) rating = 'Excellent';
      else if (score >= 65) rating = 'Good';
      else if (score >= 35) rating = 'Fair';
      else rating = 'Poor';

      // Only reject completely unusable uploads
      const isAuthentic = score >= 15;

      this.logger.log(`[Layer 2.5] Authenticity Score: ${score} (${rating}) - isAuthentic: ${isAuthentic}`);

      return {
        isAuthentic,
        score,
        rating,
        reason: reasons.join(', '),
      };
    } catch (error: any) {
      this.logger.error(`[Layer 2.5] Analysis failed: ${error.message}`);
      return {
        isAuthentic: true,
        score: 50,
        rating: 'Fair',
        reason: 'Unable to analyze image authenticity, processing anyway',
      };
    }
  }
}
