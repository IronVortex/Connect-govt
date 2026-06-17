import { Injectable } from '@nestjs/common';
import {
  CONFIDENCE_THRESHOLDS,
  DocumentVerificationResult,
  ExtractedDocumentData,
  KycDocumentType,
  NO_TEXT_FOUND,
  normalizeDocumentType,
  OcrExtractionResult,
  typesMatchExpected,
  ValidationResult,
  VerificationStatus,
  VisionClassificationResult,
  DOCUMENT_TYPE_LABELS,
} from './types/document-intelligence.types';

@Injectable()
export class VerificationService {
  resolve(
    classification: VisionClassificationResult,
    ocr: OcrExtractionResult,
    validation: ValidationResult,
    extractedData: ExtractedDocumentData,
    expectedType?: string,
  ): DocumentVerificationResult {
    const normalizedExpected = normalizeDocumentType(expectedType);
    const documentType = classification.documentType;
    const documentTypeLabel = DOCUMENT_TYPE_LABELS[documentType];
    const matchesExpectedType =
      classification.matchesExpectedType || typesMatchExpected(documentType, normalizedExpected);

    const status = this.resolveStatus(
      classification,
      ocr,
      validation,
      matchesExpectedType,
      normalizedExpected,
    );

    const reasons = this.buildReasons(classification, ocr, validation, status, matchesExpectedType);
    const verified = status === 'VERIFIED';

    const extractedFields = this.flattenExtractedData(extractedData);

    return {
      documentType,
      documentTypeLabel,
      confidence: classification.confidence,
      category: classification.category,
      matchesExpectedType,
      reasoning: classification.reasoning,
      detectedFeatures: classification.detectedFeatures,
      extractedData,
      extractedFields,
      validation,
      ocr: {
        text: ocr.text === NO_TEXT_FOUND ? '' : ocr.text,
        confidence: ocr.confidence,
        qualityIssues: ocr.qualityIssues,
        pageCount: ocr.pages.length,
      },
      status,
      verified,
      reasons,
    };
  }

  private resolveStatus(
    classification: VisionClassificationResult,
    ocr: OcrExtractionResult,
    validation: ValidationResult,
    matchesExpectedType: boolean,
    expectedType?: KycDocumentType,
  ): VerificationStatus {
    const { confidence, documentType } = classification;

    // ── Hard guard: UNKNOWN type can never be VERIFIED ──────────────────────
    // Prevents contradictory states like:
    //   Document Type: Unknown | Confidence: 92% | Status: Verified
    if (documentType === 'UNKNOWN' || confidence < CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      return 'UNKNOWN';
    }

    // Strict expected type mismatch rejection
    if (expectedType && !matchesExpectedType) {
      return 'REJECTED';
    }

    const hasReadableText = ocr.text && ocr.text !== NO_TEXT_FOUND && ocr.text.trim().length > 20;
    const isPhotoType = documentType === 'PASSPORT_PHOTO';
    const ocrAcceptable = isPhotoType || hasReadableText;

    // OCR quality issues handling
    if (!ocrAcceptable && ocr.qualityIssues.length > 0) {
      // Strong confidence photo types → VERIFIED even without readable text
      if (confidence >= CONFIDENCE_THRESHOLDS.STRONG_MATCH && isPhotoType) {
        return 'VERIFIED';
      }
      return confidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED ? 'REVIEW_REQUIRED' : 'UNKNOWN';
    }

    // High confidence scenarios
    if (confidence >= CONFIDENCE_THRESHOLDS.STRONG_MATCH) {
      // Photo-type documents don't require text validation to pass
      if (isPhotoType) {
        return 'VERIFIED';
      }
      if (validation.valid) {
        return 'VERIFIED';
      }
      // Validation failed despite strong confidence → REJECTED
      return 'REJECTED';
    }

    // Medium confidence scenarios
    if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      if (!validation.valid) {
        return expectedType && !matchesExpectedType ? 'REJECTED' : 'REVIEW_REQUIRED';
      }
      return 'REVIEW_REQUIRED';
    }

    // Default fallback
    return 'UNKNOWN';
  }

  private buildReasons(
    classification: VisionClassificationResult,
    ocr: OcrExtractionResult,
    validation: ValidationResult,
    status: VerificationStatus,
    matchesExpectedType: boolean,
  ): string[] {
    const reasons: string[] = [];

    if (classification.detectedFeatures.length > 0) {
      reasons.push(
        `Visual features: ${classification.detectedFeatures.slice(0, 4).join(', ').replace(/_/g, ' ')}`,
      );
    }

    if (validation.valid) {
      reasons.push('Validation checks passed');
    } else if (validation.issues.length > 0) {
      reasons.push(...validation.issues.slice(0, 3));
    }

    if (ocr.qualityIssues.length > 0) {
      reasons.push(...ocr.qualityIssues.slice(0, 2));
    }

    if (!matchesExpectedType && classification.documentType !== 'UNKNOWN') {
      reasons.push('Uploaded document does not match the expected document slot');
    }

    if (status === 'VERIFIED') {
      reasons.unshift(`${classification.documentType} verified successfully`);
    } else if (status === 'UNKNOWN') {
      reasons.unshift(classification.reasoning || 'Unable to classify document reliably');
    }

    return [...new Set(reasons)].slice(0, 6);
  }

  private flattenExtractedData(data: ExtractedDocumentData): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== '') {
        result[key] = value;
      }
    }
    return result;
  }
}
