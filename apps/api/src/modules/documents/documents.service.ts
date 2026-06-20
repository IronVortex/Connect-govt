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
  DOCUMENT_TYPE_CATEGORIES,
  DocumentIntelligenceResponse,
  KycDocumentType,
  LegacyAnalysisResult,
  NO_TEXT_FOUND,
  PipelineTimings,
  VisionClassificationResult,
  normalizeDocumentType,
  typesMatchExpected,
} from './types/document-intelligence.types';

export interface ProcessDocumentInput {
  buffer: Buffer;
  mimeType?: string;
  filename?: string;
  expectedDocumentType?: string;
  userId?: string;
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
   * Pipeline: Upload -> OCR -> Document Detection -> Validation -> Verification.
   * OCR runs before classification because deterministic OCR text rules are authoritative.
   */
  async processDocument(input: ProcessDocumentInput): Promise<DocumentIntelligenceResponse> {
    const totalStart = performance.now();
    const { buffer, mimeType, expectedDocumentType, userId, persist = false } = input;

    if (!buffer?.length) {
      throw new BadRequestException('File content is required for document intelligence processing');
    }

    this.logger.log(
      `[UPLOAD] Start â€” file="${input.filename}" mimeType="${mimeType}" expectedType="${expectedDocumentType}"`,
    );

    // â”€â”€ Step 1: Preprocessing & OCR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tOcrStart = performance.now();
    const ocrResult = await this.ocrService.extractFromFile(buffer, mimeType);
    const ocrMs = Math.round(performance.now() - tOcrStart);
    this.logger.log(
      `[OCR] ${ocrMs}ms â€” chars=${ocrResult.text?.length ?? 0} ocrConfidence=${ocrResult.confidence?.toFixed(1)}%`,
    );

    // â”€â”€ Step 2: Text Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const extractedText =
      ocrResult.text && ocrResult.text !== NO_TEXT_FOUND
        ? ocrResult.text.slice(0, 5000)
        : NO_TEXT_FOUND;

    // â”€â”€ Step 3: Document Classification (using OCR text as primary signal) â”€â”€â”€
    const tClassStart = performance.now();
    const initialClassification = await this.visionClassificationService.classify(
      buffer,
      mimeType,
      expectedDocumentType,
      extractedText,
    );
    const classification = this.applyDetectionFallbacks(
      initialClassification,
      extractedText,
      ocrResult.confidence,
      expectedDocumentType,
      input.filename,
    );
    const classificationMs = Math.round(performance.now() - tClassStart);

    this.logger.log(
      `[CLASSIFICATION] ${classificationMs}ms â€” type=${classification.documentType} ` +
        `confidence=${classification.confidence}% matchesExpected=${classification.matchesExpectedType}`,
    );

    // â”€â”€ Step 4: Field Extraction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const extractedData = this.validationService.parseFields(
      classification.documentType,
      extractedText,
    );

    // â”€â”€ Step 5: Validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tValidStart = performance.now();
    const validation = this.validationService.validate(
      classification.documentType,
      ocrResult.text,
      classification.confidence,
      expectedDocumentType,
    );
    const validationMs = Math.round(performance.now() - tValidStart);
    this.logger.log(
      `[VALIDATION] ${validationMs}ms â€” valid=${validation.valid} score=${validation.score}`,
    );

    // â”€â”€ Step 6: Final Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    this.logger.log(
      `[DOCUMENT]\nExpected=${expectedDocumentType || 'NOT_SPECIFIED'}\n` +
        `Detected=${classification.documentType}\n` +
        `OCR=${Math.round(ocrResult.confidence)}\n` +
        `Classification=${classification.confidence}\n` +
        `Status=${verification.status}`,
    );

    const totalMs = Math.round(performance.now() - totalStart);
    const timings: PipelineTimings = {
      preprocess: 0,
      classification: classificationMs,
      ocr: ocrMs,
      validation: validationMs,
      total: totalMs,
    };

    // Structured JSON log for the pipeline result
    const logObj = {
      expectedType: expectedDocumentType || 'NOT_SPECIFIED',
      detectedType: classification.documentType,
      ocrConfidence: Math.round(ocrResult.confidence),
      classificationConfidence: classification.confidence,
      verificationStatus: verification.status,
      reason: verification.reasons?.join(', ') || 'N/A',
    };
    this.logger.log(`[PIPELINE_RESULT] ${JSON.stringify(logObj, null, 2)}`);

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
      // â”€â”€ Include verification result for complete audit trail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      verificationStatus: result.verification?.status,
      verified: result.verification?.verified,
      confidence: result.verification?.confidence,
      detectionReasons: result.verification?.reasons,
      matchesExpectedType: result.verification?.matchesExpectedType,
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
      detectedType: result.documentType,
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

  private applyDetectionFallbacks(
    classification: VisionClassificationResult,
    ocrText: string,
    ocrConfidence: number,
    expectedDocumentType?: string,
    filename?: string,
  ): VisionClassificationResult {
    if (classification.confidence >= 80 && classification.documentType !== 'UNKNOWN') {
      return classification;
    }

    const textDetection = this.detectFromText(ocrText);
    if (textDetection) {
      return this.buildClassification(
        textDetection.type,
        90,
        textDetection.features,
        'OCR text pattern detection',
        expectedDocumentType,
      );
    }

    if (classification.documentType === 'UNKNOWN' && ocrConfidence < 60) {
      const filenameDetection = this.detectFromFilename(filename);
      if (filenameDetection) {
        return this.buildClassification(
          filenameDetection,
          80,
          ['filename_fallback'],
          'Filename fallback detection',
          expectedDocumentType,
        );
      }
    }

    const normalizedExpected = normalizeDocumentType(expectedDocumentType);
    if (classification.documentType === 'UNKNOWN' && normalizedExpected) {
      const expectedAssist = this.textSupportsType(ocrText, normalizedExpected);
      if (expectedAssist) {
        return this.buildClassification(
          normalizedExpected,
          85,
          ['expected_type_assist', ...expectedAssist],
          'Expected type assist from OCR keywords',
          expectedDocumentType,
        );
      }
    }

    return classification;
  }

  private detectFromText(text: string): { type: KycDocumentType; features: string[] } | null {
    if (!text || text === NO_TEXT_FOUND) return null;

    const matches: Array<{ type: KycDocumentType; score: number; features: string[] }> = [];
    const add = (type: KycDocumentType, score: number, features: string[]) => {
      if (score > 0) matches.push({ type, score, features });
    };

    const aadhaar = this.collectTextSignals(text, 'AADHAAR');
    add('AADHAAR', aadhaar.length, aadhaar);
    const pan = this.collectTextSignals(text, 'PAN');
    add('PAN', pan.length, pan);
    const passport = this.collectTextSignals(text, 'PASSPORT');
    add('PASSPORT', passport.length, passport);
    const dl = this.collectTextSignals(text, 'DRIVING_LICENSE');
    add('DRIVING_LICENSE', dl.length, dl);
    const birth = this.collectTextSignals(text, 'BIRTH_CERTIFICATE');
    add('BIRTH_CERTIFICATE', birth.length, birth);
    const marks = this.collectTextSignals(text, 'MARKS_CARD');
    add('MARKS_CARD', marks.length, marks);
    const bank = this.collectTextSignals(text, 'BANK_PASSBOOK');
    add('BANK_PASSBOOK', bank.length, bank);

    matches.sort((a, b) => b.score - a.score);
    const best = matches[0];
    return best && best.score > 0 ? { type: best.type, features: best.features } : null;
  }

  private textSupportsType(text: string, type: KycDocumentType): string[] | null {
    const signals = this.collectTextSignals(text, type);
    return signals.length > 0 ? signals : null;
  }

  private collectTextSignals(text: string, type: KycDocumentType): string[] {
    const upper = text.toUpperCase();
    const features: string[] = [];
    const keyword = (value: string, feature: string) => {
      if (upper.includes(value.toUpperCase())) features.push(feature);
    };
    const pattern = (value: RegExp, feature: string) => {
      if (value.test(text)) features.push(feature);
    };

    switch (type) {
      case 'AADHAAR':
        keyword('Aadhaar', 'aadhaar_keyword');
        keyword('Unique Identification Authority of India', 'uidai_full_keyword');
        keyword('UIDAI', 'uidai_keyword');
        keyword('Government of India', 'government_of_india');
        pattern(/\b\d{4}\s?\d{4}\s?\d{4}\b/, 'aadhaar_number_pattern');
        break;
      case 'PAN':
        keyword('INCOME TAX DEPARTMENT', 'income_tax_department');
        keyword('Permanent Account Number', 'permanent_account_number');
        keyword('PAN', 'pan_keyword');
        pattern(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/i, 'pan_number_pattern');
        break;
      case 'PASSPORT':
        keyword('Passport', 'passport_keyword');
        keyword('Republic of India', 'republic_of_india');
        keyword('Passport No', 'passport_no');
        keyword('Nationality', 'nationality');
        break;
      case 'DRIVING_LICENSE':
        keyword('Driving Licence', 'driving_licence');
        keyword('Driving License', 'driving_license');
        keyword('DL No', 'dl_no');
        keyword('Licence No', 'licence_no');
        break;
      case 'BIRTH_CERTIFICATE':
        keyword('Birth Certificate', 'birth_certificate');
        keyword('Date of Birth', 'date_of_birth');
        keyword('Registrar', 'registrar');
        break;
      case 'MARKS_CARD':
        keyword('Marks Card', 'marks_card');
        keyword('Marksheet', 'marksheet');
        keyword('Semester', 'semester');
        keyword('Register Number', 'register_number');
        keyword('Examination', 'examination');
        break;
      case 'BANK_PASSBOOK':
        keyword('Passbook', 'passbook');
        keyword('Account Number', 'account_number');
        keyword('IFSC', 'ifsc');
        keyword('Branch', 'branch');
        break;
      default:
        break;
    }

    return features;
  }

  private detectFromFilename(filename?: string): KycDocumentType | null {
    const normalized = (filename || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (!normalized) return null;
    if (/aadhaar|aadhar/.test(normalized)) return 'AADHAAR';
    if (/(^|_)pan(_|card|$)/.test(normalized)) return 'PAN';
    if (/passport/.test(normalized)) return 'PASSPORT';
    if (/driving_?licen[cs]e|(^|_)dl(_|$)/.test(normalized)) return 'DRIVING_LICENSE';
    if (/birth_?certificate/.test(normalized)) return 'BIRTH_CERTIFICATE';
    if (/marks_?card|marksheet/.test(normalized)) return 'MARKS_CARD';
    if (/passbook|bank_?passbook/.test(normalized)) return 'BANK_PASSBOOK';
    return null;
  }

  private buildClassification(
    documentType: KycDocumentType,
    confidence: number,
    features: string[],
    reasoning: string,
    expectedDocumentType?: string,
  ): VisionClassificationResult {
    const expected = normalizeDocumentType(expectedDocumentType);
    return {
      documentType,
      confidence,
      category: DOCUMENT_TYPE_CATEGORIES[documentType],
      reasoning,
      detectedFeatures: features,
      matchesExpectedType: typesMatchExpected(documentType, expected),
    };
  }
}
