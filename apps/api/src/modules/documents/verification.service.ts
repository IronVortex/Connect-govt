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
    
    // Strict match: must equal expected type. If expected type not provided, we treat it as matching.
    const matchesExpectedType = normalizedExpected ? (documentType === normalizedExpected) : true;

    const ocrSucceeded = ocr.text && ocr.text !== NO_TEXT_FOUND && ocr.text.trim().length > 10;
    const typeDetected = documentType !== 'UNKNOWN';
    const validationPasses = validation.valid === true;
    const requiredFieldsExtracted = validation.hasAllRequiredFields === true;

    let status: VerificationStatus = 'UNKNOWN';
    let confidence = classification.confidence;

    // VERIFIED only when all conditions are met
    if (ocrSucceeded && typeDetected && matchesExpectedType && requiredFieldsExtracted && validationPasses) {
      status = 'VERIFIED';
      confidence = 100;
    } else {
      if (documentType === 'UNKNOWN') {
        status = 'UNKNOWN';
        confidence = Math.round(Math.min(59, Math.max(30, validation.score || classification.confidence))); // Weak evidence
      } else if (normalizedExpected && documentType !== normalizedExpected) {
        status = 'REJECTED';
        confidence = 0;
      } else {
        status = 'REJECTED';
        // Assign confidence based on validation score
        const baseScore = validation.score || classification.confidence;
        if (baseScore >= 86) {
          confidence = Math.round(Math.min(99, baseScore)); // Strong evidence but not verified
        } else if (baseScore >= 61) {
          confidence = Math.round(Math.min(85, baseScore)); // Moderate evidence
        } else {
          confidence = Math.round(Math.min(60, Math.max(30, baseScore))); // Weak evidence
        }
      }
    }

    const reasons = this.buildReasons(classification, ocr, validation, status, matchesExpectedType);
    const verified = status === 'VERIFIED';
    const extractedFields = this.flattenExtractedData(extractedData);

    return {
      documentType,
      documentTypeLabel,
      confidence,
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
    } else if (status === 'REJECTED') {
      reasons.unshift(`${classification.documentType} verification rejected`);
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
