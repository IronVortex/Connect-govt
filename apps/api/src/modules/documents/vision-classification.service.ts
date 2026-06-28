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
Also use any OCR text provided. Do NOT guess from filename. Classify based on visual structure and OCR text.

Supported document types (return exactly one):
AADHAAR, PAN, PASSPORT, DRIVING_LICENSE, VOTER_ID, BIRTH_CERTIFICATE, DEATH_CERTIFICATE,
MARRIAGE_CERTIFICATE, MARKS_CARD, SSLC_MARKS, PUC_MARKS, DEGREE_CERTIFICATE, TRANSFER_CERTIFICATE,
STUDY_CERTIFICATE, RATION_CARD, ELECTRICITY_BILL, WATER_BILL, GAS_BILL, PROPERTY_TAX_RECEIPT,
ADDRESS_PROOF, SALARY_SLIP, BANK_PASSBOOK, BANK_STATEMENT, INCOME_CERTIFICATE, CASTE_CERTIFICATE,
DOMICILE_CERTIFICATE, RC_BOOK, VEHICLE_INSURANCE, POLLUTION_CERTIFICATE, INSURANCE_CERTIFICATE,
HEALTH_INSURANCE_CARD, VACCINATION_RECORD, INVOICE, PASSPORT_PHOTO, RESUME, SUPPORTING_DOCUMENT, UNKNOWN

Rules:
- confidence 0-100 (integer). Use >=85 only for strong visual/text match.
- If uncertain or poor quality, return UNKNOWN with confidence <70.
- PASSPORT_PHOTO: ONLY if image is a portrait photograph of a single person, centered face, plain background, portrait orientation. No document text or layout should be present.
- MARKS_CARD/SSLC_MARKS/PUC_MARKS: academic transcripts with marks tables.
- RESUME: CV layouts with sections like experience/education/skills.
- RC_BOOK: vehicle registration certificates with chassis/engine numbers.
- POLLUTION_CERTIFICATE: PUC certificates.

You MUST respond ONLY with valid JSON matching this exact schema (no markdown, no code fences):
{
  "documentType": "TYPE",
  "confidence": 85,
  "reasoning": ["reason 1", "reason 2"],
  "detectedFeatures": ["feature1", "feature2"]
}`;

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

    // Priority 1: Hard OCR Fallback (strong deterministic keywords)
    const hardOcrFallback = this.classifyByHardOcrFallback(ocrText, normalizedExpected);
    if (hardOcrFallback) {
      this.logger.log(
        `[CLASSIFICATION] Hard OCR fallback: type=${hardOcrFallback.documentType} confidence=${hardOcrFallback.confidence}%`,
      );
      return hardOcrFallback;
    }

    // Priority 2: High-confidence text classification
    const textClassification = this.classifyByTextContent(ocrText);
    if (textClassification && textClassification.confidence >= 70) {
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
        provider: 'OCR-Heuristics',
      };
    }

    // Priority 3: Gemini AI Classification
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      try {
        const tAiStart = performance.now();
        const aiResult = await this.classifyWithGemini(preprocessed, apiKey, normalizedExpected, ocrText);
        if (aiResult) {
          if (aiResult.documentType === 'UNKNOWN' && textClassification && textClassification.confidence >= 40) {
            this.logger.log(
              `[CLASSIFICATION] Gemini returned UNKNOWN but text classifier has moderate confidence (${textClassification.confidence}%). Overriding with ${textClassification.type}`
            );
            const matchesExpectedType = typesMatchExpected(textClassification.type, normalizedExpected);
            return {
              documentType: textClassification.type,
              confidence: textClassification.confidence,
              category: DOCUMENT_TYPE_CATEGORIES[textClassification.type],
              reasoning: this.buildReasoning(textClassification.type, textClassification.features, textClassification.confidence),
              detectedFeatures: textClassification.features,
              matchesExpectedType,
              provider: 'OCR-Heuristics',
            };
          }
          this.logger.log(
            `[CLASSIFICATION] Gemini: ${Math.round(performance.now() - tAiStart)}ms` +
            ` - type=${aiResult.documentType} confidence=${aiResult.confidence}`,
          );
          if (aiResult.documentType === 'UNKNOWN') {
            const fallback = this.classifyByHardOcrFallback(ocrText, normalizedExpected);
            if (fallback) return fallback;
          }
          return aiResult;
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[CLASSIFICATION] Gemini failed, using local fallback: ${message}`);
      }
    }

    // Priority 4: Local Visual Heuristics
    const tLocalStart = performance.now();
    const localResult = await this.classifyLocally(preprocessed, normalizedExpected, mimeType, ocrText);
    this.logger.log(
      `[CLASSIFICATION] Local fallback: ${Math.round(performance.now() - tLocalStart)}ms` +
      ` - type=${localResult.documentType} confidence=${localResult.confidence}`,
    );
    if (localResult.documentType === 'UNKNOWN') {
      const fallback = this.classifyByHardOcrFallback(ocrText, normalizedExpected);
      if (fallback) return fallback;
    }
    return localResult;
  }

  toDisplayLabel(documentType: KycDocumentType): string {
    return DOCUMENT_TYPE_LABELS[documentType];
  }

  private async classifyWithGemini(
    image: PreprocessedImage,
    apiKey: string,
    expectedType?: KycDocumentType,
    ocrText?: string,
  ): Promise<VisionClassificationResult | null> {
    const base64 = image.buffer.toString('base64');
    const expectedHint = expectedType
      ? `\nThe user uploaded this into the "${DOCUMENT_TYPE_LABELS[expectedType]}" slot. Factor this in but do not override clear visual/text evidence.`
      : '';
    const ocrTextHint = ocrText && ocrText !== 'NO_TEXT_FOUND'
      ? `\nHere is the OCR text extracted from the document. Use it as the PRIMARY signal to verify the document type:\n"""\n${ocrText.slice(0, 4000)}\n"""`
      : '';

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: CLASSIFICATION_PROMPT + expectedHint + ocrTextHint },
                { inlineData: { mimeType: 'image/png', data: base64 } }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            }
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) return null;

        // Strip markdown code fences if present
        content = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

        const parsed = JSON.parse(content) as {
          documentType?: string;
          confidence?: number;
          reasoning?: string | string[];
          detectedFeatures?: string[];
        };

        const reasoningStr = Array.isArray(parsed.reasoning)
          ? parsed.reasoning.join('. ')
          : parsed.reasoning ?? 'AI vision classification';

        const result = this.normalizeClassificationResult(
          parsed.documentType,
          parsed.confidence ?? 0,
          reasoningStr,
          parsed.detectedFeatures ?? [],
          expectedType,
        );
        result.provider = 'Gemini';
        return result;
      } catch (e: any) {
        clearTimeout(timeoutId);
        this.logger.warn(`[CLASSIFICATION] Gemini attempt ${attempts} failed: ${e.message}`);
        if (attempts >= maxAttempts) {
          this.logger.error(`[CLASSIFICATION] Gemini classification failed after all retries.`);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    }
    return null;
  }

  private classifyByTextContent(
    text?: string,
  ): { type: KycDocumentType; confidence: number; features: string[] } | null {
    if (!text || text === NO_TEXT_FOUND || !text.trim()) return null;

    const cleaned = text.toUpperCase();
    const scores: Partial<Record<KycDocumentType, { score: number; features: string[] }>> = {};
    const ensure = (type: KycDocumentType) => {
      scores[type] ??= { score: 0, features: [] };
      return scores[type]!;
    };
    const keyword = (type: KycDocumentType, value: string, score: number, feature: string) => {
      if (!cleaned.includes(value.toUpperCase())) return;
      const current = ensure(type);
      current.score += score;
      current.features.push(feature);
    };
    const pattern = (type: KycDocumentType, value: RegExp, score: number, feature: string) => {
      if (!value.test(text)) return;
      const current = ensure(type);
      current.score += score;
      current.features.push(feature);
    };

    // AADHAAR
    keyword('AADHAAR', 'Government of India', 30, 'government_of_india');
    keyword('AADHAAR', 'Unique Identification Authority of India', 60, 'uidai_full_keyword');
    keyword('AADHAAR', 'Unique Identification', 45, 'unique_identification');
    keyword('AADHAAR', 'Aadhaar', 60, 'aadhaar_keyword');
    keyword('AADHAAR', 'Aadhar', 45, 'aadhar_keyword');
    keyword('AADHAAR', 'VID', 30, 'vid_keyword');
    pattern('AADHAAR', /\b\d{4}\s?\d{4}\s?\d{4}\b/, 70, 'aadhaar_number_pattern');

    // PAN
    keyword('PAN', 'INCOME TAX DEPARTMENT', 60, 'income_tax_department');
    keyword('PAN', 'Permanent Account Number', 65, 'permanent_account_number');
    pattern('PAN', /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i, 80, 'pan_number_pattern');

    // PASSPORT
    keyword('PASSPORT', 'Passport', 60, 'passport_keyword');
    keyword('PASSPORT', 'Republic of India', 45, 'republic_of_india');
    keyword('PASSPORT', 'Passport No', 55, 'passport_no');
    keyword('PASSPORT', 'Nationality', 35, 'nationality');
    pattern('PASSPORT', /\b[A-Z][0-9]{7}\b/i, 45, 'passport_number_pattern');

    // DRIVING_LICENSE
    keyword('DRIVING_LICENSE', 'Driving Licence', 70, 'driving_licence_keyword');
    keyword('DRIVING_LICENSE', 'Driving License', 70, 'driving_license_keyword');
    keyword('DRIVING_LICENSE', 'DL No', 55, 'dl_no');
    keyword('DRIVING_LICENSE', 'Transport Department', 45, 'transport_department');
    pattern('DRIVING_LICENSE', /\b[A-Z]{2}[0-9]{2}\s?[0-9]{8,13}\b/i, 45, 'dl_number_pattern');

    // BIRTH_CERTIFICATE
    keyword('BIRTH_CERTIFICATE', 'Birth Certificate', 80, 'birth_certificate_keyword');
    keyword('BIRTH_CERTIFICATE', 'Certificate of Birth', 80, 'certificate_of_birth');
    keyword('BIRTH_CERTIFICATE', 'Date of Birth', 35, 'date_of_birth');
    keyword('BIRTH_CERTIFICATE', 'Registrar', 45, 'registrar');
    keyword('BIRTH_CERTIFICATE', 'Registration Number', 45, 'registration_number');

    // MARKS_CARD
    keyword('MARKS_CARD', 'Marks Card', 80, 'marks_card_keyword');
    keyword('MARKS_CARD', 'Statement of Marks', 80, 'statement_of_marks');
    keyword('MARKS_CARD', 'Semester', 30, 'semester');
    keyword('MARKS_CARD', 'Subject', 35, 'subject');
    keyword('MARKS_CARD', 'Grade', 30, 'grade');
    keyword('MARKS_CARD', 'Percentage', 35, 'percentage');
    keyword('MARKS_CARD', 'CGPA', 45, 'cgpa');
    keyword('MARKS_CARD', 'SGPA', 45, 'sgpa');

    // BANK_PASSBOOK
    keyword('BANK_PASSBOOK', 'Passbook', 80, 'passbook_keyword');
    keyword('BANK_PASSBOOK', 'Account Number', 60, 'account_number');
    keyword('BANK_PASSBOOK', 'Account No', 55, 'account_no');
    keyword('BANK_PASSBOOK', 'A/C No', 55, 'account_no_short');
    keyword('BANK_PASSBOOK', 'IFSC', 60, 'ifsc');
    keyword('BANK_PASSBOOK', 'Branch', 35, 'branch');
    keyword('BANK_PASSBOOK', 'Customer ID', 45, 'customer_id');
    keyword('BANK_PASSBOOK', 'Bank', 30, 'bank');
    pattern('BANK_PASSBOOK', /\b[A-Z]{4}0[A-Z0-9]{6}\b/i, 70, 'ifsc_pattern');

    // TRANSFER_CERTIFICATE
    keyword('TRANSFER_CERTIFICATE', 'Transfer Certificate', 80, 'tc_keyword');
    keyword('TRANSFER_CERTIFICATE', 'School Leaving', 80, 'school_leaving');
    keyword('TRANSFER_CERTIFICATE', 'Admission Number', 60, 'admission_number');
    keyword('TRANSFER_CERTIFICATE', 'Leaving Date', 60, 'leaving_date');
    keyword('TRANSFER_CERTIFICATE', 'Transferred to', 50, 'transferred_to');

    // INCOME_CERTIFICATE
    keyword('INCOME_CERTIFICATE', 'Income Certificate', 80, 'income_cert_keyword');
    keyword('INCOME_CERTIFICATE', 'Annual Income', 80, 'annual_income');
    keyword('INCOME_CERTIFICATE', 'Tahsildar', 60, 'tahsildar');
    keyword('INCOME_CERTIFICATE', 'Family Income', 60, 'family_income');

    // RC_BOOK
    keyword('RC_BOOK', 'Registration Certificate', 80, 'rc_keyword');
    keyword('RC_BOOK', 'Chassis No', 80, 'chassis_no');
    keyword('RC_BOOK', 'Engine No', 80, 'engine_no');
    keyword('RC_BOOK', 'Vehicle Class', 60, 'vehicle_class');
    keyword('RC_BOOK', 'RC Book', 60, 'rc_book_keyword');
    keyword('RC_BOOK', 'Fuel Type', 50, 'fuel_type');

    // POLLUTION_CERTIFICATE
    keyword('POLLUTION_CERTIFICATE', 'Pollution Under Control', 80, 'puc_keyword');
    keyword('POLLUTION_CERTIFICATE', 'Pollution Certificate', 80, 'puc_cert_keyword');
    keyword('POLLUTION_CERTIFICATE', 'PUC', 50, 'puc_abbrev');
    keyword('POLLUTION_CERTIFICATE', 'Emission Test', 60, 'emission_test');

    // VOTER_ID
    keyword('VOTER_ID', 'Voter', 60, 'voter_keyword');
    keyword('VOTER_ID', 'Election Commission', 70, 'election_commission');
    keyword('VOTER_ID', 'EPIC', 60, 'epic_keyword');

    const candidates = Object.entries(scores)
      .map(([type, data]) => ({ type: type as KycDocumentType, score: data.score, features: data.features }))
      .filter(candidate => candidate.score > 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) return null;

    const best = candidates[0];
    const runnerUp = candidates[1];
    let confidence = this.scoreToConfidence(best.score);
    if (runnerUp && runnerUp.score >= best.score * 0.85) {
      confidence = Math.max(40, Math.round(confidence * 0.85));
      best.features.push(`ambiguous_with_${runnerUp.type}`);
    }

    return { type: best.type, confidence, features: best.features };
  }

  private classifyByHardOcrFallback(
    ocrText?: string,
    expectedType?: KycDocumentType,
  ): VisionClassificationResult | null {
    if (!ocrText || ocrText === NO_TEXT_FOUND || ocrText.trim().length < 8) {
      return null;
    }

    const text = ocrText.toUpperCase();
    const checks: Array<{ type: KycDocumentType; matched: boolean; features: string[] }> = [
      {
        type: 'AADHAAR',
        matched:
          text.includes('UNIQUE IDENTIFICATION AUTHORITY OF INDIA') ||
          text.includes('UIDAI') ||
          text.includes('AADHAAR') ||
          text.includes('AADHAR') ||
          /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(ocrText),
        features: ['hard_ocr_aadhaar'],
      },
      {
        type: 'PAN',
        matched:
          text.includes('INCOME TAX DEPARTMENT') ||
          text.includes('PERMANENT ACCOUNT NUMBER') ||
          /\b[A-Z]{5}[0-9]{4}[A-Z]\b/i.test(ocrText),
        features: ['hard_ocr_pan'],
      },
      {
        type: 'PASSPORT',
        matched:
          text.includes('PASSPORT') ||
          text.includes('REPUBLIC OF INDIA') ||
          text.includes('PASSPORT NO') ||
          text.includes('NATIONALITY'),
        features: ['hard_ocr_passport'],
      },
      {
        type: 'DRIVING_LICENSE',
        matched:
          text.includes('DRIVING LICENCE') ||
          text.includes('DRIVING LICENSE') ||
          text.includes('DL NO') ||
          text.includes('LICENCE NO'),
        features: ['hard_ocr_driving_license'],
      },
      {
        type: 'BIRTH_CERTIFICATE',
        matched:
          text.includes('BIRTH CERTIFICATE') ||
          text.includes('CERTIFICATE OF BIRTH'),
        features: ['hard_ocr_birth_certificate'],
      },
      {
        type: 'MARKS_CARD',
        matched:
          text.includes('MARKS CARD') ||
          text.includes('MARKSHEET') ||
          text.includes('REGISTER NUMBER') ||
          text.includes('SEMESTER') ||
          text.includes('EXAMINATION'),
        features: ['hard_ocr_marks_card'],
      },
      {
        type: 'BANK_PASSBOOK',
        matched:
          text.includes('PASSBOOK') ||
          (text.includes('ACCOUNT NUMBER') && text.includes('IFSC')),
        features: ['hard_ocr_bank_passbook'],
      },
      {
        type: 'TRANSFER_CERTIFICATE',
        matched:
          text.includes('TRANSFER CERTIFICATE') ||
          text.includes('SCHOOL LEAVING') ||
          text.includes('ADMISSION NUMBER'),
        features: ['hard_ocr_transfer_certificate'],
      },
      {
        type: 'INCOME_CERTIFICATE',
        matched:
          text.includes('INCOME CERTIFICATE') ||
          text.includes('ANNUAL INCOME') ||
          text.includes('TAHSILDAR'),
        features: ['hard_ocr_income_certificate'],
      },
      {
        type: 'RC_BOOK',
        matched:
          (text.includes('CHASSIS NO') && text.includes('ENGINE NO')) ||
          text.includes('VEHICLE CLASS') ||
          text.includes('RC BOOK'),
        features: ['hard_ocr_rc_book'],
      },
      {
        type: 'POLLUTION_CERTIFICATE',
        matched:
          text.includes('POLLUTION UNDER CONTROL') ||
          text.includes('POLLUTION CERTIFICATE'),
        features: ['hard_ocr_pollution_certificate'],
      },
    ];

    const match = checks.find(check => check.matched);
    if (!match) return null;

    return {
      documentType: match.type,
      confidence: 95,
      category: DOCUMENT_TYPE_CATEGORIES[match.type],
      reasoning: `Hard OCR fallback detected ${DOCUMENT_TYPE_LABELS[match.type]}`,
      detectedFeatures: match.features,
      matchesExpectedType: typesMatchExpected(match.type, expectedType),
      provider: 'OCR-Heuristics',
    };
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

    if (confidence < 30) {
      documentType = 'UNKNOWN';
      confidence = Math.min(confidence, 29);
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
      provider: 'Local-Visual-Heuristics',
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

      let darkPixels = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i] < 128) darkPixels++;
      }
      const textDensity = darkPixels / pixelCount;

      let horizontalLineCount = 0;
      const lineThreshold = Math.floor(width * 0.7);
      const rowSample: number[] = [];

      for (let y = 0; y < height; y += 4) {
        let darkInRow = 0;
        for (let x = 0; x < width; x++) {
          const idx = y * width + x;
          if (data[idx] < 128) darkInRow++;
        }
        if (darkInRow >= lineThreshold) {
          horizontalLineCount++;
          rowSample.push(y);
        }
      }

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
      blockCount = Math.max(1, blockCount);

      const avgBlockHeight = blockCount > 0 ? height / blockCount : height;

      const hasTableStructure =
        blockCount >= 8 &&
        horizontalLineCount >= 12 &&
        rowSample.length >= 4 &&
        Math.abs(rowSample[1] - rowSample[0] - (rowSample[2] - rowSample[1])) < 8;

      const portraitDominant = horizontalLineCount < 8 && blockCount < 6;

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

    if (confidence < 30) {
      documentType = 'UNKNOWN';
      confidence = Math.min(confidence, 29);
    }

    return {
      documentType,
      confidence,
      category: DOCUMENT_TYPE_CATEGORIES[documentType],
      reasoning,
      detectedFeatures,
      matchesExpectedType: typesMatchExpected(documentType, expectedType),
      provider: 'Unknown',
    };
  }

  private buildReasoning(type: KycDocumentType, features: string[], confidence: number): string {
    if (type === 'UNKNOWN' || confidence < 30) {
      return 'Document quality or visual signals insufficient for reliable classification';
    }
    const featureDesc = features
      .filter(f => !f.startsWith('ambiguous'))
      .slice(0, 3)
      .join(', ')
      .replace(/_/g, ' ');
    return `${DOCUMENT_TYPE_LABELS[type]} layout detected${featureDesc ? `: ${featureDesc}` : ''}`;
  }

  private scoreToConfidence(score: number): number {
    if (score >= 120) return 99;
    if (score >= 90) return 95;
    if (score >= 70) return 90;
    if (score >= 50) return 85;
    if (score >= 35) return 75;
    if (score >= 20) return 60;
    return Math.max(40, Math.min(69, Math.round(score + 30)));
  }
}
