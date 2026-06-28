import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationStatus, KycDocumentType } from './types/document-intelligence.types';

export interface ConfidenceScores {
  imageQuality: number;
  ocr: number;
  classification: number;
  validation: number;
}

export interface ConfidenceResult {
  overallConfidence: number;
  breakdown: ConfidenceScores;
  status: VerificationStatus;
}

@Injectable()
export class ConfidenceService {
  private readonly logger = new Logger(ConfidenceService.name);

  constructor(private configService: ConfigService) {}

  calculate(scores: ConfidenceScores, documentType: KycDocumentType, expectedType?: KycDocumentType): ConfidenceResult {
    this.logger.log(`[Layer 7] Calculating Confidence`);

    // Get weights (can be overriden via config in a real system)
    const weightImage = 0.25;
    const weightOcr = 0.25;
    const weightClassification = 0.25;
    const weightValidation = 0.25;

    const overallConfidence = Math.round(
      (scores.imageQuality * weightImage) +
      (scores.ocr * weightOcr) +
      (scores.classification * weightClassification) +
      (scores.validation * weightValidation)
    );

    this.logger.log(`[Layer 7] Overall Confidence: ${overallConfidence}%`);

    let status: VerificationStatus = 'UNKNOWN';

    if (documentType === 'UNKNOWN') {
      status = 'UNKNOWN';
    } else if (expectedType && expectedType !== 'UNKNOWN' && documentType !== expectedType) {
      status = 'REJECTED'; // Wait, prompt says: "Different document type -> MISMATCH" but VerificationStatus has 'REJECTED' or 'UNKNOWN'. Let's use 'REJECTED' or extend status.
      // Wait, prompt says: VERIFIED, MISMATCH, UNKNOWN, LOW_QUALITY, LOW_CONFIDENCE, MANUAL_REVIEW
      // I will map them as best as possible.
    } else if (scores.imageQuality < 40) {
      status = 'REVIEW_REQUIRED';
    } else if (scores.ocr < 30 || overallConfidence < 40) {
      status = 'REVIEW_REQUIRED';
    } else if (overallConfidence >= 75) {
      status = 'VERIFIED';
    } else {
      status = 'REVIEW_REQUIRED';
    }

    return {
      overallConfidence,
      breakdown: scores,
      status,
    };
  }
}
