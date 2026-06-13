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
      };
    }

    if (text === NO_TEXT_FOUND || !text.trim()) {
      return {
        valid: false,
        score: Math.min(detectionConfidence, 35),
        issues: ['No readable text found in document'],
      };
    }

    if (documentType === 'UNKNOWN') {
      return {
        valid: false,
        score: Math.min(detectionConfidence, 40),
        issues: ['Unable to classify document type with sufficient confidence'],
      };
    }

    const extractedData = this.parseFields(documentType, text);

    if (normalizedExpected && !typesMatchExpected(documentType, normalizedExpected)) {
      return {
        valid: false,
        score: detectionConfidence,
        issues: ['Uploaded document does not match selected document type'],
      };
    }

    if (STRICT_IDENTITY_TYPES.has(documentType)) {
      return this.validateIdentityDocument(documentType, extractedData, detectionConfidence);
    }

    if (MARKS_CARD_TYPES.has(documentType)) {
      return this.validateMarksCard(extractedData, text, detectionConfidence);
    }

    if (documentType === 'BIRTH_CERTIFICATE') {
      return this.validateBirthCertificate(extractedData, detectionConfidence);
    }

    if (documentType === 'BANK_PASSBOOK' || documentType === 'BANK_STATEMENT') {
      return this.validateBankDocument(extractedData, detectionConfidence);
    }

    if (documentType === 'ADDRESS_PROOF') {
      return this.validateAddressProof(extractedData, text, detectionConfidence);
    }

    if (documentType === 'INCOME_CERTIFICATE') {
      return this.validateIncomeCertificate(extractedData, detectionConfidence);
    }

    if (documentType === 'VACCINATION_RECORD') {
      return this.validateVaccinationRecord(extractedData, detectionConfidence);
    }

    if (
      documentType === 'INSURANCE_CERTIFICATE' ||
      documentType === 'HEALTH_INSURANCE_CARD' ||
      documentType === 'VEHICLE_INSURANCE'
    ) {
      return this.validateInsurance(extractedData, detectionConfidence);
    }

    if (documentType === 'INVOICE') {
      return this.validateInvoice(extractedData, detectionConfidence);
    }

    return this.validateGeneralDocument(documentType, extractedData, detectionConfidence);
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

      case 'ADDRESS_PROOF':
      case 'ELECTRICITY_BILL':
      case 'WATER_BILL':
      case 'GAS_BILL':
        return {
          name: this.extractName(text),
          address:
            this.extractLabeledValue(text, ['address', 'residential address', 'permanent address']) ||
            this.extractAddressBlock(text),
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

  private validateIdentityDocument(
    documentType: KycDocumentType,
    data: ExtractedDocumentData,
    confidence: number,
  ): ValidationResult {
    const issues: string[] = [];
    const missing = this.findMissingFields(documentType, data);
    if (missing.length > 0) issues.push(`Missing fields: ${missing.join(', ')}`);
    issues.push(...this.validateFormats(documentType, data));

    const fieldScore = this.fieldCompletenessScore(documentType, data);
    const score = Math.round(
      Math.min(100, confidence * 0.55 + fieldScore * 30 + (issues.length === 0 ? 15 : 0)),
    );

    return {
      valid: issues.length === 0 && score >= CONFIDENCE_THRESHOLDS.STRONG_MATCH,
      score,
      issues: issues.length ? issues : [`${documentType} verified with required fields present`],
    };
  }

  private validateMarksCard(
    data: ExtractedDocumentData,
    text: string,
    confidence: number,
  ): ValidationResult {
    const issues: string[] = [];
    const hasTable = /\b\d{1,3}\b.*\b\d{1,3}\b/m.test(text) || (data.marks && Object.keys(data.marks).length > 0);
    const hasStudent = Boolean(data.studentName || data.name);
    const hasMarks = hasTable || Boolean(data.cgpa || data.sgpa);

    if (!hasStudent) issues.push('Student information not found');
    if (!hasMarks) issues.push('Marks table or grade information not detected');
    if (!hasTable && text.length > 100) issues.push('Academic table structure not clearly detected');

    const score = Math.round(
      confidence * (issues.length === 0 ? 0.95 : issues.length === 1 ? 0.8 : 0.65),
    );

    return {
      valid: issues.length === 0 && score >= CONFIDENCE_THRESHOLDS.STRONG_MATCH,
      score,
      issues: issues.length ? issues : ['Academic structure detected', 'Marks table detected'],
    };
  }

  private validateBirthCertificate(data: ExtractedDocumentData, confidence: number): ValidationResult {
    const issues: string[] = [];
    if (!data.dob && !data.name) issues.push('Date of birth not found');
    if (!data.registrationNumber && !data.idNumber) issues.push('Registration details not found');

    const score = Math.round(confidence * (issues.length === 0 ? 0.95 : 0.7));
    return { valid: issues.length === 0, score, issues };
  }

  private validateBankDocument(data: ExtractedDocumentData, confidence: number): ValidationResult {
    const issues: string[] = [];
    if (!data.accountNumber) issues.push('Account number not found');
    if (!data.ifscCode) issues.push('IFSC code not found');
    if (!data.bankName && !data.accountHolderName) issues.push('Bank name or account holder not found');
    if (data.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(data.ifscCode)) {
      issues.push('IFSC code format is invalid');
    }

    const score = Math.round(confidence * (issues.length === 0 ? 0.95 : 0.75));
    return { valid: issues.length === 0, score, issues };
  }

  private validateAddressProof(
    data: ExtractedDocumentData,
    text: string,
    confidence: number,
  ): ValidationResult {
    const issues: string[] = [];
    if (!data.address && text.length < 80) issues.push('Address not found');
    if (!data.name) issues.push('Name not found');

    const score = Math.round(confidence * (issues.length === 0 ? 0.92 : 0.72));
    return { valid: issues.length === 0, score, issues };
  }

  private validateIncomeCertificate(data: ExtractedDocumentData, confidence: number): ValidationResult {
    const issues: string[] = [];
    if (!data.applicantName && !data.name) issues.push('Applicant name not found');
    if (!data.incomeValue) issues.push('Income value not found');

    const score = Math.round(confidence * (issues.length === 0 ? 0.93 : 0.72));
    return { valid: issues.length === 0, score, issues };
  }

  private validateVaccinationRecord(data: ExtractedDocumentData, confidence: number): ValidationResult {
    const issues: string[] = [];
    if (!data.beneficiaryName && !data.name) issues.push('Beneficiary name not found');
    if (!data.vaccineDetails) issues.push('Vaccine details not found');

    const score = Math.round(confidence * (issues.length === 0 ? 0.92 : 0.72));
    return { valid: issues.length === 0, score, issues };
  }

  private validateInsurance(data: ExtractedDocumentData, confidence: number): ValidationResult {
    const issues: string[] = [];
    if (!data.policyNumber) issues.push('Policy number not found');
    if (!data.policyHolderName && !data.name) issues.push('Policy holder name not found');

    const score = Math.round(confidence * (issues.length === 0 ? 0.93 : 0.73));
    return { valid: issues.length === 0, score, issues };
  }

  private validateInvoice(data: ExtractedDocumentData, confidence: number): ValidationResult {
    const issues: string[] = [];
    if (!data.invoiceNumber) issues.push('Invoice number not found');
    if (!data.dealerName) issues.push('Dealer or vendor name not found');

    const score = Math.round(confidence * (issues.length === 0 ? 0.92 : 0.74));
    return { valid: issues.length === 0, score, issues };
  }

  private validateGeneralDocument(
    documentType: KycDocumentType,
    data: ExtractedDocumentData,
    confidence: number,
  ): ValidationResult {
    const hasAnyField = Object.values(data).some(v => this.hasValue(v));
    const score = Math.round(confidence * (hasAnyField ? 0.92 : 0.78));
    const valid = score >= CONFIDENCE_THRESHOLDS.STRONG_MATCH && hasAnyField;

    return {
      valid,
      score,
      issues: valid
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
      if (!/^\d{12}$/.test(digits)) issues.push('Aadhaar number must be 12 digits');
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
    const required: string[] = ['name', 'idNumber'];
    if (['AADHAAR', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID'].includes(documentType)) {
      required.push('dob');
    }

    return required.filter(field => !this.hasValue(data[field as keyof ExtractedDocumentData]));
  }

  private fieldCompletenessScore(documentType: KycDocumentType, data: ExtractedDocumentData): number {
    const missing = this.findMissingFields(documentType, data);
    const totalRequired = documentType === 'PAN' ? 2 : 3;
    return (totalRequired - missing.length) / totalRequired;
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
