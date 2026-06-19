import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import {
  CONFIDENCE_THRESHOLDS,
  DOCUMENT_TYPE_CATEGORIES,
  DOCUMENT_TYPE_LABELS,
  KYC_DOCUMENT_TYPES,
  KycDocumentType,
  normalizeDocumentType,
  typesMatchExpected,
  VisionClassificationResult,
  NO_TEXT_FOUND,
} from './types/document-intelligence.types';
import { PreprocessingService, PreprocessedImage } from './preprocessing.service';

interface LayoutMetrics {
  lineCount: number;
  blockCount: number;
  textDensity: number;
  hasTableStructure: boolean;
  avgBlockHeight: number;
  portraitDominant: boolean;
}

interface VisualFeatures {
  width: number;
  height: number;
  aspect: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isSquareish: boolean;
  colorVariance: number;
  edgeDensity: number;
  layout: LayoutMetrics;
}

const CLASSIFICATION_PROMPT = `You are a document classification expert for an Indian government services portal.
Analyze the document image visually — layout, logos, emblems, tables, forms, portraits, certificates, passbooks.
Do NOT guess from filename. Classify based on visual structure only.

Supported document types (return exactly one):
AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, BIRTH_CERTIFICATE, DEATH_CERTIFICATE,
MARRIAGE_CERTIFICATE, MARKS_CARD, SSLC_MARKS, PUC_MARKS, DEGREE_CERTIFICATE, TRANSFER_CERTIFICATE,
STUDY_CERTIFICATE, RATION_CARD, ELECTRICITY_BILL, WATER_BILL, GAS_BILL, PROPERTY_TAX_RECEIPT,
ADDRESS_PROOF, SALARY_SLIP, BANK_PASSBOOK, BANK_STATEMENT, INCOME_CERTIFICATE, CASTE_CERTIFICATE,
DOMICILE_CERTIFICATE, RC_BOOK, VEHICLE_INSURANCE, POLLUTION_CERTIFICATE, INSURANCE_CERTIFICATE,
HEALTH_INSURANCE_CARD, VACCINATION_RECORD, INVOICE, PASSPORT_PHOTO, RESUME, SUPPORTING_DOCUMENT, UNKNOWN

Rules:
- confidence 0-100 (integer). Use >=85 only for strong visual match.
- If uncertain or poor quality, return UNKNOWN with confidence <70.
- PASSPORT_PHOTO only if image is a portrait photograph with no document layout.
- MARKS_CARD/SSLC_MARKS/PUC_MARKS for academic transcripts with marks tables.
- RESUME for CV layouts with sections like experience/education/skills.

Respond ONLY with valid JSON:
{"documentType":"TYPE","confidence":85,"reasoning":"...","detectedFeatures":["feature1","feature2"]}`;

@Injectable()
export class VisionClassificationService {
  private readonly logger = new Logger(VisionClassificationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly preprocessingService: PreprocessingService,
  ) {}

  async classify(
    buffer: Buffer,
    mimeType?: string,
    expectedType?: string,
    ocrText?: string,
  ): Promise<VisionClassificationResult> {
    const t0 = performance.now();
    const preprocessed = await this.preprocessingService.toClassificationImage(buffer, mimeType);
    const tPreprocess = performance.now();
    this.logger.log(`[CLASSIFICATION] Preprocess: ${Math.round(tPreprocess - t0)}ms`);

    const normalizedExpected = normalizeDocumentType(expectedType);

    // 1. Run local text classification first to check for a highly confident match
    const textClassification = this.classifyByTextContent(ocrText);
    if (textClassification && textClassification.confidence >= 80) {
      this.logger.log(
        `[CLASSIFICATION] High confidence text signal: type=${textClassification.type} confidence=${textClassification.confidence}%`
      );
      const matchesExpectedType = typesMatchExpected(textClassification.type, normalizedExpected);
      return {
        documentType: textClassification.type,
        confidence: textClassification.confidence,
        category: DOCUMENT_TYPE_CATEGORIES[textClassification.type],
        reasoning: this.buildReasoning(textClassification.type, textClassification.features, textClassification.confidence),
        detectedFeatures: textClassification.features,
        matchesExpectedType,
      };
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      try {
        const tAiStart = performance.now();
        const aiResult = await this.classifyWithOpenAI(preprocessed, apiKey, normalizedExpected, ocrText);
        if (aiResult) {
          // If OpenAI returns UNKNOWN but the text classifier has moderate confidence (>= 60), use the text classification instead of UNKNOWN
          if (aiResult.documentType === 'UNKNOWN' && textClassification && textClassification.confidence >= 60) {
            this.logger.log(
              `[CLASSIFICATION] OpenAI returned UNKNOWN but text classifier has moderate confidence (${textClassification.confidence}%). Overriding with ${textClassification.type}`
            );
            const matchesExpectedType = typesMatchExpected(textClassification.type, normalizedExpected);
            return {
              documentType: textClassification.type,
              confidence: textClassification.confidence,
              category: DOCUMENT_TYPE_CATEGORIES[textClassification.type],
              reasoning: this.buildReasoning(textClassification.type, textClassification.features, textClassification.confidence),
              detectedFeatures: textClassification.features,
              matchesExpectedType,
            };
          }
          this.logger.log(
            `[CLASSIFICATION] OpenAI: ${Math.round(performance.now() - tAiStart)}ms` +
            ` — type=${aiResult.documentType} confidence=${aiResult.confidence}`,
          );
          return aiResult;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CLASSIFICATION] OpenAI failed, using local fallback: ${message}`);
      }
    }

    const tLocalStart = performance.now();
    const localResult = await this.classifyLocally(preprocessed, normalizedExpected, mimeType, ocrText);
    this.logger.log(
      `[CLASSIFICATION] Local fallback: ${Math.round(performance.now() - tLocalStart)}ms` +
      ` — type=${localResult.documentType} confidence=${localResult.confidence}`,
    );
    return localResult;
  }

  toDisplayLabel(documentType: KycDocumentType): string {
    return DOCUMENT_TYPE_LABELS[documentType];
  }

  private async classifyWithOpenAI(
    image: PreprocessedImage,
    apiKey: string,
    expectedType?: KycDocumentType,
    ocrText?: string,
  ): Promise<VisionClassificationResult | null> {
    const base64 = image.buffer.toString('base64');
    const expectedHint = expectedType
      ? `\nThe user uploaded this into the "${DOCUMENT_TYPE_LABELS[expectedType]}" slot. Factor this in but do not override clear visual evidence.`
      : '';
    const ocrTextHint = ocrText && ocrText !== 'NO_TEXT_FOUND'
      ? `\nHere is the OCR text extracted from the document. Use it as the PRIMARY signal to verify the document type:\n"""\n${ocrText.slice(0, 4000)}\n"""`
      : '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.configService.get<string>('OPENAI_VISION_MODEL') || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: CLASSIFICATION_PROMPT + expectedHint + ocrTextHint },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${base64}` } },
            ],
          },
        ],
        max_tokens: 400,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as {
      documentType?: string;
      confidence?: number;
      reasoning?: string;
      detectedFeatures?: string[];
    };

    return this.normalizeClassificationResult(
      parsed.documentType,
      parsed.confidence ?? 0,
      parsed.reasoning ?? 'AI vision classification',
      parsed.detectedFeatures ?? [],
      expectedType,
    );
  }

  private classifyByTextContent(
    text?: string,
  ): { type: KycDocumentType; confidence: number; features: string[] } | null {
    if (!text || text === NO_TEXT_FOUND || text.trim().length < 10) {
      return null;
    }

    const cleaned = text.toUpperCase();
    const scores: Record<KycDocumentType, { score: number; features: string[] }> = {} as any;
    for (const t of KYC_DOCUMENT_TYPES) {
      scores[t] = { score: 0, features: [] };
    }

    // AADHAAR
    if (cleaned.includes('UNIQUE IDENTIFICATION') || cleaned.includes('UIDAI')) {
      scores['AADHAAR'].score += 55;
      scores['AADHAAR'].features.push('uidai_keyword');
    }
    if (cleaned.includes('GOVERNMENT OF INDIA') || cleaned.includes('BHARAT SARKAR')) {
      scores['AADHAAR'].score += 40;
      scores['AADHAAR'].features.push('goi_keyword');
    }
    if (cleaned.includes('AADHAAR') || cleaned.includes('AADHAR')) {
      scores['AADHAAR'].score += 50;
      scores['AADHAAR'].features.push('aadhaar_name_keyword');
    }
    if (/\b\d{4}\s\d{4}\s\d{4}\b/.test(text) || /\b\d{12}\b/.test(text)) {
      scores['AADHAAR'].score += 80;
      scores['AADHAAR'].features.push('aadhaar_number_pattern');
    }
    if (/VID\s*:\s*\d/i.test(text) || cleaned.includes('VIRTUAL ID') || cleaned.includes('VID')) {
      scores['AADHAAR'].score += 45;
      scores['AADHAAR'].features.push('aadhaar_vid');
    }
    if (/FEMALE|MALE|महिला|पुरुष/i.test(text)) {
      scores['AADHAAR'].score += 35;
      scores['AADHAAR'].features.push('aadhaar_gender');
    }
    if (/DOB|YOB|BIRTH|YEAR OF BIRTH|जन्म/i.test(text)) {
      scores['AADHAAR'].score += 30;
      scores['AADHAAR'].features.push('aadhaar_dob');
    }
    if (scores['AADHAAR'].features.includes('aadhaar_number_pattern') && 
        (scores['AADHAAR'].features.includes('aadhaar_gender') || scores['AADHAAR'].features.includes('aadhaar_dob'))) {
      scores['AADHAAR'].score += 30;
      scores['AADHAAR'].features.push('aadhaar_combo_boost');
    }

    // PAN
    if (cleaned.includes('INCOME TAX DEPARTMENT') || cleaned.includes('INCOME TAX')) {
      scores['PAN'].score += 60;
      scores['PAN'].features.push('income_tax_keyword');
    }
    if (cleaned.includes('PERMANENT ACCOUNT')) {
      scores['PAN'].score += 50;
      scores['PAN'].features.push('pan_label_keyword');
    }
    if (cleaned.includes('CARD') && (cleaned.includes(' PAN ') || cleaned.includes('PAN CARD'))) {
      scores['PAN'].score += 45;
      scores['PAN'].features.push('pan_card_keyword');
    }
    if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i.test(text)) {
      scores['PAN'].score += 80;
      scores['PAN'].features.push('pan_number_pattern');
    }
    if (cleaned.includes('FATHER') || cleaned.includes("FATHER'S NAME")) {
      scores['PAN'].score += 30;
      scores['PAN'].features.push('pan_father_keyword');
    }
    if (scores['PAN'].features.includes('pan_number_pattern') && 
        (scores['PAN'].features.includes('income_tax_keyword') || scores['PAN'].features.includes('pan_label_keyword'))) {
      scores['PAN'].score += 35;
      scores['PAN'].features.push('pan_combo_boost');
    }

    // PASSPORT
    if ((cleaned.includes('REPUBLIC OF INDIA') || cleaned.includes('BHARAT SARKAR')) && cleaned.includes('PASSPORT')) {
      scores['PASSPORT'].score += 65;
      scores['PASSPORT'].features.push('republic_of_india_passport');
    }
    if (cleaned.includes('PASSPORT') && (cleaned.includes('NUMBER') || cleaned.includes('NO.'))) {
      scores['PASSPORT'].score += 50;
      scores['PASSPORT'].features.push('passport_number_keyword');
    }
    if (/\b[A-Z][0-9]{7}\b/i.test(text)) {
      scores['PASSPORT'].score += 70;
      scores['PASSPORT'].features.push('passport_number_pattern');
    }
    if (cleaned.includes('GIVEN NAMES') || cleaned.includes('SURNAME') || cleaned.includes('NATIONALITY')) {
      scores['PASSPORT'].score += 35;
      scores['PASSPORT'].features.push('passport_fields');
    }
    if (scores['PASSPORT'].features.includes('passport_number_pattern') && 
        (scores['PASSPORT'].features.includes('passport_number_keyword') || scores['PASSPORT'].features.includes('republic_of_india_passport'))) {
      scores['PASSPORT'].score += 30;
      scores['PASSPORT'].features.push('passport_combo_boost');
    }

    // DRIVING_LICENSE
    if (cleaned.includes('DRIVING LICENCE') || cleaned.includes('DRIVING LICENSE')) {
      scores['DRIVING_LICENSE'].score += 65;
      scores['DRIVING_LICENSE'].features.push('driving_license_keyword');
    }
    if (cleaned.includes('DL NO') || cleaned.includes('DL NUMBER') || cleaned.includes('LICENCE NO') || cleaned.includes('LICENSE NO')) {
      scores['DRIVING_LICENSE'].score += 55;
      scores['DRIVING_LICENSE'].features.push('dl_no_keyword');
    }
    if (/\b[A-Z]{2}[0-9]{2}\s?[0-9]{11,13}\b/i.test(text)) {
      scores['DRIVING_LICENSE'].score += 75;
      scores['DRIVING_LICENSE'].features.push('dl_number_pattern');
    }
    if (cleaned.includes('RTO') || cleaned.includes('TRANSPORT') || cleaned.includes('AUTHORISATION') || cleaned.includes('COV')) {
      scores['DRIVING_LICENSE'].score += 40;
      scores['DRIVING_LICENSE'].features.push('dl_rto_keyword');
    }
    if (scores['DRIVING_LICENSE'].features.includes('dl_number_pattern') && 
        (scores['DRIVING_LICENSE'].features.includes('driving_license_keyword') || scores['DRIVING_LICENSE'].features.includes('dl_no_keyword'))) {
      scores['DRIVING_LICENSE'].score += 30;
      scores['DRIVING_LICENSE'].features.push('dl_combo_boost');
    }

    // BANK_PASSBOOK
    if (cleaned.includes('ACCOUNT NUMBER') || cleaned.includes('ACC NO') || cleaned.includes('A/C NO') || cleaned.includes('ACCOUNT NO')) {
      scores['BANK_PASSBOOK'].score += 55;
      scores['BANK_PASSBOOK'].features.push('account_number_keyword');
    }
    if (cleaned.includes('IFSC') || cleaned.includes('IFSC CODE')) {
      scores['BANK_PASSBOOK'].score += 55;
      scores['BANK_PASSBOOK'].features.push('ifsc_code_keyword');
    }
    if (/\b[A-Z]{4}0[A-Z0-9]{6}\b/i.test(text)) {
      scores['BANK_PASSBOOK'].score += 75;
      scores['BANK_PASSBOOK'].features.push('bank_ifsc_pattern');
    }
    if (cleaned.includes('BRANCH') || cleaned.includes('BANK') || cleaned.includes('PASSBOOK')) {
      scores['BANK_PASSBOOK'].score += 40;
      scores['BANK_PASSBOOK'].features.push('bank_keywords');
    }
    if (scores['BANK_PASSBOOK'].features.includes('bank_ifsc_pattern') && 
        (scores['BANK_PASSBOOK'].features.includes('account_number_keyword') || scores['BANK_PASSBOOK'].features.includes('bank_keywords'))) {
      scores['BANK_PASSBOOK'].score += 30;
      scores['BANK_PASSBOOK'].features.push('bank_combo_boost');
    }

    // MARKS_CARD
    if (cleaned.includes('MARKS CARD') || cleaned.includes('MARKSHEET') || cleaned.includes('STATEMENT OF MARKS') || cleaned.includes('SSLC') || cleaned.includes('PUC')) {
      scores['MARKS_CARD'].score += 70;
      scores['MARKS_CARD'].features.push('marks_card_keyword');
    }
    if (cleaned.includes('REGISTER NUMBER') || cleaned.includes('REG. NO') || cleaned.includes('REG NO') || cleaned.includes('ROLL NO') || cleaned.includes('USN') || cleaned.includes('ROLL NUMBER')) {
      scores['MARKS_CARD'].score += 55;
      scores['MARKS_CARD'].features.push('register_number_keyword');
    }
    if (cleaned.includes('SUBJECT') && (cleaned.includes('TOTAL MARKS') || cleaned.includes('MARKS') || cleaned.includes('GRADE') || cleaned.includes('CGPA') || cleaned.includes('SGPA'))) {
      scores['MARKS_CARD'].score += 55;
      scores['MARKS_CARD'].features.push('marks_table_keywords');
    }
    if (scores['MARKS_CARD'].features.includes('marks_card_keyword') && 
        (scores['MARKS_CARD'].features.includes('register_number_keyword') || scores['MARKS_CARD'].features.includes('marks_table_keywords'))) {
      scores['MARKS_CARD'].score += 30;
      scores['MARKS_CARD'].features.push('marks_combo_boost');
    }

    // BIRTH_CERTIFICATE
    if (cleaned.includes('BIRTH CERTIFICATE') || cleaned.includes('CERTIFICATE OF BIRTH')) {
      scores['BIRTH_CERTIFICATE'].score += 75;
      scores['BIRTH_CERTIFICATE'].features.push('birth_certificate_keyword');
    }
    if (cleaned.includes('DATE OF BIRTH') || cleaned.includes('DOB') || cleaned.includes('DATE OF DELIVER') || cleaned.includes('BORN ON')) {
      scores['BIRTH_CERTIFICATE'].score += 50;
      scores['BIRTH_CERTIFICATE'].features.push('dob_keyword');
    }
    if (cleaned.includes('REGISTRATION NUMBER') || cleaned.includes('REG. NO') || cleaned.includes('BIRTH REGISTRATION') || cleaned.includes('REGISTRATION NO')) {
      scores['BIRTH_CERTIFICATE'].score += 50;
      scores['BIRTH_CERTIFICATE'].features.push('birth_reg_keyword');
    }
    if (cleaned.includes('FATHER') || cleaned.includes('MOTHER') || cleaned.includes('PARENT')) {
      scores['BIRTH_CERTIFICATE'].score += 35;
      scores['BIRTH_CERTIFICATE'].features.push('birth_parents_keyword');
    }
    if (scores['BIRTH_CERTIFICATE'].features.includes('birth_certificate_keyword') && 
        (scores['BIRTH_CERTIFICATE'].features.includes('dob_keyword') || scores['BIRTH_CERTIFICATE'].features.includes('birth_reg_keyword'))) {
      scores['BIRTH_CERTIFICATE'].score += 30;
      scores['BIRTH_CERTIFICATE'].features.push('birth_combo_boost');
    }

    const candidates = Object.entries(scores)
      .map(([type, data]) => ({ type: type as KycDocumentType, score: data.score, features: data.features }))
      .filter(c => c.score > 25)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      const runnerUp = candidates[1];
      let confidence = Math.round(Math.min(99, best.score));
      if (runnerUp && runnerUp.score >= best.score * 0.85) {
        confidence = Math.round(confidence * 0.7);
      }
      return { type: best.type, confidence, features: best.features };
    }

    return null;
  }

  private async classifyLocally(
    image: PreprocessedImage,
    expectedType?: KycDocumentType,
    mimeType?: string,
    ocrText?: string,
  ): Promise<VisionClassificationResult> {
    const textResult = this.classifyByTextContent(ocrText);
    const features = await this.extractVisualFeatures(image);
    const scores = this.scoreDocumentTypes(features, mimeType);

    if (textResult) {
      const targetScore = scores.find(s => s.type === textResult.type);
      if (targetScore) {
        targetScore.score += textResult.confidence;
        targetScore.features.push(...textResult.features);
      } else {
        scores.push({
          type: textResult.type,
          score: textResult.confidence,
          features: textResult.features,
        });
      }
    }

    if (expectedType && expectedType !== 'UNKNOWN') {
      const expectedScore = scores.find(s => s.type === expectedType);
      if (expectedScore) {
        expectedScore.score += 15;
        expectedScore.features.push('expected-type-prior');
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    const runnerUp = scores[1];

    let confidence = Math.round(Math.min(99, best.score));
    let documentType = best.type;

    if (runnerUp && runnerUp.score >= best.score * 0.82) {
      confidence = Math.round(confidence * 0.82);
      best.features.push(`ambiguous-with:${runnerUp.type}`);
    }

    if (confidence < CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      documentType = 'UNKNOWN';
      confidence = Math.min(confidence, CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED - 1);
    }

    const matchesExpectedType = typesMatchExpected(documentType, expectedType);

    this.logger.log(
      `[CLASSIFICATION] Local result: type=${documentType}, confidence=${confidence}, ` +
        `features=[${best.features.join(', ')}]`,
    );

    return {
      documentType,
      confidence,
      category: DOCUMENT_TYPE_CATEGORIES[documentType],
      reasoning: this.buildReasoning(documentType, best.features, confidence),
      detectedFeatures: best.features,
      matchesExpectedType,
    };
  }

  private scoreDocumentTypes(
    features: VisualFeatures,
    mimeType?: string,
    ocrText?: string,
  ): Array<{ type: KycDocumentType; score: number; features: string[] }> {
    const results: Array<{ type: KycDocumentType; score: number; features: string[] }> = [];

    for (const type of KYC_DOCUMENT_TYPES) {
      if (type === 'UNKNOWN') continue;
      const { score, features: detected } = this.scoreType(type, features, mimeType, ocrText);
      if (score > 0) {
        results.push({ type, score, features: detected });
      }
    }

    if (results.length === 0) {
      return [{ type: 'UNKNOWN', score: 0, features: ['no-visual-signals'] }];
    }

    return results;
  }

  private scoreType(
    type: KycDocumentType,
    features: VisualFeatures,
    mimeType?: string,
    ocrText?: string,
  ): { score: number; features: string[] } {
    const f: string[] = [];
    let score = 0;
    const { layout, aspect, isPortrait, isLandscape, isSquareish, edgeDensity, colorVariance } =
      features;
    const text = (ocrText ?? '').toLowerCase();

    const contains = (terms: string | string[]) => {
      const list = Array.isArray(terms) ? terms : [terms];
      return list.some(term => text.includes(term));
    };

    const addTextSignal = (terms: string | string[], weight: number, label: string) => {
      if (contains(terms)) {
        score += weight;
        f.push(label);
      }
    };

    switch (type) {
      case 'PASSPORT_PHOTO':
        if (isSquareish && layout.lineCount < 8 && layout.textDensity < 0.15) {
          score += 55;
          f.push('portrait_layout', 'minimal_text');
        }
        if (layout.blockCount < 5 && aspect >= 0.7 && aspect <= 1.4) {
          score += 20;
          f.push('photo_aspect_ratio');
        }
        if (contains(['passport photo', 'portrait', 'photo only'])) {
          score += 20;
          f.push('photo_text_cue');
        }
        if (layout.lineCount > 15) score -= 40;
        break;

      case 'MARKS_CARD':
      case 'SSLC_MARKS':
      case 'PUC_MARKS':
      case 'DEGREE_CERTIFICATE':
        if (layout.hasTableStructure) {
          score += 35;
          f.push('academic_table');
        }
        if (contains(['marks', 'percentage', 'total marks', 'grade', 'subject'])) {
          score += 30;
          f.push('marks_text');
        }
        if (layout.lineCount >= 12) {
          score += 15;
          f.push('structured_text');
        }
        if (isLandscape || aspect > 1.1) {
          score += 12;
          f.push('landscape_document');
        }
        if (isSquareish && layout.lineCount < 8) score -= 35;
        break;

      case 'RESUME':
        if (layout.lineCount >= 20 && !layout.hasTableStructure) {
          score += 35;
          f.push('multi_section_text');
        }
        if (contains(['experience', 'education', 'skills', 'career', 'projects'])) {
          score += 30;
          f.push('resume_keywords');
        }
        if (isPortrait && aspect < 0.85) {
          score += 20;
          f.push('a4_portrait');
        }
        if (mimeType === 'application/pdf' && layout.lineCount >= 15) {
          score += 15;
          f.push('pdf_text_document');
        }
        if (isSquareish && layout.lineCount < 10) score -= 30;
        break;

      case 'BANK_PASSBOOK':
      case 'BANK_STATEMENT':
        if (layout.lineCount >= 10 && layout.avgBlockHeight < 30) {
          score += 30;
          f.push('tabular_rows');
        }
        if (contains(['account no', 'ifsc', 'bank', 'passbook', 'statement'])) {
          score += 25;
          f.push('bank_text');
        }
        if (isPortrait) {
          score += 12;
          f.push('passbook_layout');
        }
        break;

      case 'AADHAAR':
        if (layout.lineCount >= 6 && layout.lineCount <= 40) {
          score += 25;
          f.push('id_card_layout');
        }
        addTextSignal(['aadhaar', 'uidai', 'unique identity number', 'dob', 'address'], 35, 'aadhaar_text');
        if (colorVariance > 25) {
          score += 15;
          f.push('color_document');
        }
        if (isSquareish && layout.lineCount < 5) score -= 40;
        break;

      case 'PAN':
        if (layout.lineCount >= 6 && layout.lineCount <= 40) {
          score += 25;
          f.push('id_card_layout');
        }
        addTextSignal(['permanent account number', 'income tax department', 'pan', 'assessee', 'holder'], 35, 'pan_text');
        if (colorVariance > 25) {
          score += 15;
          f.push('color_document');
        }
        if (isSquareish && layout.lineCount < 5) score -= 40;
        break;

      case 'PASSPORT':
        if (layout.lineCount >= 8 && layout.lineCount <= 35) {
          score += 25;
          f.push('passport_layout');
        }
        addTextSignal(['passport no', 'nationality', 'date of birth', 'place of birth', 'passport'], 35, 'passport_text');
        if (colorVariance > 20) {
          score += 15;
          f.push('color_document');
        }
        break;

      case 'DRIVING_LICENSE':
        if (layout.lineCount >= 8 && layout.lineCount <= 35) {
          score += 25;
          f.push('license_layout');
        }
        addTextSignal(['driving licence', 'driving license', 'dl no', 'valid till', 'date of issue', 'vehicle class'], 35, 'driving_license_text');
        if (isPortrait) {
          score += 10;
          f.push('portrait_license');
        }
        break;

      case 'VOTER_ID':
        if (layout.lineCount >= 8 && layout.lineCount <= 40) {
          score += 25;
          f.push('id_card_layout');
        }
        addTextSignal(['elector', 'voter', 'assembly constituency', 'voting'], 28, 'voter_text');
        break;

      case 'BIRTH_CERTIFICATE':
      case 'INCOME_CERTIFICATE':
      case 'TRANSFER_CERTIFICATE':
        if (layout.lineCount >= 8 && isPortrait) {
          score += 30;
          f.push('certificate_layout');
        }
        addTextSignal(['birth certificate', 'date of birth', 'father', 'mother', 'name of child'], 30, 'certificate_text');
        if (edgeDensity > 0.1) {
          score += 10;
          f.push('border_detected');
        }
        break;

      case 'INSURANCE_CERTIFICATE':
      case 'HEALTH_INSURANCE_CARD':
      case 'VEHICLE_INSURANCE':
        if (layout.lineCount >= 8) {
          score += 25;
          f.push('policy_layout');
        }
        addTextSignal(['insurance', 'policy', 'coverage', 'sum insured'], 25, 'insurance_text');
        break;

      case 'INVOICE':
        if (layout.hasTableStructure || layout.lineCount >= 12) {
          score += 30;
          f.push('invoice_table');
        }
        addTextSignal(['invoice', 'total amount', 'gst', 'tax', 'bill to', 'invoice no'], 20, 'invoice_text');
        break;

      case 'ADDRESS_PROOF':
      case 'ELECTRICITY_BILL':
      case 'WATER_BILL':
      case 'GAS_BILL':
        if (layout.lineCount >= 10) {
          score += 25;
          f.push('utility_bill_layout');
        }
        addTextSignal(['bill', 'consumer', 'account number', 'due date', 'service address'], 18, 'utility_text');
        break;

      case 'VACCINATION_RECORD':
        if (layout.lineCount >= 6) {
          score += 22;
          f.push('medical_record_layout');
        }
        addTextSignal(['vaccination', 'dose', 'batch no', 'name of hospital', 'covid'], 18, 'vaccination_text');
        break;

      default:
        if (layout.lineCount >= 8) {
          score += 15;
          f.push('generic_document');
        }
    }

    return { score: Math.max(0, score), features: f };
  }

  private async extractVisualFeatures(image: PreprocessedImage): Promise<VisualFeatures> {
    const layout = await this.extractLayoutMetrics(image.buffer);
    const stats = await this.getImageStats(image.buffer);

    const aspect = image.aspect;
    return {
      width: image.width,
      height: image.height,
      aspect,
      isPortrait: aspect < 0.85,
      isLandscape: aspect > 1.15,
      isSquareish: aspect >= 0.7 && aspect <= 1.4,
      colorVariance: stats.variance,
      edgeDensity: stats.edgeDensity,
      layout,
    };
  }

  private async extractLayoutMetrics(buffer: Buffer): Promise<LayoutMetrics> {
    try {
      // Fast heuristic layout analysis WITHOUT Tesseract OCR
      // Returns estimated metrics based on image structure analysis
      const metadata = await sharp(buffer).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Cannot read image metadata');
      }

      const { data, info } = await sharp(buffer)
        .grayscale()
        .toBuffer({ resolveWithObject: true });

      const width = info.width;
      const height = info.height;
      const pixelCount = width * height;

      // ── Estimate text density by analyzing dark pixel concentration ──────
      let darkPixels = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] < 128) darkPixels++;
      }
      const textDensity = darkPixels / pixelCount;

      // ── Count horizontal lines (likely text rows) ──────────────────────
      let horizontalLineCount = 0;
      const lineThreshold = Math.floor(width * 0.7); // 70% of width is "a line"
      const rowSample = [];

      // Sample every 4th row to avoid redundant counting
      for (let y = 0; y < height; y += 4) {
        let darkInRow = 0;
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x);
          if (data[idx] < 128) darkInRow++;
        }
        if (darkInRow >= lineThreshold) {
          horizontalLineCount++;
          rowSample.push(y);
        }
      }

      // ── Estimate block count by detecting row clusters ───────────────
      // Cluster consecutive rows into "blocks"
      let blockCount = 0;
      let inBlock = false;
      for (let i = 0; i < rowSample.length; i++) {
        const isConsecutive = i === 0 || rowSample[i] - rowSample[i - 1] <= 12;
        if (isConsecutive && !inBlock) {
          blockCount++;
          inBlock = true;
        } else if (!isConsecutive && inBlock) {
          inBlock = false;
        }
      }
      blockCount = Math.max(1, blockCount); // At least 1 block

      // ── Estimate average block height ──────────────────────────────
      const avgBlockHeight = blockCount > 0 ? height / blockCount : height;

      // ── Detect table structure: aligned rows with consistent spacing ───
      const hasTableStructure =
        blockCount >= 8 &&
        horizontalLineCount >= 12 &&
        // Check if row spacing is consistent (table-like)
        rowSample.length >= 4 &&
        Math.abs(rowSample[1] - rowSample[0] - (rowSample[2] - rowSample[1])) < 8;

      // ── Portrait dominance: low line count and block count ─────────────
      const portraitDominant = horizontalLineCount < 8 && blockCount < 6;

      this.logger.debug(
        `[LAYOUT] Fast analysis: lineCount=${horizontalLineCount} blockCount=${blockCount} ` +
        `textDensity=${textDensity.toFixed(2)} hasTable=${hasTableStructure}`,
      );

      return {
        lineCount: horizontalLineCount,
        blockCount,
        textDensity,
        hasTableStructure,
        avgBlockHeight,
        portraitDominant,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[LAYOUT] Fast analysis failed, using defaults: ${msg}`);
      return {
        lineCount: 0,
        blockCount: 0,
        textDensity: 0,
        hasTableStructure: false,
        avgBlockHeight: 0,
        portraitDominant: true,
      };
    }
  }

  private async getImageStats(buffer: Buffer): Promise<{ variance: number; edgeDensity: number }> {
    try {
      const stats = await sharp(buffer).stats();
      const variance = stats.channels.reduce((sum, c) => sum + (c.stdev ?? 0), 0) / stats.channels.length;

      const { data, info } = await sharp(buffer).grayscale().raw().toBuffer({ resolveWithObject: true });
      let edgeCount = 0;
      const w = info.width;
      for (let i = 1; i < data.length - w; i++) {
        const diff = Math.abs(data[i] - data[i - 1]);
        if (diff > 40) edgeCount++;
      }
      const edgeDensity = edgeCount / data.length;

      return { variance, edgeDensity };
    } catch {
      return { variance: 0, edgeDensity: 0 };
    }
  }

  private normalizeClassificationResult(
    rawType: string | undefined,
    rawConfidence: number,
    reasoning: string,
    detectedFeatures: string[],
    expectedType?: KycDocumentType,
  ): VisionClassificationResult {
    const normalized =
      KYC_DOCUMENT_TYPES.includes(rawType as KycDocumentType)
        ? (rawType as KycDocumentType)
        : normalizeDocumentType(rawType) || 'UNKNOWN';

    let confidence = Math.round(Math.min(99, Math.max(0, rawConfidence)));
    let documentType = normalized;

    if (confidence < CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      documentType = 'UNKNOWN';
      confidence = Math.min(confidence, CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED - 1);
    }

    return {
      documentType,
      confidence,
      category: DOCUMENT_TYPE_CATEGORIES[documentType],
      reasoning,
      detectedFeatures,
      matchesExpectedType: typesMatchExpected(documentType, expectedType),
    };
  }

  private buildReasoning(type: KycDocumentType, features: string[], confidence: number): string {
    if (type === 'UNKNOWN' || confidence < CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      return 'Document quality or visual signals insufficient for reliable classification';
    }
    const featureDesc = features
      .filter(f => !f.startsWith('ambiguous'))
      .slice(0, 3)
      .join(', ')
      .replace(/_/g, ' ');
    return `${DOCUMENT_TYPE_LABELS[type]} layout detected${featureDesc ? `: ${featureDesc}` : ''}`;
  }
}
