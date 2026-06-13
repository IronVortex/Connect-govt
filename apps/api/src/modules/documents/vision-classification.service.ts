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
  ): Promise<VisionClassificationResult> {
    const preprocessed = await this.preprocessingService.toClassificationImage(buffer, mimeType);
    const normalizedExpected = normalizeDocumentType(expectedType);

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      try {
        const aiResult = await this.classifyWithOpenAI(preprocessed, apiKey, normalizedExpected);
        if (aiResult) return aiResult;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`OpenAI vision classification failed, using local fallback: ${message}`);
      }
    }

    return this.classifyLocally(preprocessed, normalizedExpected, mimeType);
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
  ): Promise<VisionClassificationResult> {
    const features = await this.extractVisualFeatures(image);
    const scores = this.scoreDocumentTypes(features, mimeType);

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

    let confidence = Math.round(Math.min(95, best.score));
    let documentType = best.type;

    if (runnerUp && runnerUp.score >= best.score * 0.88) {
      confidence = Math.round(confidence * 0.75);
      best.features.push(`ambiguous-with:${runnerUp.type}`);
    }

    if (confidence < CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED) {
      documentType = 'UNKNOWN';
      confidence = Math.min(confidence, CONFIDENCE_THRESHOLDS.REVIEW_REQUIRED - 1);
    }

    const matchesExpectedType = typesMatchExpected(documentType, expectedType);

    this.logger.log(
      `Local vision classification: type=${documentType}, confidence=${confidence}, ` +
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
  ): Array<{ type: KycDocumentType; score: number; features: string[] }> {
    const results: Array<{ type: KycDocumentType; score: number; features: string[] }> = [];

    for (const type of KYC_DOCUMENT_TYPES) {
      if (type === 'UNKNOWN') continue;
      const { score, features: detected } = this.scoreType(type, features, mimeType);
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
  ): { score: number; features: string[] } {
    const f: string[] = [];
    let score = 0;
    const { layout, aspect, isPortrait, isLandscape, isSquareish, edgeDensity, colorVariance } =
      features;

    switch (type) {
      case 'PASSPORT_PHOTO':
        if (isSquareish && layout.lineCount < 8 && layout.textDensity < 0.15) {
          score += 55;
          f.push('portrait_layout', 'minimal_text');
        }
        if (layout.blockCount < 5 && aspect >= 0.7 && aspect <= 1.4) {
          score += 25;
          f.push('photo_aspect_ratio');
        }
        if (layout.lineCount > 15) score -= 40;
        break;

      case 'MARKS_CARD':
      case 'SSLC_MARKS':
      case 'PUC_MARKS':
      case 'DEGREE_CERTIFICATE':
        if (layout.hasTableStructure) {
          score += 40;
          f.push('academic_table');
        }
        if (layout.lineCount >= 12) {
          score += 20;
          f.push('structured_text');
        }
        if (isLandscape || aspect > 1.1) {
          score += 15;
          f.push('landscape_document');
        }
        if (isSquareish && layout.lineCount < 8) score -= 35;
        break;

      case 'RESUME':
        if (layout.lineCount >= 20 && !layout.hasTableStructure) {
          score += 35;
          f.push('multi_section_text');
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
        if (isPortrait) {
          score += 15;
          f.push('passbook_layout');
        }
        break;

      case 'AADHAAR':
      case 'PAN':
      case 'PASSPORT':
      case 'DRIVING_LICENSE':
      case 'VOTER_ID':
        if (layout.lineCount >= 6 && layout.lineCount <= 40) {
          score += 25;
          f.push('id_card_layout');
        }
        if (colorVariance > 25) {
          score += 15;
          f.push('color_document');
        }
        if (isSquareish && layout.lineCount < 5) score -= 40;
        break;

      case 'BIRTH_CERTIFICATE':
      case 'INCOME_CERTIFICATE':
      case 'TRANSFER_CERTIFICATE':
        if (layout.lineCount >= 8 && isPortrait) {
          score += 30;
          f.push('certificate_layout');
        }
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
        break;

      case 'INVOICE':
        if (layout.hasTableStructure || layout.lineCount >= 12) {
          score += 30;
          f.push('invoice_table');
        }
        break;

      case 'ADDRESS_PROOF':
      case 'ELECTRICITY_BILL':
      case 'WATER_BILL':
      case 'GAS_BILL':
        if (layout.lineCount >= 10) {
          score += 25;
          f.push('utility_bill_layout');
        }
        break;

      case 'VACCINATION_RECORD':
        if (layout.lineCount >= 6) {
          score += 22;
          f.push('medical_record_layout');
        }
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
      const { createWorker } = require('tesseract.js');
      const worker = await createWorker('eng');
      const { data } = await worker.recognize(buffer);
      await worker.terminate();

      const blocks = (data.blocks || []) as Array<{
        text?: string;
        confidence?: number;
        bbox?: { x0: number; y0: number; x1: number; y1: number };
      }>;
      const lines = (data.lines || []) as Array<{ text?: string }>;

      const validBlocks = blocks.filter(b => (b.text || '').trim().length > 0);
      const lineCount = lines.filter(l => (l.text || '').trim().length > 0).length;
      const blockCount = validBlocks.length;

      const heights = validBlocks
        .map(b => (b.bbox ? b.bbox.y1 - b.bbox.y0 : 0))
        .filter(h => h > 0);
      const avgBlockHeight = heights.length
        ? heights.reduce((a, b) => a + b, 0) / heights.length
        : 0;

      const yPositions = validBlocks.map(b => b.bbox?.y0 ?? 0).sort((a, b) => a - b);
      let alignedRows = 0;
      for (let i = 1; i < yPositions.length; i++) {
        if (Math.abs(yPositions[i] - yPositions[i - 1]) < 15) alignedRows++;
      }
      const hasTableStructure = alignedRows >= 4 && blockCount >= 8;

      const totalText = lines.map(l => l.text || '').join(' ');
      const textDensity = totalText.length / Math.max(1, blockCount);

      return {
        lineCount,
        blockCount,
        textDensity,
        hasTableStructure,
        avgBlockHeight,
        portraitDominant: lineCount < 8 && blockCount < 6,
      };
    } catch {
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
