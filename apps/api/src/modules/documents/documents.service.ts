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
  LegacyAnalysisResult,
  NO_TEXT_FOUND,
} from './types/document-intelligence.types';

export interface ProcessDocumentInput {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  expectedDocumentType?: string;
  userId?: string;
  persist?: boolean;
}

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
   * Pipeline: Preprocessing → Vision Classification → OCR → Structured Extraction → Validation → Verification
   */
  async processDocument(input: ProcessDocumentInput): Promise<DocumentIntelligenceResponse> {
    const { buffer, mimeType, expectedDocumentType, userId, persist = false } = input;

    if (!buffer?.length) {
      throw new BadRequestException('File content is required for document intelligence processing');
    }

    // Step 1: Vision AI classification (before OCR)
    const classification = await this.visionClassificationService.classify(
      buffer,
      mimeType,
      expectedDocumentType,
    );

    this.logger.log(
      `Classification: type=${classification.documentType}, confidence=${classification.confidence}%, ` +
        `matchesExpected=${classification.matchesExpectedType}`,
    );

    // Step 2: OCR text extraction (after classification)
    const ocrResult = await this.ocrService.extractFromFile(buffer, mimeType);
    const extractedText =
      ocrResult.text && ocrResult.text !== NO_TEXT_FOUND
        ? ocrResult.text.slice(0, 5000)
        : NO_TEXT_FOUND;

    // Step 3: Structured data extraction
    const extractedData = this.validationService.parseFields(
      classification.documentType,
      ocrResult.text,
    );

    // Step 4: Validation rules
    const validation = this.validationService.validate(
      classification.documentType,
      ocrResult.text,
      classification.confidence,
      expectedDocumentType,
    );

    // Step 5: Final verification result
    const verification = this.verificationService.resolve(
      classification,
      ocrResult,
      validation,
      extractedData,
      expectedDocumentType,
    );

    const response: DocumentIntelligenceResponse = {
      documentType: classification.documentType,
      extractedData,
      validation,
      extractedText,
      verification,
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
    };
  }
}
