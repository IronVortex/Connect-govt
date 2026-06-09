import { Injectable } from '@nestjs/common';

export const DOCUMENT_TYPES = {
  AADHAAR: 'Aadhaar Card',
  PAN: 'PAN Card',
  PASSPORT: 'Passport',
  DRIVING_LICENSE: 'Driving License',
  VOTER_ID: 'Voter ID',
  BIRTH_CERTIFICATE: 'Birth Certificate',
  ADDRESS_PROOF: 'Address Proof',
  INSURANCE_CERTIFICATE: 'Insurance Certificate',
  INVOICE: 'Invoice / Bill of Sale',
  RESUME: 'Resume',
  PASSPORT_PHOTO: 'Passport Size Photo',
  BANK_DOCUMENT: 'Bank Passbook / Bank Statement',
} as const;

export type SupportedDocumentType = (typeof DOCUMENT_TYPES)[keyof typeof DOCUMENT_TYPES];

export interface DocumentVerificationResult {
  documentType: string;
  verified: boolean;
  confidence: number;
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  reason?: string;
}

interface VerificationContext {
  filename: string;
  mimeType?: string;
  text: string;
  lowerText: string;
  imageProperties?: { width?: number; height?: number; aspect?: number };
}

interface ValidatorResult {
  verified: boolean;
  confidence: number;
  missingFields: string[];
  extractedFields: Record<string, unknown>;
}

@Injectable()
export class DocumentVerificationService {
  verify(
    filename: string,
    content?: string,
    expectedType?: string,
    mimeType?: string,
    imageProperties?: { width?: number; height?: number; aspect?: number },
  ): DocumentVerificationResult {
    const context: VerificationContext = {
      filename,
      mimeType,
      text: content || '',
      lowerText: (content || '').toLowerCase(),
      imageProperties,
    };

    const detected = this.detectDocumentType(context);
    const selectedType = this.normalizeSupportedType(expectedType);
    const documentType = selectedType || detected.documentType;

    if (selectedType && detected.documentType !== 'Unknown' && detected.documentType !== selectedType) {
      return {
        documentType: detected.documentType,
        verified: false,
        confidence: detected.confidence,
        extractedFields: detected.result?.extractedFields || {},
        missingFields: [],
        reason: 'Uploaded document does not match selected document type',
      };
    }

    if (!this.hasValidator(documentType)) {
      return {
        documentType,
        verified: false,
        confidence: detected.confidence,
        extractedFields: {},
        missingFields: ['supported document type'],
        reason: 'Document type is not supported for verification',
      };
    }

    const result = this.runValidator(documentType, context);
    return {
      documentType,
      ...result,
      reason: result.verified
        ? undefined
        : this.buildMissingFieldReason(result.missingFields),
    };
  }

  detectDocumentType(context: VerificationContext): {
    documentType: string;
    confidence: number;
    result?: ValidatorResult;
  } {
    const candidates: Array<{ documentType: SupportedDocumentType; result: ValidatorResult }> = [
      { documentType: DOCUMENT_TYPES.AADHAAR, result: this.verifyAadhaar(context) },
      { documentType: DOCUMENT_TYPES.PAN, result: this.verifyPan(context) },
      { documentType: DOCUMENT_TYPES.PASSPORT, result: this.verifyPassport(context) },
      { documentType: DOCUMENT_TYPES.DRIVING_LICENSE, result: this.verifyDrivingLicense(context) },
      { documentType: DOCUMENT_TYPES.VOTER_ID, result: this.verifyVoterId(context) },
      { documentType: DOCUMENT_TYPES.BIRTH_CERTIFICATE, result: this.verifyBirthCertificate(context) },
      { documentType: DOCUMENT_TYPES.ADDRESS_PROOF, result: this.verifyAddressProof(context) },
      { documentType: DOCUMENT_TYPES.INSURANCE_CERTIFICATE, result: this.verifyInsuranceCertificate(context) },
      { documentType: DOCUMENT_TYPES.INVOICE, result: this.verifyInvoice(context) },
      { documentType: DOCUMENT_TYPES.RESUME, result: this.verifyResume(context) },
      { documentType: DOCUMENT_TYPES.PASSPORT_PHOTO, result: this.verifyPassportSizePhoto(context) },
      { documentType: DOCUMENT_TYPES.BANK_DOCUMENT, result: this.verifyBankDocument(context) },
    ].sort((a, b) => b.result.confidence - a.result.confidence);

    const best = candidates[0];
    if (!best || best.result.confidence < 35) {
      return { documentType: 'Unknown', confidence: best?.result.confidence || 0, result: best?.result };
    }

    return {
      documentType: best.documentType,
      confidence: best.result.confidence,
      result: best.result,
    };
  }

  verifyAadhaar(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      aadhaarIdentifier: this.hasAny(context.lowerText, ['aadhaar', 'aadhar', 'uidai', 'unique identification authority']),
      aadhaarNumber: this.firstMatch(context.text, /\b\d{4}\s?\d{4}\s?\d{4}\b/),
      name: this.extractName(context.text),
    };

    return this.requiredResult(extractedFields, {
      aadhaarIdentifier: 'Aadhaar identifier',
      aadhaarNumber: 'Aadhaar number',
      name: 'Person name',
    });
  }

  verifyPan(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      panIdentifier: this.hasAny(context.lowerText, ['pan', 'permanent account number', 'income tax department']),
      panNumber: this.firstMatch(context.text, /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i),
      name: this.extractName(context.text),
    };

    return this.requiredResult(extractedFields, {
      panIdentifier: 'PAN identifier',
      panNumber: 'PAN number',
      name: 'Person name',
    });
  }

  verifyAddressProof(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      address: this.extractAddress(context.text),
      name: this.extractName(context.text),
      indicator: this.firstKeyword(context.lowerText, [
        'utility bill',
        'electricity bill',
        'water bill',
        'gas bill',
        'telephone bill',
        'rent agreement',
        'rental agreement',
        'lease agreement',
      ]),
    };

    return this.requiredResult(extractedFields, {
      address: 'Address',
      name: 'Name',
      indicator: 'Utility bill / agreement indicator',
    });
  }

  verifyResume(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      education: this.hasSection(context.lowerText, 'education'),
      skills: this.hasSection(context.lowerText, 'skills'),
      experience: this.hasSection(context.lowerText, 'experience') || this.hasSection(context.lowerText, 'work experience'),
    };

    return this.requiredResult(extractedFields, {
      education: 'Education section',
      skills: 'Skills section',
      experience: 'Experience section',
    });
  }

  verifyInsuranceCertificate(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      policyNumber: this.firstMatch(context.text, /\b(?:policy\s*(?:no|number|#)?\s*[:\-]?\s*)?([A-Z0-9][A-Z0-9/-]{5,})\b/i, ['policy']),
      insuredName: this.extractLabeledValue(context.text, ['insured name', 'name of insured', 'policy holder', 'proposer name']),
      insuranceCompany: this.extractCompany(context.text, ['insurance company', 'insurer', 'company name']) || this.firstKeyword(context.lowerText, ['insurance']),
    };

    return this.requiredResult(extractedFields, {
      policyNumber: 'Policy number',
      insuredName: 'Insured name',
      insuranceCompany: 'Insurance company',
    });
  }

  verifyInvoice(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      invoiceNumber: this.extractLabeledValue(context.text, ['invoice number', 'invoice no', 'invoice #', 'bill number', 'bill no']),
      date: this.firstMatch(context.text, /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/),
      amount: this.firstMatch(context.text, /(?:rs\.?|inr|₹|\$)\s?[\d,]+(?:\.\d{2})?|\btotal\s*[:\-]?\s*[\d,]+(?:\.\d{2})?/i),
    };

    return this.requiredResult(extractedFields, {
      invoiceNumber: 'Invoice number',
      date: 'Date',
      amount: 'Amount',
    });
  }

  private verifyPassport(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      passportIdentifier: this.hasAny(context.lowerText, ['passport', 'republic of india', 'ministry of external affairs']),
      passportNumber: this.firstMatch(context.text, /\b[A-Z][0-9]{7}\b/i),
      name: this.extractName(context.text),
    };

    return this.requiredResult(extractedFields, {
      passportIdentifier: 'Passport identifier',
      passportNumber: 'Passport number',
      name: 'Name',
    });
  }

  private verifyDrivingLicense(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      licenseIdentifier: this.hasAny(context.lowerText, ['driving license', 'driving licence', 'transport department']),
      licenseNumber: this.extractLabeledValue(context.text, ['dl no', 'license number', 'licence number', 'driving license no', 'driving licence no']),
      name: this.extractName(context.text),
    };

    return this.requiredResult(extractedFields, {
      licenseIdentifier: 'Driving License identifier',
      licenseNumber: 'License number',
      name: 'Name',
    });
  }

  private verifyVoterId(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      voterIdentifier: this.hasAny(context.lowerText, ['voter id', 'election commission', 'elector photo identity card', 'epic']),
      epicNumber: this.firstMatch(context.text, /\b[A-Z]{3}[0-9]{7}\b/i),
      name: this.extractName(context.text),
    };

    return this.requiredResult(extractedFields, {
      voterIdentifier: 'Voter ID identifier',
      epicNumber: 'EPIC number',
      name: 'Name',
    });
  }

  private verifyBirthCertificate(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      birthCertificateIdentifier: this.hasAny(context.lowerText, ['birth certificate', 'certificate of birth', 'registrar of births']),
      registrationNumber: this.extractLabeledValue(context.text, ['registration number', 'certificate number', 'birth registration no']),
      name: this.extractName(context.text),
      dateOfBirth: this.extractLabeledValue(context.text, ['date of birth', 'dob']),
    };

    return this.requiredResult(extractedFields, {
      birthCertificateIdentifier: 'Birth Certificate identifier',
      registrationNumber: 'Registration number',
      name: 'Name',
      dateOfBirth: 'Date of birth',
    });
  }

  private verifyPassportSizePhoto(context: VerificationContext): ValidatorResult {
    const isImage = Boolean(context.mimeType?.startsWith('image/'));
    const hasLittleText = context.text.trim().length < 150;
    const aspect = context.imageProperties?.aspect;
    const hasPhotoAspect = typeof aspect === 'number' && aspect >= 0.7 && aspect <= 1.4;
    const extractedFields = {
      imageFile: isImage,
      photoLikeContent: hasLittleText,
      acceptableAspectRatio: hasPhotoAspect,
    };

    return this.requiredResult(extractedFields, {
      imageFile: 'Image file',
      photoLikeContent: 'Photo-like content',
      acceptableAspectRatio: 'Acceptable aspect ratio',
    });
  }

  private verifyBankDocument(context: VerificationContext): ValidatorResult {
    const extractedFields = {
      bankIdentifier: this.hasAny(context.lowerText, ['bank', 'passbook', 'statement', 'account statement']),
      accountNumber: this.extractLabeledValue(context.text, ['account number', 'account no', 'a/c no', 'ac no']),
      accountHolderName: this.extractLabeledValue(context.text, ['account holder', 'name']) || this.extractName(context.text),
    };

    return this.requiredResult(extractedFields, {
      bankIdentifier: 'Bank document identifier',
      accountNumber: 'Account number',
      accountHolderName: 'Account holder name',
    });
  }

  private normalizeSupportedType(type?: string): SupportedDocumentType | undefined {
    if (!type) return undefined;
    const normalized = this.normalize(type);
    const aliases: Record<string, SupportedDocumentType> = {
      aadhaar: DOCUMENT_TYPES.AADHAAR,
      aadhar: DOCUMENT_TYPES.AADHAAR,
      aadhaarcard: DOCUMENT_TYPES.AADHAAR,
      aadharcard: DOCUMENT_TYPES.AADHAAR,
      pan: DOCUMENT_TYPES.PAN,
      pancard: DOCUMENT_TYPES.PAN,
      passport: DOCUMENT_TYPES.PASSPORT,
      drivinglicense: DOCUMENT_TYPES.DRIVING_LICENSE,
      drivinglicence: DOCUMENT_TYPES.DRIVING_LICENSE,
      voterid: DOCUMENT_TYPES.VOTER_ID,
      epic: DOCUMENT_TYPES.VOTER_ID,
      birthcertificate: DOCUMENT_TYPES.BIRTH_CERTIFICATE,
      addressproof: DOCUMENT_TYPES.ADDRESS_PROOF,
      proofofaddress: DOCUMENT_TYPES.ADDRESS_PROOF,
      insurance: DOCUMENT_TYPES.INSURANCE_CERTIFICATE,
      insurancecertificate: DOCUMENT_TYPES.INSURANCE_CERTIFICATE,
      invoice: DOCUMENT_TYPES.INVOICE,
      billofsale: DOCUMENT_TYPES.INVOICE,
      invoicebillofsale: DOCUMENT_TYPES.INVOICE,
      resume: DOCUMENT_TYPES.RESUME,
      cv: DOCUMENT_TYPES.RESUME,
      passportphoto: DOCUMENT_TYPES.PASSPORT_PHOTO,
      passportsizephoto: DOCUMENT_TYPES.PASSPORT_PHOTO,
      photo: DOCUMENT_TYPES.PASSPORT_PHOTO,
      bankpassbook: DOCUMENT_TYPES.BANK_DOCUMENT,
      bankstatement: DOCUMENT_TYPES.BANK_DOCUMENT,
      bankpassbookbankstatement: DOCUMENT_TYPES.BANK_DOCUMENT,
    };

    return aliases[normalized] || Object.values(DOCUMENT_TYPES).find(item => this.normalize(item) === normalized);
  }

  private hasValidator(documentType: string): documentType is SupportedDocumentType {
    return Object.values(DOCUMENT_TYPES).includes(documentType as SupportedDocumentType);
  }

  private runValidator(documentType: string, context: VerificationContext): ValidatorResult {
    switch (documentType) {
      case DOCUMENT_TYPES.AADHAAR:
        return this.verifyAadhaar(context);
      case DOCUMENT_TYPES.PAN:
        return this.verifyPan(context);
      case DOCUMENT_TYPES.PASSPORT:
        return this.verifyPassport(context);
      case DOCUMENT_TYPES.DRIVING_LICENSE:
        return this.verifyDrivingLicense(context);
      case DOCUMENT_TYPES.VOTER_ID:
        return this.verifyVoterId(context);
      case DOCUMENT_TYPES.BIRTH_CERTIFICATE:
        return this.verifyBirthCertificate(context);
      case DOCUMENT_TYPES.ADDRESS_PROOF:
        return this.verifyAddressProof(context);
      case DOCUMENT_TYPES.INSURANCE_CERTIFICATE:
        return this.verifyInsuranceCertificate(context);
      case DOCUMENT_TYPES.INVOICE:
        return this.verifyInvoice(context);
      case DOCUMENT_TYPES.RESUME:
        return this.verifyResume(context);
      case DOCUMENT_TYPES.PASSPORT_PHOTO:
        return this.verifyPassportSizePhoto(context);
      case DOCUMENT_TYPES.BANK_DOCUMENT:
        return this.verifyBankDocument(context);
      default:
        return { verified: false, confidence: 0, missingFields: ['supported document type'], extractedFields: {} };
    }
  }

  private requiredResult(
    extractedFields: Record<string, unknown>,
    requiredLabels: Record<string, string>,
  ): ValidatorResult {
    const missingFields = Object.entries(requiredLabels)
      .filter(([field]) => !this.hasValue(extractedFields[field]))
      .map(([, label]) => label);
    const requiredCount = Object.keys(requiredLabels).length;
    const presentCount = requiredCount - missingFields.length;
    const confidence = Math.min(100, Math.round((presentCount / requiredCount) * 90 + (presentCount > 0 ? 10 : 0)));

    return {
      verified: missingFields.length === 0,
      confidence,
      missingFields,
      extractedFields,
    };
  }

  private buildMissingFieldReason(missingFields: string[]): string {
    if (missingFields.length === 0) {
      return 'Uploaded document does not match selected document type';
    }
    if (missingFields.length === 1) {
      return `${missingFields[0]} not found`;
    }
    return `Required fields missing: ${missingFields.join(', ')}`;
  }

  private extractName(text: string): string | undefined {
    const labeled = this.extractLabeledValue(text, ['name', 'candidate name', 'person name', 'applicant name']);
    if (labeled) return labeled;

    const line = text
      .split(/\r?\n/)
      .map(item => item.trim())
      .find(item =>
        /^[A-Z][A-Za-z .'-]{2,80}$/.test(item) &&
        !/(government|india|department|authority|income|tax|invoice|resume|address|policy)/i.test(item),
      );

    return line;
  }

  private extractAddress(text: string): string | undefined {
    return this.extractLabeledValue(text, ['address', 'residential address', 'billing address', 'service address']);
  }

  private extractCompany(text: string, labels: string[]): string | undefined {
    return this.extractLabeledValue(text, labels) || text
      .split(/\r?\n/)
      .map(item => item.trim())
      .find(item => /insurance/i.test(item) && item.length <= 120);
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

  private firstMatch(text: string, regex: RegExp, requiredNearbyWords: string[] = []): string | undefined {
    if (requiredNearbyWords.length > 0 && !requiredNearbyWords.some(word => text.toLowerCase().includes(word))) {
      return undefined;
    }
    const match = text.match(regex);
    return match?.[1] || match?.[0];
  }

  private firstKeyword(lowerText: string, keywords: string[]): string | undefined {
    return keywords.find(keyword => lowerText.includes(keyword));
  }

  private hasAny(lowerText: string, values: string[]): boolean {
    return values.some(value => lowerText.includes(value));
  }

  private hasSection(lowerText: string, section: string): boolean {
    return new RegExp(`(^|\\s|\\n)${section}\\s*(:|\\n|\\r|$)`, 'i').test(lowerText);
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== false && String(value).trim() !== '';
  }

  private normalize(type: string): string {
    return type.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
}
