import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VerificationStatus, KycDocumentType } from './types/document-intelligence.types';

export interface ConfidenceScores {
  imageQuality: number;   // 0-100
  ocr: number;            // 0-100
  classification: number; // 0-100
  validation: number;     // 0-100
  authenticity: number;   // 0-100
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
    this.logger.log(`[Layer 7] Calculating Confidence for ${documentType}`);

    // Weights: Image Quality 20%, OCR 25%, Classification 30%, Validation 15%, Authenticity 10%
    const weightImage = 0.20;
    const weightOcr = 0.25;
    const weightClassification = 0.30;
    const weightValidation = 0.15;
    const weightAuthenticity = 0.10;

    const overallConfidence = Math.round(
      (scores.imageQuality * weightImage) +
      (scores.ocr * weightOcr) +
      (scores.classification * weightClassification) +
      (scores.validation * weightValidation) +
      (scores.authenticity * weightAuthenticity)
    );

    this.logger.log(
      `[Layer 7] Confidence: ${overallConfidence}% ` +
      `(img=${scores.imageQuality} ocr=${scores.ocr} class=${scores.classification} val=${scores.validation} auth=${scores.authenticity})`
    );

    let status: VerificationStatus;

    if (documentType === 'UNKNOWN') {
      status = 'UNKNOWN';
    } else if (expectedType && expectedType !== 'UNKNOWN' && documentType !== expectedType) {
      status = 'REVIEW_REQUIRED';
    } else if (scores.imageQuality < 30) {
      status = 'REVIEW_REQUIRED';
    } else if (overallConfidence >= 75) {
      status = 'VERIFIED';
    } else if (overallConfidence >= 45) {
      status = 'REVIEW_REQUIRED';
    } else {
      status = 'UNKNOWN';
    }

    return {
      overallConfidence,
      breakdown: scores,
      status,
    };
  }
}
