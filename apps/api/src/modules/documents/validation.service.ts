import { Injectable, Logger } from '@nestjs/common';
import {
  CONFIDENCE_THRESHOLDS,
  ExtractedDocumentData,
  KycDocumentType,
  NO_TEXT_FOUND,
  normalizeDocumentType,
  typesMatchExpected,
  ValidationResult,
} from './types/document-intelligence.types';

const OCR_RULE_DOCUMENT_TYPES = new Set<KycDocumentType>([
  'AADHAAR',
  'PAN',
  'PASSPORT',
  'DRIVING_LICENSE',
  'BIRTH_CERTIFICATE',
  'MARKS_CARD',
  'BANK_PASSBOOK',
]);

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  validate(
    documentType: KycDocumentType,
    text: string,
    extractedData: ExtractedDocumentData,
    detectionConfidence: number,
    expectedType?: string,
  ): ValidationResult {
    this.logger.log(`[Layer 5] Validating fields for ${documentType}`);
    const normalizedExpected = normalizeDocumentType(expectedType);

    if (documentType === 'PASSPORT_PHOTO') {
      return {
        valid: detectionConfidence >= CONFIDENCE_THRESHOLDS.STRONG_MATCH,
        score: detectionConfidence,
        issues:
          detectionConfidence >= CONFIDENCE_THRESHOLDS.STRONG_MATCH
            ? ['Portrait photograph detected']
            : ['Portrait photograph requires manual review'],
        hasRequiredIdentifiers: false,
        isStructureValid: false,
        hasAllRequiredFields: false,
      };
    }

    if (text === NO_TEXT_FOUND || !text.trim()) {
      return {
        valid: false,
        score: Math.min(detectionConfidence, 35),
        issues: ['No readable text found in document'],
        hasRequiredIdentifiers: false,
        isStructureValid: false,
        hasAllRequiredFields: false,
      };
    }

    if (documentType === 'UNKNOWN') {
      return {
        valid: false,
        score: Math.min(detectionConfidence, 40),
        issues: ['Unable to classify document type with sufficient confidence'],
        hasRequiredIdentifiers: false,
        isStructureValid: false,
        hasAllRequiredFields: false,
      };
    }

    if (normalizedExpected && !typesMatchExpected(documentType, normalizedExpected)) {
      return {
        valid: false,
        score: 0,
        issues: ['Uploaded document type does not match required document type'],
        hasRequiredIdentifiers: false,
        isStructureValid: false,
        hasAllRequiredFields: false,
      };
    }

    let hasRequiredIdentifiers = false;
    let isStructureValid = true;
    let hasAllRequiredFields = false;
    const issues: string[] = [];

    switch (documentType) {
      case 'AADHAAR': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).replace(/\s/g, '') : '';
        const hasIdFormat = /^\d{12}$/.test(idRaw);
        const hasKeywords = /aadhaar|aadhar|uidai|unique\s*identification/i.test(text) ||
                            /vid\s*:/i.test(text) ||
                            (/female|male|महिला|पुरुष/i.test(text) && /dob|yob|birth|जन्म/i.test(text));
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && extractedData.gender);
        if (!hasIdFormat) issues.push('Invalid or missing Aadhaar 12-digit number');
        if (!hasKeywords) issues.push('Aadhaar / UIDAI keywords or card markers not detected');
        if (!extractedData.name) issues.push('Name not found');
        if (!extractedData.dob) issues.push('Date of birth not found');
        break;
      }
      case 'PAN': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).toUpperCase() : '';
        const hasIdFormat = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(idRaw);
        const hasKeywords = /income\s*tax|permanent\s*account|tax\s*department/i.test(text) ||
                            /pan\s*card/i.test(text) ||
                            (/father/i.test(text) && /signature/i.test(text));
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.idNumber);
        if (!hasIdFormat) issues.push('Invalid or missing PAN number (format: ABCDE1234F)');
        if (!hasKeywords) issues.push('Income Tax Department keywords or card markers not detected');
        if (!extractedData.name) issues.push('Name not found');
        break;
      }
      case 'PASSPORT': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).toUpperCase() : '';
        const hasIdFormat = /^[A-Z][0-9]{7}$/.test(idRaw);
        const hasKeywords = /passport|republic\s*of\s*india|external\s*affairs/i.test(text) ||
                            (/given\s*names/i.test(text) && /surname/i.test(text)) ||
                            /country\s*code/i.test(text);
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && extractedData.idNumber);
        if (!hasIdFormat) issues.push('Invalid or missing passport number');
        if (!hasKeywords) issues.push('Passport keywords or markers not detected');
        if (!extractedData.name) issues.push('Name not found');
        if (!extractedData.dob) issues.push('Date of birth not found');
        break;
      }
      case 'DRIVING_LICENSE': {
        const hasKeywords = /driving\s*licen[cs]e|licence\s*number|dl\s*no/i.test(text) ||
                            /dl\s*number/i.test(text) ||
                            /union\s*of\s*india/i.test(text) ||
                            /licence\s*to\s*drive/i.test(text) ||
                            /auth\s*to\s*drive/i.test(text);
        hasRequiredIdentifiers = Boolean(extractedData.idNumber) && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && extractedData.idNumber);
        if (!extractedData.idNumber) issues.push('Driving license number not found');
        if (!hasKeywords) issues.push('Driving license keywords or card markers not detected');
        if (!extractedData.name) issues.push('Name not found');
        if (!extractedData.dob) issues.push('Date of birth not found');
        break;
      }
      case 'BIRTH_CERTIFICATE': {
        const hasKeywords = /birth\s*certificate|certificate\s*of\s*birth/i.test(text) ||
                            (/born\s*on/i.test(text) && /registration/i.test(text));
        hasRequiredIdentifiers = hasKeywords && Boolean(extractedData.registrationNumber || extractedData.idNumber || extractedData.dob);
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && /father|mother|parent/i.test(text));
        if (!hasKeywords) issues.push('Birth certificate keywords or markers not detected');
        if (!extractedData.dob) issues.push('Date of birth not found');
        if (!extractedData.name) issues.push('Name not found');
        break;
      }
      case 'MARKS_CARD':
      case 'SSLC_MARKS':
      case 'PUC_MARKS':
      case 'DEGREE_CERTIFICATE': {
        const hasKeywords = /marks\s*card|marksheet|statement\s*of\s*marks|sslc|puc|degree|result/i.test(text);
        const hasMarks = (extractedData.subjects && extractedData.subjects.length > 0) || Boolean(extractedData.cgpa || extractedData.sgpa || (extractedData.marks && Object.keys(extractedData.marks).length > 0));
        hasRequiredIdentifiers = hasKeywords && hasMarks;
        hasAllRequiredFields = Boolean(extractedData.studentName || extractedData.name);
        if (!hasKeywords) issues.push('Academic transcript keywords not detected');
        if (!hasMarks) issues.push('Marks or grade details not found');
        if (!hasAllRequiredFields) issues.push('Candidate / Student name not found');
        break;
      }
      case 'BANK_PASSBOOK':
      case 'BANK_STATEMENT': {
        const hasIfsc = extractedData.ifscCode ? /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(extractedData.ifscCode)) : false;
        hasRequiredIdentifiers = Boolean(extractedData.accountNumber && hasIfsc);
        hasAllRequiredFields = Boolean((extractedData.accountHolderName || extractedData.name) && (extractedData.bankName || extractedData.ifscCode));
        if (!extractedData.accountNumber) issues.push('Account number not found');
        if (!hasIfsc) issues.push('IFSC code not found or invalid');
        break;
      }
      case 'UTILITY_BILL':
      case 'ELECTRICITY_BILL':
      case 'WATER_BILL':
      case 'GAS_BILL': {
        const hasKeywords = /utility|bill|bescom|electricity|water|gas|charges|rr\s*no|consumer/i.test(text);
        hasRequiredIdentifiers = hasKeywords && Boolean(extractedData.idNumber);
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.address);
        if (!extractedData.idNumber) issues.push('Consumer or bill number not found');
        if (!extractedData.name) issues.push('Customer name not found');
        if (!extractedData.address) issues.push('Address not found');
        break;
      }
      case 'INCOME_CERTIFICATE': {
        const hasKeywords = /income\s*certificate|tahsildar|annual\s*income/i.test(text);
        hasRequiredIdentifiers = hasKeywords && Boolean(extractedData.incomeValue);
        hasAllRequiredFields = Boolean(extractedData.applicantName || extractedData.name);
        if (!extractedData.incomeValue) issues.push('Annual income value not found');
        if (!hasKeywords) issues.push('Income certificate keywords not detected');
        break;
      }
      case 'VOTER_ID': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).toUpperCase() : '';
        const hasIdFormat = /^[A-Z]{3}[0-9]{7}$/.test(idRaw);
        const hasKeywords = /voter\s*id|election\s*commission|epic/i.test(text);
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.idNumber);
        if (!hasIdFormat) issues.push('Invalid or missing EPIC number');
        if (!hasKeywords) issues.push('Voter ID keywords not detected');
        if (!extractedData.name) issues.push('Name not found');
        break;
      }
      default: {
        const hasAnyField = Object.values(extractedData).some(v => this.hasValue(v));
        hasRequiredIdentifiers = hasAnyField;
        hasAllRequiredFields = hasAnyField;
        break;
      }
    }

    isStructureValid = issues.length === 0;

    const baseScore = detectionConfidence * 0.6 + (hasRequiredIdentifiers ? 25 : 0) + (hasAllRequiredFields ? 15 : 0);
    const score = Math.round(Math.min(100, Math.max(0, baseScore)));
    if (OCR_RULE_DOCUMENT_TYPES.has(documentType) && detectionConfidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      return {
        valid: true,
        score: Math.max(score, detectionConfidence),
        issues: [`${documentType} deterministic OCR indicators detected`],
        hasRequiredIdentifiers: hasRequiredIdentifiers || detectionConfidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED,
        isStructureValid: true,
        hasAllRequiredFields: hasAllRequiredFields || detectionConfidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED,
      };
    }

    const valid = hasRequiredIdentifiers && hasAllRequiredFields && isStructureValid && score >= CONFIDENCE_THRESHOLDS.STRONG_MATCH;

    return {
      valid,
      score,
      issues: issues.length ? issues : [`${documentType} verified successfully`],
      hasRequiredIdentifiers,
      isStructureValid,
      hasAllRequiredFields,
    };
  }

  private hasValue(value: unknown): boolean {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }
}
