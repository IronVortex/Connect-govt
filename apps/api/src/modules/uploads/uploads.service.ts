import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { UploadedDocument, UploadedDocumentDocument } from '../../models/UploadedDocument';
import { RequiredDocument, RequiredDocumentDocument } from '../../models/RequiredDocument';
import { DocumentDetectionService, DetectionStatus } from './document-detection.service';
import { ConfigService } from '@nestjs/config';
import { logger } from '../../logger';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly storageRoot: string;
  private readonly storagePrefix = 'uploads/secure';

  constructor(
    @InjectModel(UploadedDocument.name)
    private uploadModel: Model<UploadedDocumentDocument>,
    @InjectModel(RequiredDocument.name)
    private requiredDocumentModel: Model<RequiredDocumentDocument>,
    private documentDetectionService: DocumentDetectionService,
    private configService: ConfigService,
  ) {
    this.storageRoot = this.configService.get<string>('UPLOAD_STORAGE_PATH') || join(process.cwd(), 'uploads', 'secure');
    if (!existsSync(this.storageRoot)) {
      mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  async create(upload: Partial<UploadedDocument>): Promise<UploadedDocument> {
    const newUpload = new this.uploadModel(upload);
    return newUpload.save();
  }

  async getRequiredDocument(id: string): Promise<RequiredDocument | null> {
    return this.requiredDocumentModel.findById(id).exec();
  }

  async findByUser(userId: string): Promise<UploadedDocument[]> {
    return this.uploadModel
      .find({ user: userId })
      .populate('requiredDocument')
      .exec();
  }

  async findOne(uploadId: string): Promise<UploadedDocument | null> {
    return this.uploadModel
      .findById(uploadId)
      .populate('requiredDocument')
      .exec();
  }

  async findWalletDocuments(userId: string): Promise<UploadedDocument[]> {
    return this.uploadModel
      .find({
        user: userId,
        verified: true,
        expiresAt: { $gte: new Date() },
      })
      .populate('requiredDocument')
      .exec();
  }

  getFilePath(storagePath: string) {
    const absolutePath = join(process.cwd(), storagePath);
    if (!absolutePath.startsWith(this.storageRoot)) {
      throw new Error('Invalid storage path');
    }
    return absolutePath;
  }

  storeFile(file: Express.Multer.File): string {
    const extension = extname(file.originalname) || `.${file.mimetype.split('/').pop()}`;
    const safeName = basename(file.originalname, extension).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${Date.now()}-${safeName}${extension}`;
    const relativePath = join(this.storagePrefix, filename);
    const absolutePath = join(process.cwd(), relativePath);

    const directory = join(this.storageRoot);
    if (!existsSync(directory)) {
      mkdirSync(directory, { recursive: true });
    }

    writeFileSync(absolutePath, file.buffer);
    return relativePath;
  }

  detectDocumentType(filename: string, content?: string): string {
    return (
      this.getTypeFromText(filename) ??
      this.getTypeFromText(content || '') ??
      'Unknown'
    );
  }

  async analyzeUpload(
    filePath: string,
    expectedDocumentType?: string,
    mimeType?: string,
  ): Promise<{
    detectedType: string;
    status: DetectionStatus;
    confidence: number;
    extractedText: string;
    reasons: string[];
  }> {
    const absolutePath = this.getFilePath(filePath);
    const result = await this.documentDetectionService.detectDocument(
      absolutePath,
      mimeType || 'application/pdf',
      expectedDocumentType,
    );

    return {
      detectedType: result.detectedType,
      status: result.status,
      confidence: result.confidence,
      extractedText: result.extractedText,
      reasons: result.reasons,
    };
  }

  private getTypeFromText(text: string): string | null {
    const lower = text.toLowerCase();

    if (lower.includes('aadhaar') || lower.includes('aadhar')) {
      return 'Aadhaar Card';
    }
    if (lower.includes('pan')) {
      return 'PAN Card';
    }
    if (lower.includes('insurance')) {
      return 'Insurance';
    }
    if (lower.includes('invoice')) {
      return 'Invoice';
    }

    return null;
  }
}
