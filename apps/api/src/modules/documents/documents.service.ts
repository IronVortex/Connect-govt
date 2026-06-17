import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import {
  DocumentIntelligenceRecord,
  DocumentIntelligenceRecordDocument,
} from '../../models/DocumentIntelligenceRecord';
import { RequiredDocument, RequiredDocumentDocument } from '../../models/RequiredDocument';
import { OcrService } from './ocr.service';
import { ValidationService } from './validation.service';
import { VisionClassificationService } from './vision-classification.service';
import { VerificationService } from './verification.service';
import {
  DocumentIntelligenceResponse,
  KycDocumentType,
  LegacyAnalysisResult,
  NO_TEXT_FOUND,
  PipelineTimings,
} from './types/document-intelligence.types';

export interface ProcessDocumentInput {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  expectedDocumentType?: string;
  userId?: string;
  persist?: boolean;
}

/**
 * Document types that contain no extractable text.
 * OCR is skipped entirely for these — returning empty text immediately.
 */
const NON_TEXT_DOCUMENT_TYPES = new Set<KycDocumentType>([
  'PASSPORT_PHOTO',
  'SUPPORTING_DOCUMENT',
]);

const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(RequiredDocument.name) private documentModel: Model<RequiredDocumentDocument>,
    @InjectModel(DocumentIntelligenceRecord.name)
    private intelligenceModel: Model<DocumentIntelligenceRecordDocument>,
    private readonly ocrService: OcrService,
    private readonly visionClassificationService: VisionClassificationService,
    private readonly validationService: ValidationService,
    private readonly verificationService: VerificationService,
  ) {}

  async findAll(): Promise<RequiredDocument[]> {
    try {
      const documents = await this.documentModel.find().populate('service').exec();
      return documents || [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`findAll failed: ${message}`);
      throw new InternalServerErrorException('Unable to load documents');
    }
  }

  async findByService(serviceId: string): Promise<RequiredDocument[]> {
    this.logger.log(`findByService called with serviceId: ${serviceId}`);
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service id');
    }

    const objectId = new Types.ObjectId(serviceId);
    const docs = await this.documentModel.find({ service: objectId }).populate('service').exec();
    this.logger.log(`Found ${docs.length} documents for service ${serviceId}`);
    return docs;
  }

  async findOne(id: string): Promise<RequiredDocument | null> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid document id');
    }

    return this.documentModel.findById(id).populate('service').exec();
  }

  async create(document: Partial<RequiredDocument>): Promise<RequiredDocumentDocument> {
    const newDocument = new this.documentModel(document);
    return newDocument.save();
  }

  /**
   * Pipeline: Preprocessing → Vision Classification → OCR → Validation → Verification
   *
   * OCR is skipped entirely for non-text document types (e.g. PASSPORT_PHOTO)
   * to avoid spending 30-45s on Tesseract for images with no text.
   */
  async processDocument(input: ProcessDocumentInput): Promise<DocumentIntelligenceResponse> {
    const totalStart = performance.now();
    const { buffer, mimeType, expectedDocumentType, userId, persist = false } = input;

    if (!buffer?.length) {
      throw new BadRequestException('File content is required for document intelligence processing');
    }

    this.logger.log(
      `[UPLOAD] Start — file="${input.filename}" mimeType="${mimeType}" expectedType="${expectedDocumentType}"`,
    );

    // ── Step 1: Vision AI classification ────────────────────────────────────
    const tClassStart = performance.now();
    const classification = await this.visionClassificationService.classify(
      buffer,
      mimeType,
      expectedDocumentType,
    );
    const classificationMs = Math.round(performance.now() - tClassStart);

    this.logger.log(
      `[CLASSIFICATION] ${classificationMs}ms — type=${classification.documentType} ` +
        `confidence=${classification.confidence}% matchesExpected=${classification.matchesExpectedType}`,
    );

    // ── Step 2: OCR — skipped for non-text document types ───────────────────
    const isNonTextType = NON_TEXT_DOCUMENT_TYPES.has(classification.documentType);
    let ocrMs = 0;

    let ocrResult: any;

    if (isNonTextType) {
      this.logger.log(
        `[OCR] Skipped — ${classification.documentType} is a non-text document type`,
      );
      ocrResult = {
        text: NO_TEXT_FOUND,
        confidence: 0,
        pages: [],
        blocks: [],
        lines: [],
        qualityIssues: [],
        imageProperties: {},
        ocrConfidence: 0,
      };
    } else {
      const tOcrStart = performance.now();
      ocrResult = await this.ocrService.extractFromFile(buffer, mimeType);
      ocrMs = Math.round(performance.now() - tOcrStart);
      this.logger.log(
        `[OCR] ${ocrMs}ms — chars=${ocrResult.text?.length ?? 0} ocrConfidence=${ocrResult.confidence?.toFixed(1)}%`,
      );
    }

    const extractedText =
      ocrResult.text && ocrResult.text !== NO_TEXT_FOUND
        ? ocrResult.text.slice(0, 5000)
        : NO_TEXT_FOUND;

    // ── Step 3: Structured data extraction ──────────────────────────────────
    const extractedData = this.validationService.parseFields(
      classification.documentType,
      ocrResult.text,
    );

    // ── Step 4: Validation rules ─────────────────────────────────────────────
    const tValidStart = performance.now();
    const validation = this.validationService.validate(
      classification.documentType,
      ocrResult.text,
      classification.confidence,
      expectedDocumentType,
    );
    const validationMs = Math.round(performance.now() - tValidStart);
    this.logger.log(
      `[VALIDATION] ${validationMs}ms — valid=${validation.valid} score=${validation.score}`,
    );

    // ── Step 5: Final verification result ───────────────────────────────────
    const verification = this.verificationService.resolve(
      classification,
      ocrResult,
      validation,
      extractedData,
      expectedDocumentType,
    );

    this.logger.log(
      `[VERIFICATION] status=${verification.status} verified=${verification.verified}`,
    );

    const totalMs = Math.round(performance.now() - totalStart);
    const timings: PipelineTimings = {
      preprocess: 0, // handled inside classification/ocr services
      classification: classificationMs,
      ocr: ocrMs,
      validation: validationMs,
      total: totalMs,
    };

    this.logger.log(
      `[UPLOAD] Total: ${totalMs}ms | CLASSIFICATION: ${classificationMs}ms | OCR: ${ocrMs}ms | VALIDATION: ${validationMs}ms`,
    );

    const response: DocumentIntelligenceResponse = {
      documentType: classification.documentType,
      extractedData,
      validation,
      extractedText,
      verification,
      timings: IS_PRODUCTION ? undefined : timings,
    };

    if (persist && userId) {
      await this.saveIntelligenceResult(userId, response, input.filename, mimeType);
    }

    return response;
  }

  async analyzeUpload(
    filePathOrName: string,
    expectedDocumentType?: string,
    mimeType?: string,
    fileBuffer?: Buffer,
  ): Promise<LegacyAnalysisResult> {
    const result = await this.processDocument({
      buffer: fileBuffer || Buffer.alloc(0),
      mimeType,
      filename: filePathOrName,
      expectedDocumentType,
      persist: false,
    });

    return this.toLegacyAnalysis(result, expectedDocumentType);
  }

  async findIntelligenceByUser(userId: string): Promise<DocumentIntelligenceRecord[]> {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    return this.intelligenceModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  private async saveIntelligenceResult(
    userId: string,
    result: DocumentIntelligenceResponse,
    filename?: string,
    mimetype?: string,
  ): Promise<DocumentIntelligenceRecordDocument> {
    const record = new this.intelligenceModel({
      user: new Types.ObjectId(userId),
      documentType: result.documentType,
      extractedData: result.extractedData,
      validation: result.validation,
      extractedText: result.extractedText,
      filename,
      mimetype,
      source: 'intelligence',
    });

    return record.save();
  }

  private toLegacyAnalysis(
    result: DocumentIntelligenceResponse,
    expectedDocumentType?: string,
  ): LegacyAnalysisResult {
    const verification = result.verification;
    const displayType =
      verification?.documentTypeLabel ||
      this.visionClassificationService.toDisplayLabel(result.documentType);
    const confidence = verification?.confidence ?? 0;
    const status = verification?.status ?? 'UNKNOWN';
    const verified = verification?.verified ?? false;

    const extractedFields = verification?.extractedFields ?? {
      name: result.extractedData.name,
      dob: result.extractedData.dob,
      idNumber: result.extractedData.idNumber,
    };

    const missingFields = result.validation.issues?.filter(i => i.startsWith('Missing')) ?? [];

    return {
      detectedType: displayType,
      documentType: displayType,
      /** Store enum key for database persistence */
      detectedTypeEnum: result.documentType,
      verified,
      status,
      confidence,
      extractedFields,
      missingFields: missingFields.map(m => m.replace('Missing fields: ', '')),
      reason: verified ? undefined : verification?.reasons?.[0],
      extractedText: result.extractedText,
      reasons: verification?.reasons ?? result.validation.issues ?? [],
      validationIssues: result.validation.issues,
      detectedFeatures: verification?.detectedFeatures,
      matchesExpectedType: verification?.matchesExpectedType,
      ocrQualityIssues: verification?.ocr.qualityIssues,
      timings: result.timings,
    };
  }
}
