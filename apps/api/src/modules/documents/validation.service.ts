import { Injectable } from '@nestjs/common';
import {
  CONFIDENCE_THRESHOLDS,
  ExtractedDocumentData,
  KycDocumentType,
  NO_TEXT_FOUND,
  normalizeDocumentType,
  typesMatchExpected,
  ValidationResult,
} from './types/document-intelligence.types';

const STRICT_IDENTITY_TYPES = new Set<KycDocumentType>([
  'AADHAAR',
  'PAN',
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
]);

const MARKS_CARD_TYPES = new Set<KycDocumentType>([
  'MARKS_CARD',
  'SSLC_MARKS',
  'PUC_MARKS',
  'DEGREE_CERTIFICATE',
]);

@Injectable()
export class ValidationService {
  validate(
    documentType: KycDocumentType,
    text: string,
    detectionConfidence: number,
    expectedType?: string,
  ): ValidationResult {
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

    const extractedData = this.parseFields(documentType, text);

    if (normalizedExpected && !typesMatchExpected(documentType, normalizedExpected)) {
      return {
        valid: false,
        score: detectionConfidence,
        issues: [`Uploaded document type ${documentType} does not match expected type ${normalizedExpected}`],
        hasRequiredIdentifiers: false,
        isStructureValid: false,
        hasAllRequiredFields: false,
      };
    }

    let hasRequiredIdentifiers = false;
    let isStructureValid = true;
    let hasAllRequiredFields = false;
    const issues: string[] = [];

    // Evaluate based on documentType
    switch (documentType) {
      case 'AADHAAR': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).replace(/\s/g, '') : '';
        const hasIdFormat = /^\d{12}$/.test(idRaw);
        const hasKeywords = /aadhaar|aadhar|uidai|unique\s*identification/i.test(text);
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && extractedData.gender);
        if (!hasIdFormat) issues.push('Invalid or missing Aadhaar 12-digit number');
        if (!hasKeywords) issues.push('Aadhaar / UIDAI keywords not detected');
        if (!extractedData.name) issues.push('Name not found');
        if (!extractedData.dob) issues.push('Date of birth not found');
        break;
      }
      case 'PAN': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).toUpperCase() : '';
        const hasIdFormat = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(idRaw);
        const hasKeywords = /income\s*tax|permanent\s*account|tax\s*department/i.test(text);
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.idNumber);
        if (!hasIdFormat) issues.push('Invalid or missing PAN number (format: ABCDE1234F)');
        if (!hasKeywords) issues.push('Income Tax Department keywords not detected');
        if (!extractedData.name) issues.push('Name not found');
        break;
      }
      case 'PASSPORT': {
        const idRaw = extractedData.idNumber ? String(extractedData.idNumber).toUpperCase() : '';
        const hasIdFormat = /^[A-Z][0-9]{7}$/.test(idRaw);
        const hasKeywords = /passport|republic\s*of\s*india|external\s*affairs/i.test(text);
        hasRequiredIdentifiers = hasIdFormat && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && extractedData.idNumber);
        if (!hasIdFormat) issues.push('Invalid or missing passport number');
        if (!hasKeywords) issues.push('Passport keywords not detected');
        if (!extractedData.name) issues.push('Name not found');
        if (!extractedData.dob) issues.push('Date of birth not found');
        break;
      }
      case 'DRIVING_LICENSE': {
        const hasKeywords = /driving\s*licen[cs]e|licence\s*number|dl\s*no/i.test(text);
        hasRequiredIdentifiers = Boolean(extractedData.idNumber) && hasKeywords;
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && extractedData.idNumber);
        if (!extractedData.idNumber) issues.push('Driving license number not found');
        if (!hasKeywords) issues.push('Driving license keywords not detected');
        if (!extractedData.name) issues.push('Name not found');
        if (!extractedData.dob) issues.push('Date of birth not found');
        break;
      }
      case 'BIRTH_CERTIFICATE': {
        const hasKeywords = /birth\s*certificate|certificate\s*of\s*birth/i.test(text);
        hasRequiredIdentifiers = hasKeywords && Boolean(extractedData.registrationNumber || extractedData.idNumber || extractedData.dob);
        hasAllRequiredFields = Boolean(extractedData.name && extractedData.dob && /father|mother|parent/i.test(text));
        if (!hasKeywords) issues.push('Birth certificate keywords not detected');
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

  parseFields(documentType: KycDocumentType, text: string): ExtractedDocumentData {
    switch (documentType) {
      case 'AADHAAR':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          gender: this.extractLabeledValue(text, ['gender', 'sex']),
          idNumber: this.normalizeAadhaar(this.firstMatch(text, /\b(\d{4}\s?\d{4}\s?\d{4})\b/)),
        };

      case 'PAN':
        return {
          name: this.extractName(text),
          idNumber: this.firstMatch(text, /\b([A-Z]{5}[0-9]{4}[A-Z])\b/i)?.toUpperCase(),
        };

      case 'PASSPORT':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          nationality: this.extractLabeledValue(text, ['nationality', 'country']),
          idNumber: this.firstMatch(text, /\b([A-Z][0-9]{7})\b/i)?.toUpperCase(),
        };

      case 'DRIVING_LICENSE':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          expiryDate: this.extractLabeledValue(text, ['valid till', 'valid upto', 'expiry', 'expires']),
          idNumber:
            this.extractLabeledValue(text, [
              'dl no',
              'license number',
              'licence number',
              'driving license no',
            ]) || this.firstMatch(text, /\b([A-Z]{2}[0-9]{2}\s?[0-9]{11,13})\b/i),
        };

      case 'VOTER_ID':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.firstMatch(text, /\b([A-Z]{3}[0-9]{7})\b/i)?.toUpperCase(),
        };

      case 'MARKS_CARD':
      case 'SSLC_MARKS':
      case 'PUC_MARKS':
      case 'DEGREE_CERTIFICATE':
        return {
          studentName:
            this.extractLabeledValue(text, ['student name', 'name of student', 'candidate name']) ||
            this.extractName(text),
          registerNumber:
            this.extractLabeledValue(text, [
              'register number',
              'reg no',
              'usn',
              'roll no',
              'roll number',
            ]) || this.firstMatch(text, /\b([0-9]{1,2}[A-Z]{2}[0-9]{2}[A-Z]{0,2}[0-9]{3,4})\b/i),
          institutionName: this.extractLabeledValue(text, [
            'college',
            'institution',
            'school',
            'university',
          ]),
          semester: this.extractLabeledValue(text, ['semester', 'sem', 'class']),
          cgpa: this.firstMatch(text, /\bCGPA\s*[:.]?\s*([0-9.]+)/i),
          sgpa: this.firstMatch(text, /\bSGPA\s*[:.]?\s*([0-9.]+)/i),
          subjects: this.extractSubjects(text),
          marks: this.extractMarksMap(text),
        };

      case 'BIRTH_CERTIFICATE':
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          registrationNumber: this.extractLabeledValue(text, [
            'registration number',
            'certificate number',
            'reg no',
          ]),
        };

      case 'INCOME_CERTIFICATE':
        return {
          applicantName:
            this.extractLabeledValue(text, ['applicant name', 'name of applicant', 'name']) ||
            this.extractName(text),
          incomeValue:
            this.extractLabeledValue(text, ['annual income', 'income', 'total income']) ||
            this.firstMatch(text, /(?:rs\.?|inr)\s*([0-9,]+)/i),
          issuingAuthority: this.extractLabeledValue(text, [
            'issuing authority',
            'issued by',
            'authority',
          ]),
        };

      case 'UTILITY_BILL':
      case 'ADDRESS_PROOF':
      case 'ELECTRICITY_BILL':
      case 'WATER_BILL':
      case 'GAS_BILL':
        return {
          name: this.extractName(text),
          address:
            this.extractLabeledValue(text, ['address', 'residential address', 'permanent address']) ||
            this.extractAddressBlock(text),
          idNumber:
            this.extractLabeledValue(text, [
              'consumer number',
              'consumer no',
              'consumer id',
              'rr no',
              'rr number',
              'bill number',
              'bill no',
              'account number',
              'account no',
            ]) || this.firstMatch(text, /\b\d{10,12}\b/),
          amount: this.firstMatch(text, /(?:rs\.?|inr|₹)\s*([0-9,]+(?:\.\d{2})?)/i),
        };

      case 'BANK_PASSBOOK':
      case 'BANK_STATEMENT':
        return {
          accountHolderName:
            this.extractLabeledValue(text, ['account holder', 'customer name', 'name']) ||
            this.extractName(text),
          accountNumber: this.extractLabeledValue(text, ['account number', 'account no', 'a/c no']),
          ifscCode: this.firstMatch(text, /\b([A-Z]{4}0[A-Z0-9]{6})\b/i)?.toUpperCase(),
          bankName: this.extractLabeledValue(text, ['bank name', 'bank']),
          branch: this.extractLabeledValue(text, ['branch', 'branch name']),
        };

      case 'VACCINATION_RECORD':
        return {
          beneficiaryName:
            this.extractLabeledValue(text, ['beneficiary', 'name', 'patient name']) ||
            this.extractName(text),
          vaccineDetails: this.extractLabeledValue(text, ['vaccine', 'vaccination', 'dose']),
          vaccineDates: this.extractDates(text),
        };

      case 'INSURANCE_CERTIFICATE':
      case 'HEALTH_INSURANCE_CARD':
      case 'VEHICLE_INSURANCE':
        return {
          policyHolderName:
            this.extractLabeledValue(text, ['insured name', 'policy holder', 'name']) ||
            this.extractName(text),
          policyNumber: this.extractLabeledValue(text, ['policy number', 'policy no']),
          validity: this.extractLabeledValue(text, ['valid till', 'validity', 'valid upto', 'expiry']),
        };

      case 'INVOICE':
        return {
          dealerName: this.extractLabeledValue(text, ['dealer', 'seller', 'vendor', 'company']),
          invoiceNumber: this.extractLabeledValue(text, ['invoice number', 'invoice no', 'bill number']),
          invoiceDate: this.extractDob(text),
          productDetails: this.extractLabeledValue(text, ['product', 'vehicle', 'description', 'item']),
        };

      case 'TRANSFER_CERTIFICATE':
        return {
          name: this.extractName(text),
          institutionName: this.extractLabeledValue(text, ['school', 'college', 'institution']),
          registrationNumber: this.extractLabeledValue(text, ['tc no', 'certificate number', 'reg no']),
        };

      case 'RESUME':
        return {
          name: this.extractName(text),
          idNumber: this.extractLabeledValue(text, ['email', 'phone', 'contact']),
        };

      default:
        return {
          name: this.extractName(text),
          dob: this.extractDob(text),
          idNumber: this.extractLabeledValue(text, [
            'number',
            'certificate number',
            'registration number',
          ]),
        };
    }
  }

  private extractSubjects(text: string): string[] {
    const subjects: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (/^[A-Za-z][A-Za-z\s&]{3,40}$/.test(line.trim()) && !/total|grade|marks|semester/i.test(line)) {
        subjects.push(line.trim());
      }
    }
    return subjects.slice(0, 12);
  }

  private extractMarksMap(text: string): Record<string, string> {
    const marks: Record<string, string> = {};
    const regex = /([A-Za-z][A-Za-z\s&]{2,30})\s+(\d{1,3})\s*$/gm;
    let match;
    while ((match = regex.exec(text)) !== null && Object.keys(marks).length < 15) {
      marks[match[1].trim()] = match[2];
    }
    return marks;
  }

  private extractAddressBlock(text: string): string | undefined {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 10);
    const addressLines = lines.filter(
      l => /\d/.test(l) && /(road|street|nagar|colony|district|pin|pincode|state)/i.test(l),
    );
    return addressLines.slice(0, 4).join(', ') || undefined;
  }

  private extractDates(text: string): string[] {
    const dates: string[] = [];
    const regex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g;
    let match;
    while ((match = regex.exec(text)) !== null && dates.length < 5) {
      dates.push(match[1]);
    }
    return dates;
  }

  private extractName(text: string): string | undefined {
    const labeled = this.extractLabeledValue(text, [
      'name',
      'candidate name',
      'person name',
      'applicant name',
      'holder name',
    ]);
    if (labeled) return labeled;

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
      if (match?.[1]) return match[1].trim().replace(/\s{2,}/g, ' ');
    }
    return undefined;
  }

  private firstMatch(text: string, regex: RegExp): string | undefined {
    const match = text.match(regex);
    return match?.[1] || match?.[0];
  }

  private normalizeAadhaar(value?: string): string | undefined {
    return value ? value.replace(/\s/g, '') : undefined;
  }

  private isValidDate(value: string): boolean {
    const normalized = value.trim();
    return (
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(normalized) ||
      /^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(normalized)
    );
  }

  private hasValue(value: unknown): boolean {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
    return value !== undefined && value !== null && String(value).trim() !== '';
  }
}
