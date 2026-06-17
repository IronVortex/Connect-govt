export const KYC_DOCUMENT_TYPES = [
  'AADHAAR',
  'PAN',
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
  'BIRTH_CERTIFICATE',
  'DEATH_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
  'MARKS_CARD',
  'SSLC_MARKS',
  'PUC_MARKS',
  'DEGREE_CERTIFICATE',
  'TRANSFER_CERTIFICATE',
  'STUDY_CERTIFICATE',
  'RATION_CARD',
  'ELECTRICITY_BILL',
  'WATER_BILL',
  'GAS_BILL',
  'PROPERTY_TAX_RECEIPT',
  'ADDRESS_PROOF',
  'SALARY_SLIP',
  'BANK_PASSBOOK',
  'BANK_STATEMENT',
  'INCOME_CERTIFICATE',
  'CASTE_CERTIFICATE',
  'DOMICILE_CERTIFICATE',
  'RC_BOOK',
  'VEHICLE_INSURANCE',
  'POLLUTION_CERTIFICATE',
  'INSURANCE_CERTIFICATE',
  'HEALTH_INSURANCE_CARD',
  'VACCINATION_RECORD',
  'INVOICE',
  'PASSPORT_PHOTO',
  'RESUME',
  'SUPPORTING_DOCUMENT',
  'UTILITY_BILL',
  'UNKNOWN',
] as const;

export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export const DOCUMENT_CATEGORIES = [
  'IDENTITY',
  'STUDENT',
  'CIVIL',
  'FINANCIAL',
  'ADDRESS',
  'HEALTH',
  'VEHICLE',
  'IMAGE',
  'GENERIC',
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];

export type VerificationStatus = 'VERIFIED' | 'REVIEW_REQUIRED' | 'REJECTED' | 'UNKNOWN';

/** @deprecated Use VerificationStatus */
export type DetectionStatus = VerificationStatus;

export const NO_TEXT_FOUND = 'NO_TEXT_FOUND';

/** Confidence thresholds on 0–100 scale */
export const CONFIDENCE_THRESHOLDS = {
  STRONG_MATCH: 85,
  REVIEW_REQUIRED: 70,
} as const;

export const DOCUMENT_TYPE_CATEGORIES: Record<KycDocumentType, DocumentCategory> = {
  AADHAAR: 'IDENTITY',
  PAN: 'IDENTITY',
  PASSPORT: 'IDENTITY',
  DRIVING_LICENSE: 'IDENTITY',
  VOTER_ID: 'IDENTITY',
  MARKS_CARD: 'STUDENT',
  SSLC_MARKS: 'STUDENT',
  PUC_MARKS: 'STUDENT',
  DEGREE_CERTIFICATE: 'STUDENT',
  TRANSFER_CERTIFICATE: 'STUDENT',
  STUDY_CERTIFICATE: 'STUDENT',
  BIRTH_CERTIFICATE: 'CIVIL',
  DEATH_CERTIFICATE: 'CIVIL',
  MARRIAGE_CERTIFICATE: 'CIVIL',
  INCOME_CERTIFICATE: 'CIVIL',
  CASTE_CERTIFICATE: 'CIVIL',
  DOMICILE_CERTIFICATE: 'CIVIL',
  BANK_PASSBOOK: 'FINANCIAL',
  BANK_STATEMENT: 'FINANCIAL',
  SALARY_SLIP: 'FINANCIAL',
  ELECTRICITY_BILL: 'ADDRESS',
  WATER_BILL: 'ADDRESS',
  GAS_BILL: 'ADDRESS',
  PROPERTY_TAX_RECEIPT: 'ADDRESS',
  ADDRESS_PROOF: 'ADDRESS',
  RATION_CARD: 'ADDRESS',
  VACCINATION_RECORD: 'HEALTH',
  INSURANCE_CERTIFICATE: 'HEALTH',
  HEALTH_INSURANCE_CARD: 'HEALTH',
  RC_BOOK: 'VEHICLE',
  VEHICLE_INSURANCE: 'VEHICLE',
  POLLUTION_CERTIFICATE: 'VEHICLE',
  INVOICE: 'VEHICLE',
  PASSPORT_PHOTO: 'IMAGE',
  RESUME: 'GENERIC',
  SUPPORTING_DOCUMENT: 'GENERIC',
  UTILITY_BILL: 'ADDRESS',
  UNKNOWN: 'GENERIC',
};

export interface ExtractedDocumentData {
  name?: string;
  dob?: string;
  idNumber?: string;
  gender?: string;
  nationality?: string;
  expiryDate?: string;
  studentName?: string;
  registerNumber?: string;
  institutionName?: string;
  semester?: string;
  subjects?: string[];
  marks?: Record<string, string>;
  cgpa?: string;
  sgpa?: string;
  registrationNumber?: string;
  applicantName?: string;
  incomeValue?: string;
  issuingAuthority?: string;
  address?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  branch?: string;
  beneficiaryName?: string;
  vaccineDetails?: string;
  vaccineDates?: string[];
  policyNumber?: string;
  policyHolderName?: string;
  validity?: string;
  dealerName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  productDetails?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: string[];
  hasRequiredIdentifiers?: boolean;
  isStructureValid?: boolean;
  hasAllRequiredFields?: boolean;
  /** @deprecated */
  isValid?: boolean;
  /** @deprecated */
  confidence?: number;
  /** @deprecated */
  missingFields?: string[];
  /** @deprecated */
  reasons?: string[];
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrLine {
  text: string;
  confidence: number;
  blocks: OcrBlock[];
}

export interface OcrPage {
  pageNumber: number;
  text: string;
  confidence: number;
  lines: OcrLine[];
  blocks: OcrBlock[];
}

export interface OcrExtractionResult {
  text: string;
  confidence: number;
  pages: OcrPage[];
  blocks: OcrBlock[];
  lines: OcrLine[];
  qualityIssues: string[];
  imageProperties: {
    width?: number;
    height?: number;
    aspect?: number;
  };
  /** @deprecated */
  ocrConfidence?: number;
}

export interface VisionClassificationResult {
  documentType: KycDocumentType;
  confidence: number;
  category: DocumentCategory;
  reasoning: string;
  detectedFeatures: string[];
  matchesExpectedType: boolean;
}

export interface DocumentVerificationResult {
  documentType: KycDocumentType;
  documentTypeLabel: string;
  confidence: number;
  category: DocumentCategory;
  matchesExpectedType: boolean;
  reasoning: string;
  detectedFeatures: string[];
  extractedData: ExtractedDocumentData;
  extractedFields: Record<string, unknown>;
  validation: ValidationResult;
  ocr: {
    text: string;
    confidence: number;
    qualityIssues: string[];
    pageCount: number;
  };
  status: VerificationStatus;
  verified: boolean;
  reasons: string[];
}

/** Per-stage wall-clock times in milliseconds (included in non-production responses). */
export interface PipelineTimings {
  preprocess: number;
  classification: number;
  ocr: number;
  validation: number;
  total: number;
}

export interface DocumentIntelligenceResponse {
  documentType: KycDocumentType;
  extractedData: ExtractedDocumentData;
  validation: ValidationResult;
  extractedText: string;
  verification?: DocumentVerificationResult;
  /** Only populated in non-production environments */
  timings?: PipelineTimings;
}

export interface LegacyAnalysisResult {
  detectedType: string;
  documentType: string;
  /** Enum key for database storage (e.g., "PASSPORT_PHOTO") */
  detectedTypeEnum?: KycDocumentType;
  verified: boolean;
  status: VerificationStatus;
  confidence: number;
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  reason?: string;
  extractedText: string;
  reasons: string[];
  validationIssues?: string[];
  detectedFeatures?: string[];
  matchesExpectedType?: boolean;
  ocrQualityIssues?: string[];
  /** Stage timings (ms) — only included outside production */
  timings?: PipelineTimings;
}

export interface DetectionCandidate {
  documentType: KycDocumentType;
  confidence: number;
  score: number;
  status: VerificationStatus;
  matchSignals: string[];
}

export const DOCUMENT_TYPE_LABELS: Record<KycDocumentType, string> = {
  AADHAAR: 'Aadhaar Card',
  PAN: 'PAN Card',
  PASSPORT: 'Passport',
  DRIVING_LICENSE: 'Driving License',
  VOTER_ID: 'Voter ID',
  BIRTH_CERTIFICATE: 'Birth Certificate',
  DEATH_CERTIFICATE: 'Death Certificate',
  MARRIAGE_CERTIFICATE: 'Marriage Certificate',
  MARKS_CARD: 'Marks Card',
  SSLC_MARKS: 'SSLC / 10th Marks Card',
  PUC_MARKS: 'PUC / 12th Marks Card',
  DEGREE_CERTIFICATE: 'Degree Certificate',
  TRANSFER_CERTIFICATE: 'Transfer Certificate',
  STUDY_CERTIFICATE: 'Study Certificate',
  RATION_CARD: 'Ration Card',
  ELECTRICITY_BILL: 'Electricity Bill',
  WATER_BILL: 'Water Bill',
  GAS_BILL: 'Gas Connection Bill',
  PROPERTY_TAX_RECEIPT: 'Property Tax Receipt',
  ADDRESS_PROOF: 'Address Proof',
  SALARY_SLIP: 'Salary Slip',
  BANK_PASSBOOK: 'Bank Passbook',
  BANK_STATEMENT: 'Bank Statement',
  INCOME_CERTIFICATE: 'Income Certificate',
  CASTE_CERTIFICATE: 'Caste Certificate',
  DOMICILE_CERTIFICATE: 'Domicile Certificate',
  RC_BOOK: 'RC Book / Registration Certificate',
  VEHICLE_INSURANCE: 'Vehicle Insurance Certificate',
  POLLUTION_CERTIFICATE: 'Pollution Certificate (PUC)',
  INSURANCE_CERTIFICATE: 'Insurance Certificate',
  HEALTH_INSURANCE_CARD: 'Health Insurance Card',
  VACCINATION_RECORD: 'Previous Vaccination Record',
  INVOICE: 'Invoice / Bill of Sale',
  PASSPORT_PHOTO: 'Passport Size Photo',
  RESUME: 'Resume / CV',
  SUPPORTING_DOCUMENT: 'Other Supporting Document',
  UTILITY_BILL: 'Utility Bill',
  UNKNOWN: 'Unknown',
};

export const LABEL_TO_KYC_TYPE: Record<string, KycDocumentType> = {
  aadhaar: 'AADHAAR',
  aadhar: 'AADHAAR',
  aadhaarcard: 'AADHAAR',
  aadharcard: 'AADHAAR',
  pan: 'PAN',
  pancard: 'PAN',
  passport: 'PASSPORT',
  drivinglicense: 'DRIVING_LICENSE',
  drivinglicence: 'DRIVING_LICENSE',
  driverslicense: 'DRIVING_LICENSE',
  voterid: 'VOTER_ID',
  epic: 'VOTER_ID',
  birthcertificate: 'BIRTH_CERTIFICATE',
  deathcertificate: 'DEATH_CERTIFICATE',
  marriagecertificate: 'MARRIAGE_CERTIFICATE',
  markscard: 'MARKS_CARD',
  sslc: 'SSLC_MARKS',
  sslc10thmarkscard: 'SSLC_MARKS',
  sslc10thmarks: 'SSLC_MARKS',
  puc: 'PUC_MARKS',
  puc12thmarkscard: 'PUC_MARKS',
  puc12thmarks: 'PUC_MARKS',
  degreecertificate: 'DEGREE_CERTIFICATE',
  transfercertificate: 'TRANSFER_CERTIFICATE',
  studycertificate: 'STUDY_CERTIFICATE',
  rationcard: 'RATION_CARD',
  electricitybill: 'ELECTRICITY_BILL',
  waterbill: 'WATER_BILL',
  gasbill: 'GAS_BILL',
  gasconnectionbill: 'GAS_BILL',
  propertytaxreceipt: 'PROPERTY_TAX_RECEIPT',
  addressproof: 'ADDRESS_PROOF',
  proofofaddress: 'ADDRESS_PROOF',
  salaryslip: 'SALARY_SLIP',
  payslip: 'SALARY_SLIP',
  bankpassbook: 'BANK_PASSBOOK',
  bankstatement: 'BANK_STATEMENT',
  bankpassbookbankstatement: 'BANK_STATEMENT',
  incomecertificate: 'INCOME_CERTIFICATE',
  castecertificate: 'CASTE_CERTIFICATE',
  domicilecertificate: 'DOMICILE_CERTIFICATE',
  rcbook: 'RC_BOOK',
  registrationcertificate: 'RC_BOOK',
  vehicleregistration: 'RC_BOOK',
  vehicleinsurance: 'VEHICLE_INSURANCE',
  vehicleinsurancecertificate: 'VEHICLE_INSURANCE',
  pollutioncertificate: 'POLLUTION_CERTIFICATE',
  pollutionundercontrol: 'POLLUTION_CERTIFICATE',
  insurance: 'INSURANCE_CERTIFICATE',
  insurancecertificate: 'INSURANCE_CERTIFICATE',
  healthinsurancecard: 'HEALTH_INSURANCE_CARD',
  vaccinationrecord: 'VACCINATION_RECORD',
  previousvaccinationrecord: 'VACCINATION_RECORD',
  invoice: 'INVOICE',
  billofsale: 'INVOICE',
  invoicebillofsale: 'INVOICE',
  passportphoto: 'PASSPORT_PHOTO',
  passportsizephoto: 'PASSPORT_PHOTO',
  photo: 'PASSPORT_PHOTO',
  resume: 'RESUME',
  cv: 'RESUME',
  ageproof: 'BIRTH_CERTIFICATE',
  utilitybill: 'UTILITY_BILL',
  othersupportingdocument: 'SUPPORTING_DOCUMENT',
  supportingdocument: 'SUPPORTING_DOCUMENT',
  unknown: 'UNKNOWN',
};

/** Document types that are considered equivalent for expected-type matching */
export const DOCUMENT_TYPE_ALIASES: Partial<Record<KycDocumentType, KycDocumentType[]>> = {
  MARKS_CARD: ['SSLC_MARKS', 'PUC_MARKS', 'DEGREE_CERTIFICATE'],
  SSLC_MARKS: ['MARKS_CARD', 'PUC_MARKS'],
  PUC_MARKS: ['MARKS_CARD', 'SSLC_MARKS'],
  INSURANCE_CERTIFICATE: ['HEALTH_INSURANCE_CARD', 'VEHICLE_INSURANCE'],
  HEALTH_INSURANCE_CARD: ['INSURANCE_CERTIFICATE'],
  VEHICLE_INSURANCE: ['INSURANCE_CERTIFICATE'],
  BANK_PASSBOOK: ['BANK_STATEMENT'],
  BANK_STATEMENT: ['BANK_PASSBOOK'],
  UTILITY_BILL: ['ELECTRICITY_BILL', 'WATER_BILL', 'GAS_BILL', 'ADDRESS_PROOF', 'PROPERTY_TAX_RECEIPT'],
  ELECTRICITY_BILL: ['UTILITY_BILL', 'ADDRESS_PROOF'],
  WATER_BILL: ['UTILITY_BILL', 'ADDRESS_PROOF'],
  GAS_BILL: ['UTILITY_BILL', 'ADDRESS_PROOF'],
  ADDRESS_PROOF: ['UTILITY_BILL', 'ELECTRICITY_BILL', 'WATER_BILL', 'GAS_BILL', 'PROPERTY_TAX_RECEIPT'],
};

export function normalizeDocumentType(input?: string): KycDocumentType | undefined {
  if (!input) return undefined;
  const normalized = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (LABEL_TO_KYC_TYPE[normalized]) return LABEL_TO_KYC_TYPE[normalized];
  const match = (Object.entries(DOCUMENT_TYPE_LABELS) as Array<[KycDocumentType, string]>).find(
    ([, label]) => label.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized,
  );
  return match?.[0];
}

export function typesMatchExpected(
  detected: KycDocumentType,
  expected?: KycDocumentType,
): boolean {
  if (!expected || detected === 'UNKNOWN') return false;
  if (detected === expected) return true;
  const expectedAliases = DOCUMENT_TYPE_ALIASES[expected] || [];
  const detectedAliases = DOCUMENT_TYPE_ALIASES[detected] || [];
  return expectedAliases.includes(detected) || detectedAliases.includes(expected);
}

export function applyConfidenceThreshold(confidence: number): KycDocumentType | 'STRONG' | 'REVIEW' | 'UNKNOWN_LEVEL' {
  if (confidence >= CONFIDENCE_THRESHOLDS.STRONG_MATCH) return 'STRONG';
  if (confidence >= CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) return 'REVIEW';
  return 'UNKNOWN_LEVEL';
}
