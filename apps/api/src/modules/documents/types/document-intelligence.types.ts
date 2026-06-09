export const KYC_DOCUMENT_TYPES = [
  'AADHAAR',
  'PAN',
  'PASSPORT',
  'DRIVING_LICENSE',
  'VOTER_ID',
  'BIRTH_CERTIFICATE',
  'DEATH_CERTIFICATE',
  'MARRIAGE_CERTIFICATE',
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
  'INVOICE',
  'PASSPORT_PHOTO',
  'RESUME',
  'UNKNOWN',
] as const;

export type KycDocumentType = (typeof KYC_DOCUMENT_TYPES)[number];

export type DetectionStatus =
  | 'MATCHED'
  | 'MISMATCHED'
  | 'UNKNOWN'
  | 'NEEDS_REVIEW'
  | 'DETECTED';

export const NO_TEXT_FOUND = 'NO_TEXT_FOUND';

export const CONFIDENCE_THRESHOLDS = {
  MATCHED: 0.85,
  NEEDS_REVIEW: 0.5,
} as const;

export interface ExtractedDocumentData {
  name?: string;
  dob?: string;
  idNumber?: string;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  missingFields: string[];
  reasons: string[];
}

export interface DocumentIntelligenceResponse {
  documentType: KycDocumentType;
  extractedData: ExtractedDocumentData;
  validation: ValidationResult;
  extractedText: string;
}

export interface LegacyAnalysisResult {
  detectedType: string;
  documentType: string;
  verified: boolean;
  status: DetectionStatus;
  confidence: number;
  extractedFields: Record<string, unknown>;
  missingFields: string[];
  reason?: string;
  extractedText: string;
  reasons: string[];
}

export interface OcrExtractionResult {
  text: string;
  imageProperties: {
    width?: number;
    height?: number;
    aspect?: number;
  };
  ocrConfidence: number;
}

export interface DetectionCandidate {
  documentType: KycDocumentType;
  confidence: number;
  score: number;
  status: DetectionStatus;
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
  INVOICE: 'Invoice / Bill of Sale',
  PASSPORT_PHOTO: 'Passport Size Photo',
  RESUME: 'Resume / CV',
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
  sslc: 'SSLC_MARKS',
  sslc10thmarkscard: 'SSLC_MARKS',
  sslc10thmarks: 'SSLC_MARKS',
  markscard: 'SSLC_MARKS',
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
  invoice: 'INVOICE',
  billofsale: 'INVOICE',
  invoicebillofsale: 'INVOICE',
  passportphoto: 'PASSPORT_PHOTO',
  passportsizephoto: 'PASSPORT_PHOTO',
  photo: 'PASSPORT_PHOTO',
  resume: 'RESUME',
  cv: 'RESUME',
  unknown: 'UNKNOWN',
};
