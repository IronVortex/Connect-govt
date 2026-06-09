import { KycDocumentType } from './types/document-intelligence.types';

export interface WeightedSignal {
  value: string;
  weight: number;
}

export interface WeightedPattern {
  regex: RegExp;
  weight: number;
  label?: string;
}

export interface DocumentPatternDefinition {
  type: KycDocumentType;
  keywords: WeightedSignal[];
  authorities?: WeightedSignal[];
  phrases: WeightedSignal[];
  patterns: WeightedPattern[];
  negativeKeywords?: WeightedSignal[];
  maxScore: number;
  minRawScore: number;
}

export const DOCUMENT_PATTERN_DEFINITIONS: DocumentPatternDefinition[] = [
  {
    type: 'AADHAAR',
    keywords: [
      { value: 'aadhaar', weight: 12 },
      { value: 'aadhar', weight: 12 },
      { value: 'aadhaar number', weight: 15 },
      { value: 'enrollment', weight: 8 },
      { value: 'enrolment', weight: 8 },
    ],
    authorities: [
      { value: 'unique identification authority of india', weight: 20 },
      { value: 'uidai', weight: 18 },
      { value: 'government of india', weight: 10 },
    ],
    phrases: [
      { value: 'your aadhaar no', weight: 14 },
      { value: 'aadhaar is proof of identity', weight: 12 },
    ],
    patterns: [
      { regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/, weight: 22, label: 'aadhaar-number' },
      { regex: /vid\s*[:\-]?\s*\d{4}/i, weight: 10, label: 'virtual-id' },
    ],
    negativeKeywords: [
      { value: 'permanent account number', weight: 15 },
      { value: 'income tax', weight: 12 },
      { value: 'passport no', weight: 10 },
    ],
    maxScore: 95,
    minRawScore: 28,
  },
  {
    type: 'PAN',
    keywords: [
      { value: 'permanent account number', weight: 20 },
      { value: 'pan card', weight: 15 },
      { value: 'pan number', weight: 15 },
    ],
    authorities: [
      { value: 'income tax department', weight: 22 },
      { value: 'central board of direct taxes', weight: 18 },
    ],
    phrases: [
      { value: 'income tax permanent account number', weight: 16 },
    ],
    patterns: [
      { regex: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/, weight: 25, label: 'pan-number' },
    ],
    negativeKeywords: [
      { value: 'aadhaar', weight: 15 },
      { value: 'uidai', weight: 12 },
      { value: 'election commission', weight: 10 },
    ],
    maxScore: 90,
    minRawScore: 30,
  },
  {
    type: 'PASSPORT',
    keywords: [
      { value: 'passport', weight: 15 },
      { value: 'passport number', weight: 14 },
      { value: 'nationality', weight: 8 },
    ],
    authorities: [
      { value: 'ministry of external affairs', weight: 22 },
      { value: 'republic of india', weight: 16 },
    ],
    phrases: [
      { value: 'place of issue', weight: 10 },
      { value: 'date of expiry', weight: 10 },
    ],
    patterns: [
      { regex: /\b[A-Z][0-9]{7}\b/, weight: 18, label: 'passport-number' },
      { regex: /type\s*[:\-]?\s*p\b/i, weight: 8, label: 'passport-type' },
    ],
    negativeKeywords: [
      { value: 'driving licen', weight: 12 },
      { value: 'aadhaar', weight: 10 },
    ],
    maxScore: 90,
    minRawScore: 28,
  },
  {
    type: 'DRIVING_LICENSE',
    keywords: [
      { value: 'driving license', weight: 18 },
      { value: 'driving licence', weight: 18 },
      { value: 'licence number', weight: 12 },
      { value: 'license number', weight: 12 },
      { value: 'valid till', weight: 8 },
    ],
    authorities: [
      { value: 'transport department', weight: 16 },
      { value: 'regional transport office', weight: 16 },
      { value: 'rto', weight: 12 },
      { value: 'motor vehicles', weight: 12 },
    ],
    phrases: [
      { value: 'dl no', weight: 14 },
      { value: 'class of vehicle', weight: 12 },
      { value: 'date of issue', weight: 8 },
    ],
    patterns: [
      { regex: /\b[A-Z]{2}[0-9]{2}\s?[0-9]{11,13}\b/, weight: 20, label: 'dl-number' },
      { regex: /driving\s*licen[cs]e\s*no/i, weight: 14, label: 'dl-label' },
    ],
    negativeKeywords: [
      { value: 'registration certificate', weight: 14 },
      { value: 'passport', weight: 10 },
    ],
    maxScore: 95,
    minRawScore: 30,
  },
  {
    type: 'VOTER_ID',
    keywords: [
      { value: 'voter id', weight: 16 },
      { value: 'elector photo identity card', weight: 18 },
      { value: 'epic', weight: 14 },
      { value: 'electors photo identity', weight: 16 },
    ],
    authorities: [
      { value: 'election commission of india', weight: 22 },
      { value: 'chief electoral officer', weight: 14 },
    ],
    phrases: [
      { value: 'epic no', weight: 14 },
      { value: 'assembly constituency', weight: 10 },
    ],
    patterns: [
      { regex: /\b[A-Z]{3}[0-9]{7}\b/, weight: 20, label: 'epic-number' },
    ],
    negativeKeywords: [
      { value: 'aadhaar', weight: 10 },
      { value: 'pan card', weight: 10 },
    ],
    maxScore: 90,
    minRawScore: 28,
  },
  {
    type: 'BIRTH_CERTIFICATE',
    keywords: [
      { value: 'birth certificate', weight: 22 },
      { value: 'certificate of birth', weight: 20 },
      { value: 'date of birth', weight: 10 },
    ],
    authorities: [
      { value: 'registrar of births', weight: 18 },
      { value: 'municipal corporation', weight: 14 },
      { value: 'gram panchayat', weight: 12 },
      { value: 'births and deaths', weight: 14 },
    ],
    phrases: [
      { value: 'registration number', weight: 10 },
      { value: 'place of birth', weight: 10 },
      { value: 'name of child', weight: 10 },
    ],
    patterns: [
      { regex: /birth\s*reg(?:istration)?\s*(?:no|number)/i, weight: 14, label: 'birth-reg' },
    ],
    negativeKeywords: [
      { value: 'death certificate', weight: 18 },
      { value: 'marriage certificate', weight: 14 },
    ],
    maxScore: 90,
    minRawScore: 26,
  },
  {
    type: 'DEATH_CERTIFICATE',
    keywords: [
      { value: 'death certificate', weight: 22 },
      { value: 'certificate of death', weight: 20 },
      { value: 'date of death', weight: 12 },
    ],
    authorities: [
      { value: 'registrar of deaths', weight: 18 },
      { value: 'municipal corporation', weight: 12 },
      { value: 'births and deaths', weight: 14 },
    ],
    phrases: [
      { value: 'cause of death', weight: 12 },
      { value: 'place of death', weight: 10 },
    ],
    patterns: [
      { regex: /death\s*reg(?:istration)?\s*(?:no|number)/i, weight: 14, label: 'death-reg' },
    ],
    negativeKeywords: [
      { value: 'birth certificate', weight: 18 },
    ],
    maxScore: 85,
    minRawScore: 26,
  },
  {
    type: 'MARRIAGE_CERTIFICATE',
    keywords: [
      { value: 'marriage certificate', weight: 22 },
      { value: 'certificate of marriage', weight: 20 },
      { value: 'date of marriage', weight: 12 },
    ],
    authorities: [
      { value: 'registrar of marriages', weight: 18 },
      { value: 'marriage registrar', weight: 16 },
    ],
    phrases: [
      { value: 'bridegroom', weight: 10 },
      { value: 'bride', weight: 10 },
      { value: 'solemnized', weight: 10 },
    ],
    patterns: [
      { regex: /marriage\s*reg(?:istration)?\s*(?:no|number)/i, weight: 14, label: 'marriage-reg' },
    ],
    maxScore: 85,
    minRawScore: 26,
  },
  {
    type: 'SSLC_MARKS',
    keywords: [
      { value: 'sslc', weight: 18 },
      { value: '10th standard', weight: 14 },
      { value: 'tenth standard', weight: 14 },
      { value: 'secondary school leaving', weight: 16 },
      { value: 'marks card', weight: 12 },
      { value: 'marksheet', weight: 12 },
    ],
    authorities: [
      { value: 'karnataka secondary education', weight: 16 },
      { value: 'board of secondary education', weight: 14 },
      { value: 'state board', weight: 10 },
    ],
    phrases: [
      { value: 'register number', weight: 10 },
      { value: 'total marks', weight: 10 },
      { value: 'grade obtained', weight: 8 },
    ],
    patterns: [
      { regex: /s\.?s\.?l\.?c/i, weight: 14, label: 'sslc-abbr' },
      { regex: /\b10\s*(?:th|th\s*std)\b/i, weight: 12, label: '10th' },
    ],
    negativeKeywords: [
      { value: '12th', weight: 12 },
      { value: 'pre-university', weight: 12 },
      { value: 'degree', weight: 10 },
    ],
    maxScore: 85,
    minRawScore: 24,
  },
  {
    type: 'PUC_MARKS',
    keywords: [
      { value: 'pre-university', weight: 16 },
      { value: 'pre university', weight: 16 },
      { value: '12th standard', weight: 14 },
      { value: 'twelfth standard', weight: 14 },
      { value: 'puc marks', weight: 18 },
      { value: 'ii puc', weight: 16 },
    ],
    authorities: [
      { value: 'department of pre-university education', weight: 18 },
      { value: 'board of intermediate', weight: 14 },
    ],
    phrases: [
      { value: 'combination of subjects', weight: 10 },
      { value: 'higher secondary', weight: 12 },
    ],
    patterns: [
      { regex: /\b12\s*(?:th|th\s*std)\b/i, weight: 12, label: '12th' },
      { regex: /\bp\.?u\.?c\b/i, weight: 10, label: 'puc-abbr' },
    ],
    negativeKeywords: [
      { value: 'pollution under control', weight: 16 },
      { value: 'emission', weight: 12 },
      { value: 'vehicle', weight: 10 },
    ],
    maxScore: 85,
    minRawScore: 24,
  },
  {
    type: 'DEGREE_CERTIFICATE',
    keywords: [
      { value: 'degree certificate', weight: 20 },
      { value: 'bachelor of', weight: 14 },
      { value: 'master of', weight: 14 },
      { value: 'university', weight: 10 },
      { value: 'convocation', weight: 12 },
    ],
    authorities: [
      { value: 'visvesvaraya technological university', weight: 14 },
      { value: 'bangalore university', weight: 12 },
    ],
    phrases: [
      { value: 'has been awarded', weight: 12 },
      { value: 'degree of', weight: 12 },
      { value: 'class obtained', weight: 8 },
    ],
    patterns: [
      { regex: /\bB\.?(?:Tech|A|Sc|Com|E|Arch)\b/i, weight: 12, label: 'degree-abbr' },
      { regex: /\bM\.?(?:Tech|A|Sc|Com|E)\b/i, weight: 12, label: 'masters-abbr' },
    ],
    negativeKeywords: [
      { value: 'transfer certificate', weight: 14 },
      { value: 'study certificate', weight: 12 },
    ],
    maxScore: 85,
    minRawScore: 24,
  },
  {
    type: 'TRANSFER_CERTIFICATE',
    keywords: [
      { value: 'transfer certificate', weight: 22 },
      { value: 'school leaving certificate', weight: 16 },
      { value: 'tc no', weight: 12 },
    ],
    authorities: [
      { value: 'head of institution', weight: 10 },
    ],
    phrases: [
      { value: 'left the school', weight: 12 },
      { value: 'conduct and character', weight: 10 },
      { value: 'last class studied', weight: 10 },
    ],
    patterns: [
      { regex: /transfer\s*cert(?:ificate)?\s*(?:no|number)/i, weight: 14, label: 'tc-number' },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'STUDY_CERTIFICATE',
    keywords: [
      { value: 'study certificate', weight: 22 },
      { value: 'bonafide certificate', weight: 18 },
      { value: 'bona fide', weight: 16 },
      { value: 'studying in', weight: 12 },
    ],
    phrases: [
      { value: 'is a student of', weight: 12 },
      { value: 'is studying', weight: 10 },
      { value: 'course of study', weight: 10 },
    ],
    patterns: [],
    maxScore: 75,
    minRawScore: 20,
  },
  {
    type: 'RATION_CARD',
    keywords: [
      { value: 'ration card', weight: 22 },
      { value: 'food and civil supplies', weight: 16 },
      { value: 'family card', weight: 12 },
    ],
    authorities: [
      { value: 'department of food', weight: 14 },
      { value: 'civil supplies', weight: 14 },
    ],
    phrases: [
      { value: 'card number', weight: 10 },
      { value: 'head of family', weight: 10 },
    ],
    patterns: [
      { regex: /ration\s*card\s*(?:no|number)/i, weight: 14, label: 'ration-no' },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'ELECTRICITY_BILL',
    keywords: [
      { value: 'electricity bill', weight: 20 },
      { value: 'electric bill', weight: 18 },
      { value: 'power bill', weight: 16 },
      { value: 'energy bill', weight: 14 },
      { value: 'bescom', weight: 16 },
      { value: 'mseb', weight: 14 },
    ],
    authorities: [
      { value: 'electricity supply', weight: 14 },
      { value: 'power distribution', weight: 12 },
    ],
    phrases: [
      { value: 'consumer number', weight: 12 },
      { value: 'billing period', weight: 10 },
      { value: 'units consumed', weight: 12 },
      { value: 'meter reading', weight: 10 },
    ],
    patterns: [
      { regex: /rr\s*no|rr\s*number/i, weight: 10, label: 'rr-number' },
    ],
    negativeKeywords: [
      { value: 'water bill', weight: 14 },
      { value: 'gas bill', weight: 12 },
    ],
    maxScore: 85,
    minRawScore: 22,
  },
  {
    type: 'WATER_BILL',
    keywords: [
      { value: 'water bill', weight: 20 },
      { value: 'water supply', weight: 16 },
      { value: 'bwssb', weight: 16 },
    ],
    authorities: [
      { value: 'water board', weight: 14 },
      { value: 'jal board', weight: 14 },
    ],
    phrases: [
      { value: 'water charges', weight: 12 },
      { value: 'connection number', weight: 10 },
    ],
    patterns: [],
    negativeKeywords: [
      { value: 'electricity', weight: 14 },
      { value: 'gas bill', weight: 12 },
    ],
    maxScore: 80,
    minRawScore: 20,
  },
  {
    type: 'GAS_BILL',
    keywords: [
      { value: 'gas bill', weight: 20 },
      { value: 'gas connection', weight: 18 },
      { value: 'lpg', weight: 14 },
      { value: 'piped gas', weight: 14 },
    ],
    authorities: [
      { value: 'indane', weight: 12 },
      { value: 'hp gas', weight: 12 },
      { value: 'bharat gas', weight: 12 },
    ],
    phrases: [
      { value: 'consumer id', weight: 10 },
      { value: 'cylinder', weight: 10 },
    ],
    patterns: [],
    negativeKeywords: [
      { value: 'electricity', weight: 12 },
      { value: 'water bill', weight: 12 },
    ],
    maxScore: 80,
    minRawScore: 20,
  },
  {
    type: 'PROPERTY_TAX_RECEIPT',
    keywords: [
      { value: 'property tax', weight: 22 },
      { value: 'house tax', weight: 16 },
      { value: 'municipal tax', weight: 16 },
    ],
    authorities: [
      { value: 'municipal corporation', weight: 14 },
      { value: 'city corporation', weight: 12 },
      { value: 'nagar palika', weight: 12 },
    ],
    phrases: [
      { value: 'assessment number', weight: 12 },
      { value: 'tax receipt', weight: 14 },
      { value: 'property id', weight: 10 },
    ],
    patterns: [
      { regex: /property\s*tax\s*receipt/i, weight: 16, label: 'tax-receipt' },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'ADDRESS_PROOF',
    keywords: [
      { value: 'address proof', weight: 18 },
      { value: 'proof of address', weight: 18 },
      { value: 'residential address', weight: 12 },
      { value: 'rent agreement', weight: 14 },
      { value: 'lease agreement', weight: 14 },
    ],
    phrases: [
      { value: 'permanent address', weight: 10 },
      { value: 'correspondence address', weight: 10 },
      { value: 'utility bill', weight: 12 },
    ],
    patterns: [],
    maxScore: 70,
    minRawScore: 18,
  },
  {
    type: 'SALARY_SLIP',
    keywords: [
      { value: 'salary slip', weight: 22 },
      { value: 'pay slip', weight: 20 },
      { value: 'payslip', weight: 20 },
      { value: 'net pay', weight: 12 },
      { value: 'gross pay', weight: 12 },
    ],
    phrases: [
      { value: 'basic salary', weight: 12 },
      { value: 'employee code', weight: 10 },
      { value: 'pay period', weight: 10 },
      { value: 'deductions', weight: 8 },
    ],
    patterns: [
      { regex: /salary\s*(?:for|month)/i, weight: 12, label: 'salary-month' },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'BANK_PASSBOOK',
    keywords: [
      { value: 'passbook', weight: 20 },
      { value: 'savings account', weight: 14 },
      { value: 'account passbook', weight: 18 },
    ],
    authorities: [
      { value: 'state bank', weight: 12 },
      { value: 'canara bank', weight: 10 },
      { value: 'hdfc bank', weight: 10 },
      { value: 'icici bank', weight: 10 },
    ],
    phrases: [
      { value: 'account number', weight: 12 },
      { value: 'ifsc', weight: 12 },
      { value: 'customer id', weight: 8 },
    ],
    patterns: [
      { regex: /\bIFSC\s*[:\-]?\s*[A-Z]{4}0[A-Z0-9]{6}\b/i, weight: 16, label: 'ifsc' },
    ],
    negativeKeywords: [
      { value: 'account statement', weight: 12 },
      { value: 'transaction history', weight: 10 },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'BANK_STATEMENT',
    keywords: [
      { value: 'account statement', weight: 22 },
      { value: 'bank statement', weight: 22 },
      { value: 'statement of account', weight: 20 },
      { value: 'transaction', weight: 8 },
    ],
    phrases: [
      { value: 'opening balance', weight: 12 },
      { value: 'closing balance', weight: 12 },
      { value: 'debit', weight: 8 },
      { value: 'credit', weight: 8 },
    ],
    patterns: [
      { regex: /statement\s*(?:period|from|for)/i, weight: 12, label: 'statement-period' },
    ],
    negativeKeywords: [
      { value: 'passbook', weight: 12 },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'INCOME_CERTIFICATE',
    keywords: [
      { value: 'income certificate', weight: 22 },
      { value: 'annual income', weight: 14 },
      { value: 'family income', weight: 14 },
    ],
    authorities: [
      { value: 'tahsildar', weight: 14 },
      { value: 'revenue department', weight: 14 },
    ],
    phrases: [
      { value: 'certified that the annual income', weight: 14 },
      { value: 'income of the family', weight: 12 },
    ],
    patterns: [],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'CASTE_CERTIFICATE',
    keywords: [
      { value: 'caste certificate', weight: 22 },
      { value: 'community certificate', weight: 18 },
      { value: 'scheduled caste', weight: 14 },
      { value: 'scheduled tribe', weight: 14 },
      { value: 'other backward class', weight: 14 },
    ],
    authorities: [
      { value: 'tahsildar', weight: 12 },
      { value: 'social welfare', weight: 12 },
    ],
    phrases: [
      { value: 'belongs to', weight: 10 },
      { value: 'caste', weight: 8 },
    ],
    patterns: [
      { regex: /\b(?:SC|ST|OBC)\b/, weight: 12, label: 'caste-abbr' },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'DOMICILE_CERTIFICATE',
    keywords: [
      { value: 'domicile certificate', weight: 22 },
      { value: 'residence certificate', weight: 16 },
      { value: 'domicile of', weight: 14 },
    ],
    authorities: [
      { value: 'tahsildar', weight: 12 },
      { value: 'revenue department', weight: 12 },
    ],
    phrases: [
      { value: 'permanent resident', weight: 12 },
      { value: 'state of', weight: 8 },
    ],
    patterns: [],
    maxScore: 75,
    minRawScore: 20,
  },
  {
    type: 'RC_BOOK',
    keywords: [
      { value: 'registration certificate', weight: 22 },
      { value: 'rc book', weight: 20 },
      { value: 'certificate of registration', weight: 18 },
      { value: 'vehicle registration', weight: 16 },
    ],
    authorities: [
      { value: 'regional transport office', weight: 14 },
      { value: 'rto', weight: 12 },
      { value: 'motor vehicles department', weight: 14 },
    ],
    phrases: [
      { value: 'registration number', weight: 14 },
      { value: 'chassis number', weight: 12 },
      { value: 'engine number', weight: 12 },
      { value: 'maker', weight: 8 },
    ],
    patterns: [
      { regex: /\b[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}\b/, weight: 18, label: 'vehicle-reg' },
      { regex: /reg(?:istration)?\s*(?:no|number)/i, weight: 12, label: 'reg-no' },
    ],
    negativeKeywords: [
      { value: 'driving licen', weight: 14 },
      { value: 'insurance policy', weight: 10 },
    ],
    maxScore: 90,
    minRawScore: 26,
  },
  {
    type: 'VEHICLE_INSURANCE',
    keywords: [
      { value: 'motor insurance', weight: 18 },
      { value: 'vehicle insurance', weight: 18 },
      { value: 'motor policy', weight: 16 },
      { value: 'insurance certificate', weight: 14 },
    ],
    authorities: [
      { value: 'irdai', weight: 12 },
    ],
    phrases: [
      { value: 'policy number', weight: 14 },
      { value: 'insured vehicle', weight: 12 },
      { value: 'period of insurance', weight: 10 },
      { value: 'registration no', weight: 10 },
    ],
    patterns: [
      { regex: /policy\s*(?:no|number)/i, weight: 12, label: 'policy-no' },
    ],
    negativeKeywords: [
      { value: 'life insurance', weight: 10 },
      { value: 'health insurance', weight: 10 },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'POLLUTION_CERTIFICATE',
    keywords: [
      { value: 'pollution under control', weight: 22 },
      { value: 'pollution certificate', weight: 20 },
      { value: 'emission test', weight: 16 },
      { value: 'puc certificate', weight: 18 },
    ],
    phrases: [
      { value: 'valid upto', weight: 10 },
      { value: 'vehicle tested', weight: 12 },
      { value: 'certificate of pollution', weight: 14 },
    ],
    patterns: [
      { regex: /\bp\.?u\.?c\.?\b/i, weight: 12, label: 'puc-abbr' },
    ],
    negativeKeywords: [
      { value: 'pre-university', weight: 16 },
      { value: '12th standard', weight: 12 },
      { value: 'marks card', weight: 12 },
    ],
    maxScore: 80,
    minRawScore: 22,
  },
  {
    type: 'INSURANCE_CERTIFICATE',
    keywords: [
      { value: 'insurance certificate', weight: 18 },
      { value: 'insurance policy', weight: 16 },
      { value: 'policy holder', weight: 12 },
      { value: 'insured', weight: 10 },
    ],
    phrases: [
      { value: 'policy number', weight: 14 },
      { value: 'sum insured', weight: 12 },
      { value: 'premium', weight: 10 },
      { value: 'insurance company', weight: 12 },
    ],
    patterns: [
      { regex: /policy\s*(?:no|number|#)/i, weight: 12, label: 'policy-no' },
    ],
    negativeKeywords: [
      { value: 'motor insurance', weight: 10 },
      { value: 'vehicle insurance', weight: 10 },
    ],
    maxScore: 75,
    minRawScore: 20,
  },
  {
    type: 'INVOICE',
    keywords: [
      { value: 'invoice', weight: 16 },
      { value: 'bill of sale', weight: 18 },
      { value: 'tax invoice', weight: 16 },
      { value: 'receipt', weight: 8 },
    ],
    phrases: [
      { value: 'invoice number', weight: 14 },
      { value: 'bill number', weight: 12 },
      { value: 'total amount', weight: 10 },
      { value: 'gstin', weight: 12 },
    ],
    patterns: [
      { regex: /invoice\s*(?:no|number|#)/i, weight: 14, label: 'invoice-no' },
      { regex: /(?:rs\.?|inr|₹)\s?[\d,]+(?:\.\d{2})?/i, weight: 8, label: 'amount' },
    ],
    maxScore: 75,
    minRawScore: 18,
  },
  {
    type: 'PASSPORT_PHOTO',
    keywords: [],
    authorities: [],
    phrases: [],
    patterns: [],
    maxScore: 60,
    minRawScore: 15,
  },
  {
    type: 'RESUME',
    keywords: [
      { value: 'resume', weight: 16 },
      { value: 'curriculum vitae', weight: 16 },
      { value: 'cv', weight: 10 },
    ],
    phrases: [
      { value: 'work experience', weight: 14 },
      { value: 'professional experience', weight: 14 },
      { value: 'technical skills', weight: 12 },
      { value: 'education', weight: 10 },
      { value: 'objective', weight: 8 },
    ],
    patterns: [
      { regex: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/, weight: 10, label: 'email' },
      { regex: /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/, weight: 10, label: 'phone' },
      { regex: /(?:^|\s)skills\s*:/i, weight: 10, label: 'skills-section' },
      { regex: /(?:^|\s)experience\s*:/i, weight: 10, label: 'experience-section' },
    ],
    maxScore: 75,
    minRawScore: 20,
  },
];

export const FILENAME_HINTS: Array<{ type: KycDocumentType; hints: string[] }> = [
  { type: 'AADHAAR', hints: ['aadhaar', 'aadhar', 'uidai'] },
  { type: 'PAN', hints: ['pan', 'pancard'] },
  { type: 'PASSPORT', hints: ['passport'] },
  { type: 'DRIVING_LICENSE', hints: ['driving', 'license', 'licence', 'dl'] },
  { type: 'VOTER_ID', hints: ['voter', 'epic'] },
  { type: 'BIRTH_CERTIFICATE', hints: ['birth'] },
  { type: 'DEATH_CERTIFICATE', hints: ['death'] },
  { type: 'MARRIAGE_CERTIFICATE', hints: ['marriage'] },
  { type: 'SSLC_MARKS', hints: ['sslc', '10th', 'tenth'] },
  { type: 'PUC_MARKS', hints: ['puc', '12th', 'twelfth'] },
  { type: 'DEGREE_CERTIFICATE', hints: ['degree'] },
  { type: 'TRANSFER_CERTIFICATE', hints: ['transfer', 'tc'] },
  { type: 'RATION_CARD', hints: ['ration'] },
  { type: 'ELECTRICITY_BILL', hints: ['electricity', 'bescom', 'power'] },
  { type: 'WATER_BILL', hints: ['water'] },
  { type: 'GAS_BILL', hints: ['gas', 'lpg'] },
  { type: 'SALARY_SLIP', hints: ['salary', 'payslip'] },
  { type: 'BANK_PASSBOOK', hints: ['passbook'] },
  { type: 'BANK_STATEMENT', hints: ['statement'] },
  { type: 'RC_BOOK', hints: ['rc', 'registration'] },
  { type: 'RESUME', hints: ['resume', 'cv'] },
  { type: 'INVOICE', hints: ['invoice', 'bill'] },
];
