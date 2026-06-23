import { Injectable } from '@nestjs/common';
import {
  DocumentVerificationResult,
  ExtractedDocumentData,
  NO_TEXT_FOUND,
  normalizeDocumentType,
  OcrExtractionResult,
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
    
    const matchesExpectedType = normalizedExpected ? (documentType === normalizedExpected) : true;
    const ocrTextLength = ocr.text && ocr.text !== NO_TEXT_FOUND ? ocr.text.trim().length : 0;
    const validationPasses = validation.valid === true;

    let status: VerificationStatus = 'REJECTED';
    let confidence = classification.confidence;

    if (normalizedExpected) {
      if (documentType === normalizedExpected && validationPasses && ocrTextLength > 20) {
        status = 'VERIFIED';
        confidence = 100;
      } else {
        status = 'REJECTED';
        confidence = documentType === normalizedExpected ? Math.min(classification.confidence, 99) : 0;
      }
    } else if (documentType !== 'UNKNOWN' && validationPasses && ocrTextLength > 20 && classification.confidence >= 70) {
      status = 'VERIFIED';
      confidence = Math.max(classification.confidence, validation.score);
    } else {
      status = 'REJECTED';
      confidence = Math.round(Math.max(classification.confidence, validation.score));
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
      reasons: normalizedExpected && documentType !== normalizedExpected
        ? ['Uploaded document type does not match required document type']
        : reasons,
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
    const ocrTextEmpty = !ocr.text || ocr.text === NO_TEXT_FOUND || !ocr.text.trim();

    if (ocrTextEmpty && classification.confidence < 30) {
      return ['Document not detected. Please upload a clear image.'];
    }

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

    if (!matchesExpectedType) {
      reasons.push('Uploaded document type does not match required document type');
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
