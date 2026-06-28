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
import { User, UserDocument } from '../../models/User';

import {
  DOCUMENT_TYPE_CATEGORIES,
  DocumentIntelligenceResponse,
  KycDocumentType,
  LegacyAnalysisResult,
  normalizeDocumentType,
  typesMatchExpected,
} from './types/document-intelligence.types';

// New Architecture Services
import { DocumentCacheService } from './document-cache.service';
import { ImageQualityService } from './image-quality.service';
import { OCRService } from './ocr.service';
import { DocumentAuthenticityService } from './document-authenticity.service';
import { VisionClassificationService } from './vision-classification.service';
import { FieldExtractionService } from './field-extraction.service';
import { ValidationService } from './validation.service';
import { ConfidenceService } from './confidence.service';

export interface ProcessDocumentInput {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  expectedDocumentType?: string;
  userId?: string;
  user?: User; // Pass user for profile matching
  persist?: boolean;
}

const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(RequiredDocument.name) private documentModel: Model<RequiredDocumentDocument>,
    @InjectModel(DocumentIntelligenceRecord.name)
    private intelligenceModel: Model<DocumentIntelligenceRecordDocument>,
    
    private readonly cacheService: DocumentCacheService,
    private readonly imageQualityService: ImageQualityService,
    private readonly ocrService: OCRService,
    private readonly authenticityService: DocumentAuthenticityService,
    private readonly visionClassificationService: VisionClassificationService,
    private readonly fieldExtractionService: FieldExtractionService,
    private readonly validationService: ValidationService,
    private readonly confidenceService: ConfidenceService,
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
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service id');
    }
    const objectId = new Types.ObjectId(serviceId);
    return this.documentModel.find({ service: objectId }).populate('service').exec();
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

  async processDocument(input: ProcessDocumentInput): Promise<LegacyAnalysisResult> {
    const totalStart = performance.now();
    const { buffer, mimeType, expectedDocumentType, userId, user, persist = false } = input;
    const normalizedExpected = normalizeDocumentType(expectedDocumentType);

    if (!buffer?.length) {
      throw new BadRequestException('File content is required for document intelligence processing');
    }

    // 0. Duplicate Detection & Caching
    const hash = this.cacheService.generateHash(buffer);
    const cachedResult = await this.cacheService.get(hash);
    if (cachedResult) {
      return cachedResult;
    }

    // Layer 1: Image Quality Analysis
    const tQ = performance.now();
    const qualityResult = await this.imageQualityService.analyze(buffer, mimeType);
    const timings = { preprocess: 0, classification: 0, ocr: 0, validation: 0, total: 0 };
    timings.preprocess = Math.round(performance.now() - tQ);

    // Layer 2: OCR Engine
    const tOcr = performance.now();
    const ocrResult = await this.ocrService.extractText(buffer, mimeType);
    timings.ocr = Math.round(performance.now() - tOcr);

    // Layer 2.5: Document Authenticity (score-only, does NOT block classification)
    const authenticityResult = await this.authenticityService.analyze(buffer, ocrResult.text, mimeType);
    if (!authenticityResult.isAuthentic) {
      this.logger.warn(`[Pipeline] Authenticity concern: ${authenticityResult.reason} (score=${authenticityResult.score})`);
    }

    // Layer 3: Document Classification (always runs regardless of authenticity)
    const tClass = performance.now();
    const classification = await this.visionClassificationService.classify(
      buffer,
      mimeType,
      expectedDocumentType,
      ocrResult.text
    );
    const documentType: KycDocumentType = classification.documentType;
    const classConfidence = classification.confidence;
    const classificationReasoning = classification.reasoning;
    const classificationProvider = (classification as any).provider || 'Local';
    timings.classification = Math.round(performance.now() - tClass);

    // Layer 4: Field Extraction
    const extractedData = await this.fieldExtractionService.extract(documentType, ocrResult.text);

    // Layer 5: Validation Engine
    const tVal = performance.now();
    const validationResult = this.validationService.validate(
      documentType,
      ocrResult.text,
      extractedData,
      classConfidence,
      expectedDocumentType
    );
    timings.validation = Math.round(performance.now() - tVal);

    // Layer 7: Confidence Engine
    const confidenceResult = this.confidenceService.calculate(
      {
        imageQuality: qualityResult.qualityScore,
        ocr: ocrResult.confidence,
        classification: classConfidence,
        validation: validationResult.score,
        authenticity: authenticityResult.score ?? 100,
      },
      documentType,
      normalizedExpected
    );

    timings.total = Math.round(performance.now() - totalStart);

    // Construct Legacy Analysis Result (API Contract backward compatibility)
    const displayType = this.visionClassificationService.toDisplayLabel(documentType);
    const missingFields = validationResult.issues?.filter(i => i.toLowerCase().includes('not found') || i.toLowerCase().includes('missing')) ?? [];

    const finalResult: LegacyAnalysisResult = {
      detectedType: documentType,
      documentType: displayType,
      detectedTypeEnum: documentType,
      verified: confidenceResult.status === 'VERIFIED',
      status: confidenceResult.status,
      confidence: confidenceResult.overallConfidence,
      extractedFields: extractedData as Record<string, unknown>,
      missingFields: missingFields,
      reason: !validationResult.valid ? validationResult.issues[0] : classificationReasoning,
      extractedText: ocrResult.text,
      reasons: [...qualityResult.warnings, ...validationResult.issues],
      validationIssues: validationResult.issues,
      matchesExpectedType: typesMatchExpected(documentType, normalizedExpected),
      ocrQualityIssues: ocrResult.qualityIssues,
      timings: IS_PRODUCTION ? undefined : timings,
    };

    // Cache the result
    await this.cacheService.set(hash, finalResult);

    if (persist && userId) {
      await this.saveIntelligenceResult(userId, finalResult, input.filename, mimeType);
    }

    return finalResult;
  }

  async analyzeUpload(
    filePathOrName: string,
    expectedDocumentType?: string,
    mimeType?: string,
    fileBuffer?: Buffer,
  ): Promise<LegacyAnalysisResult> {
    return this.processDocument({
      buffer: fileBuffer || Buffer.alloc(0),
      mimeType,
      filename: filePathOrName,
      expectedDocumentType,
      persist: false,
    });
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
    result: LegacyAnalysisResult,
    filename?: string,
    mimetype?: string,
  ): Promise<DocumentIntelligenceRecordDocument> {
    const record = new this.intelligenceModel({
      user: new Types.ObjectId(userId),
      documentType: result.detectedTypeEnum,
      extractedData: result.extractedFields,
      validation: { valid: result.verified, issues: result.validationIssues, score: result.confidence },
      extractedText: result.extractedText,
      filename,
      mimetype,
      source: 'intelligence',
      verificationStatus: result.status,
      verified: result.verified,
      confidence: result.confidence,
      detectionReasons: result.reasons,
      matchesExpectedType: result.matchesExpectedType,
    });
    return record.save();
  }
}
