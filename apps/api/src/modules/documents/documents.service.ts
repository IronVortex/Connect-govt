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
import { DetectionService } from './detection.service';
import { OcrService } from './ocr.service';
import { ValidationService } from './validation.service';
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
    private readonly detectionService: DetectionService,
    private readonly validationService: ValidationService,
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

  async processDocument(input: ProcessDocumentInput): Promise<DocumentIntelligenceResponse> {
    const { buffer, mimeType, filename, expectedDocumentType, userId, persist = false } = input;

    if (!buffer?.length) {
      throw new BadRequestException('File content is required for document intelligence processing');
    }

    const ocrResult = await this.ocrService.extractFromFile(buffer, mimeType);
    const extractedText =
      ocrResult.text && ocrResult.text !== NO_TEXT_FOUND
        ? ocrResult.text.slice(0, 5000)
        : NO_TEXT_FOUND;

    const detection = this.detectionService.detect(
      ocrResult.text,
      filename,
      expectedDocumentType,
      ocrResult.imageProperties,
      ocrResult.ocrConfidence,
    );

    const extractedData = this.validationService.parseFields(detection.documentType, ocrResult.text);
    const validation = this.validationService.validate(
      detection.documentType,
      ocrResult.text,
      detection.confidence,
      expectedDocumentType,
    );

    const response: DocumentIntelligenceResponse = {
      documentType: detection.documentType,
      extractedData,
      validation: {
        ...validation,
        confidence: detection.confidence,
      },
      extractedText,
    };

    if (persist && userId) {
      await this.saveIntelligenceResult(userId, response, filename, mimeType);
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
    const displayType = this.detectionService.toDisplayLabel(result.documentType);
    const confidencePercent = Math.round(result.validation.confidence * 100);
    const status = this.detectionService.resolveStatus(
      result.validation.confidence,
      result.documentType,
      expectedDocumentType,
    );

    const verified =
      result.validation.isValid && (status === 'MATCHED' || status === 'DETECTED');

    return {
      detectedType: displayType,
      documentType: displayType,
      verified,
      status,
      confidence: confidencePercent,
      extractedFields: {
        name: result.extractedData.name,
        dob: result.extractedData.dob,
        idNumber: result.extractedData.idNumber,
      },
      missingFields: result.validation.missingFields,
      reason: verified ? undefined : result.validation.reasons[0],
      extractedText: result.extractedText,
      reasons: result.validation.reasons,
    };
  }
}
