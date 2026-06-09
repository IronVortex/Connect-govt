import { Injectable } from '@nestjs/common';
import {
  CONFIDENCE_THRESHOLDS,
  ExtractedDocumentData,
  KycDocumentType,
  LABEL_TO_KYC_TYPE,
  NO_TEXT_FOUND,
  ValidationResult,
} from './types/document-intelligence.types';

const STRICT_IDENTITY_TYPES = new Set<KycDocumentType>([
  'AADHAAR',
  'PAN',
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
]);

@Injectable()
export class ValidationService {
  validate(
    documentType: KycDocumentType,
    text: string,
    detectionConfidence: number,
    expectedType?: string,
  ): ValidationResult {
    if (text === NO_TEXT_FOUND || !text.trim()) {
      return {
        isValid: false,
        confidence: Math.min(detectionConfidence, 0.35),
        missingFields: ['extracted text'],
        reasons: ['No readable text found in document'],
      };
    }

    if (documentType === 'UNKNOWN') {
      return {
        isValid: false,
        confidence: Math.min(detectionConfidence, 0.4),
        missingFields: ['document type'],
        reasons: ['Unable to classify document type with sufficient confidence'],
      };
    }

    const extractedData = this.parseFields(documentType, text);
    const normalizedExpected = this.normalizeType(expectedType);

    if (normalizedExpected && normalizedExpected !== documentType) {
      return {
        isValid: false,
        confidence: detectionConfidence,
        missingFields: [],
        reasons: ['Uploaded document does not match selected document type'],
      };
    }

    if (STRICT_IDENTITY_TYPES.has(documentType)) {
      return this.validateIdentityDocument(documentType, extractedData, detectionConfidence);
    }

    return this.validateGeneralDocument(documentType, extractedData, detectionConfidence);
  }

  parseFields(documentType: KycDocumentType, text: string): ExtractedDocumentData {
    switch (documentType) {
      case 'AADHAAR':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.normalizeAadhaar(this.firstMatch(text, /\b(\d{4}\s?\d{4}\s?\d{4})\b/)),
        };
      case 'PAN':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.firstMatch(text, /\b([A-Z]{5}[0-9]{4}[A-Z])\b/i)?.toUpperCase(),
        };
      case 'PASSPORT':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.firstMatch(text, /\b([A-Z][0-9]{7})\b/i)?.toUpperCase(),
        };
      case 'DRIVING_LICENSE':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber:
            this.extractLabeledValue(text, [
              'dl no',
              'license number',
              'licence number',
              'driving license no',
              'driving licence no',
            ]) || this.firstMatch(text, /\b([A-Z]{2}[0-9]{2}\s?[0-9]{11,13})\b/i),
        };
      case 'VOTER_ID':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.firstMatch(text, /\b([A-Z]{3}[0-9]{7})\b/i)?.toUpperCase(),
        };
      case 'BIRTH_CERTIFICATE':
      case 'DEATH_CERTIFICATE':
      case 'MARRIAGE_CERTIFICATE':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.extractLabeledValue(text, [
            'registration number',
            'certificate number',
            'reg no',
          ]),
        };
      case 'RC_BOOK':
        return {
          name: this.extractName(text),
          idNumber:
            this.extractLabeledValue(text, ['registration number', 'reg no', 'registration no']) ||
            this.firstMatch(text, /\b([A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4})\b/i),
        };
      case 'BANK_PASSBOOK':
      case 'BANK_STATEMENT':
        return {
          name:
            this.extractLabeledValue(text, ['account holder', 'customer name', 'name']) ||
            this.extractName(text),
          idNumber: this.extractLabeledValue(text, ['account number', 'account no', 'a/c no']),
        };
      case 'INSURANCE_CERTIFICATE':
      case 'VEHICLE_INSURANCE':
        return {
          name: this.extractLabeledValue(text, ['insured name', 'policy holder', 'name']),
          idNumber: this.extractLabeledValue(text, ['policy number', 'policy no']),
        };
      case 'INVOICE':
        return {
          idNumber: this.extractLabeledValue(text, ['invoice number', 'invoice no', 'bill number']),
          dob: this.extractDob(text),
        };
      default:
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.extractLabeledValue(text, [
            'number',
            'certificate number',
            'registration number',
            'consumer number',
            'id no',
          ]),
        };
    }
  }

  private validateIdentityDocument(
    documentType: KycDocumentType,
    extractedData: ExtractedDocumentData,
    detectionConfidence: number,
  ): ValidationResult {
    const missingFields = this.findMissingFields(documentType, extractedData);
    const formatIssues = this.validateFormats(documentType, extractedData);
    const fieldScore = this.fieldCompletenessScore(documentType, extractedData);
    const formatScore = formatIssues.length === 0 ? 1 : 0.35;

    const confidence = Number(
      Math.min(1, detectionConfidence * 0.55 + fieldScore * 0.3 + formatScore * 0.15).toFixed(2),
    );

    const reasons: string[] = [];
    if (missingFields.length > 0) {
      reasons.push(`Missing fields: ${missingFields.join(', ')}`);
    }
    if (formatIssues.length > 0) {
      reasons.push(...formatIssues);
    }
    if (missingFields.length === 0 && formatIssues.length === 0) {
      reasons.push(`${documentType} verified with required fields present`);
    }

    return {
      isValid:
        missingFields.length === 0 &&
        formatIssues.length === 0 &&
        confidence >= CONFIDENCE_THRESHOLDS.MATCHED,
      confidence,
      missingFields,
      reasons,
    };
  }

  private validateGeneralDocument(
    documentType: KycDocumentType,
    extractedData: ExtractedDocumentData,
    detectionConfidence: number,
  ): ValidationResult {
    const hasAnyField = Boolean(
      extractedData.name || extractedData.dob || extractedData.idNumber,
    );
    const confidence = Number(
      Math.min(1, detectionConfidence * (hasAnyField ? 0.95 : 0.85)).toFixed(2),
    );

    const isValid = confidence >= CONFIDENCE_THRESHOLDS.MATCHED;

    return {
      isValid,
      confidence,
      missingFields: isValid ? [] : ['document indicators'],
      reasons: isValid
        ? [`${documentType} identified with sufficient confidence`]
        : [`${documentType} detected but requires manual review`],
    };
  }

  private validateFormats(documentType: KycDocumentType, data: ExtractedDocumentData): string[] {
    const issues: string[] = [];

    if (documentType === 'PAN' && data.idNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(data.idNumber)) {
      issues.push('PAN number format is invalid');
    }

    if (documentType === 'AADHAAR' && data.idNumber) {
      const digits = data.idNumber.replace(/\s/g, '');
      if (!/^\d{12}$/.test(digits)) {
        issues.push('Aadhaar number must be 12 digits');
      }
    }

    if (documentType === 'PASSPORT' && data.idNumber && !/^[A-Z][0-9]{7}$/.test(data.idNumber)) {
      issues.push('Passport number format is invalid');
    }

    if (documentType === 'VOTER_ID' && data.idNumber && !/^[A-Z]{3}[0-9]{7}$/.test(data.idNumber)) {
      issues.push('EPIC number format is invalid');
    }

    if (data.dob && !this.isValidDate(data.dob)) {
      issues.push('Date of birth format is invalid');
    }

    return issues;
  }

  private findMissingFields(documentType: KycDocumentType, data: ExtractedDocumentData): string[] {
    const required: Array<keyof ExtractedDocumentData> = ['name', 'idNumber'];
    if (
      documentType === 'AADHAAR' ||
      documentType === 'PASSPORT' ||
      documentType === 'DRIVING_LICENSE' ||
      documentType === 'VOTER_ID'
    ) {
      required.push('dob');
    }

    return required.filter(field => !this.hasValue(data[field])).map(field => String(field));
  }

  private fieldCompletenessScore(documentType: KycDocumentType, data: ExtractedDocumentData): number {
    const missing = this.findMissingFields(documentType, data);
    const totalRequired = documentType === 'PAN' ? 2 : documentType === 'VOTER_ID' ? 3 : 3;
    return (totalRequired - missing.length) / totalRequired;
  }

  private extractName(text: string): string | undefined {
    const labeled = this.extractLabeledValue(text, [
      'name',
      'candidate name',
      'person name',
      'applicant name',
      'holder name',
    ]);
    if (labeled) {
      return labeled;
    }

    return text
      .split(/\r?\n/)
      .map(item => item.trim())
      .find(
        item =>
          /^[A-Z][A-Za-z .'-]{2,80}$/.test(item) &&
          !/(government|india|department|authority|income|tax|passport|license|licence|certificate of)/i.test(
            item,
          ),
      );
  }

  private extractDob(text: string): string | undefined {
    return (
      this.extractLabeledValue(text, ['date of birth', 'dob', 'birth date']) ||
      this.firstMatch(text, /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/) ||
      this.firstMatch(text, /\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/)
    );
  }

  private extractLabeledValue(text: string, labels: string[]): string | undefined {
    for (const label of labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`${escaped}\\s*[:\\-]?\\s*([^\\n\\r]{2,120})`, 'i');
      const match = text.match(regex);
      if (match?.[1]) {
        return match[1].trim().replace(/\s{2,}/g, ' ');
      }
    }
    return undefined;
  }

  private firstMatch(text: string, regex: RegExp): string | undefined {
    const match = text.match(regex);
    return match?.[1] || match?.[0];
  }

  private normalizeAadhaar(value?: string): string | undefined {
    if (!value) {
      return undefined;
    }
    return value.replace(/\s/g, '');
  }

  private isValidDate(value: string): boolean {
    const normalized = value.trim();
    return (
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(normalized) ||
      /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(normalized)
    );
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && String(value).trim() !== '';
  }

  private normalizeType(type?: string): KycDocumentType | undefined {
    if (!type) {
      return undefined;
    }
    const normalized = type.toLowerCase().replace(/[^a-z0-9]/g, '');
    return LABEL_TO_KYC_TYPE[normalized];
  }
}
