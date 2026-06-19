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
    const sanitizedText = ocrText?.trim() || '';

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      try {
        const tAiStart = performance.now();
        const aiResult = await this.classifyWithOpenAI(preprocessed, apiKey, normalizedExpected);
        if (aiResult) {
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
    const localResult = await this.classifyLocally(preprocessed, normalizedExpected, mimeType, sanitizedText);
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
  ): Promise<VisionClassificationResult | null> {
    const base64 = image.buffer.toString('base64');
    const expectedHint = expectedType
      ? `\nThe user uploaded this into the "${DOCUMENT_TYPE_LABELS[expectedType]}" slot. Factor this in but do not override clear visual evidence.`
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
              { type: 'text', text: CLASSIFICATION_PROMPT + expectedHint },
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

  private async classifyLocally(
    image: PreprocessedImage,
    expectedType?: KycDocumentType,
    mimeType?: string,
    ocrText?: string,
  ): Promise<VisionClassificationResult> {
    const features = await this.extractVisualFeatures(image);
    const scores = this.scoreDocumentTypes(features, mimeType, ocrText);

    if (expectedType && expectedType !== 'UNKNOWN') {
      const expectedScore = scores.find(s => s.type === expectedType);
      if (expectedScore) {
        expectedScore.score += 12;
        expectedScore.features.push('expected-type-prior');
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const best = scores[0];
    const runnerUp = scores[1];

    let confidence = Math.round(Math.min(100, best.score));
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

    let confidence = Math.round(Math.min(100, Math.max(0, rawConfidence)));
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
