import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentVerificationResult,
  DocumentVerificationService,
} from './document-verification.service';

export type DetectionStatus = 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'NEEDS_REVIEW' | 'DETECTED';

export interface DetectionResult {
  documentType: string;
  status: DetectionStatus;
  confidence: number;
  reasons: string[];
  verified: boolean;
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  verification: DocumentVerificationResult;
}

@Injectable()
export class DetectionService {
  private readonly logger = new Logger(DetectionService.name);

  constructor(private readonly verificationService: DocumentVerificationService) {}

  async detect(
    filename: string,
    mimeType?: string,
    content?: string,
    expectedType?: string,
    imageProperties?: { width?: number; height?: number; aspect?: number },
  ): Promise<DetectionResult> {
    this.logger.log(
      `Verification request - filename: "${filename}", mimeType: "${mimeType || 'none'}", expectedType: "${expectedType || 'none'}"`,
    );
    if (content) {
      this.logger.debug(`Extracted text preview: "${content.slice(0, 300)}..."`);
    }

    const verification = this.verificationService.verify(
      filename,
      content,
      expectedType,
      mimeType,
      imageProperties,
    );
    const status = this.toDetectionStatus(verification, expectedType);
    const reasons = this.toReasons(verification);

    this.logger.log(
      `Final Verification -> Type: "${verification.documentType}", Status: "${status}". Confidence: ${verification.confidence}%, Reason: ${reasons.join(', ')}`,
    );

    return {
      documentType: verification.documentType,
      status,
      confidence: verification.confidence,
      reasons,
      verified: verification.verified,
      extractedFields: verification.extractedFields,
      missingFields: verification.missingFields,
      verification,
    };
  }

  private toDetectionStatus(
    verification: DocumentVerificationResult,
    expectedType?: string,
  ): DetectionStatus {
    if (verification.verified) {
      return expectedType ? 'MATCHED' : 'DETECTED';
    }

    if (verification.reason === 'Uploaded document does not match selected document type') {
      return 'MISMATCHED';
    }

    if (expectedType) {
      return verification.confidence >= 35 ? 'NEEDS_REVIEW' : 'UNKNOWN';
    }

    return verification.confidence >= 35 ? 'NEEDS_REVIEW' : 'UNKNOWN';
  }

  private toReasons(verification: DocumentVerificationResult): string[] {
    if (verification.verified) {
      return [`${verification.documentType} verified with all required fields present`];
    }

    const reasons: string[] = [];
    if (verification.reason) {
      reasons.push(verification.reason);
    }
    if (verification.missingFields.length > 0) {
      reasons.push(`Missing fields: ${verification.missingFields.join(', ')}`);
    }
    return reasons.length > 0 ? reasons : ['Document verification failed'];
  }
}
