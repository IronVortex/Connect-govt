import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, extname, basename } from 'path';
import { UploadedDocument, UploadedDocumentDocument } from '../../models/UploadedDocument';
import { RequiredDocument, RequiredDocumentDocument } from '../../models/RequiredDocument';
import { DocumentsService } from '../documents/documents.service';
import { ConfigService } from '@nestjs/config';
import type { LegacyAnalysisResult } from '../documents/types/document-intelligence.types';

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
    private documentsService: DocumentsService,
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
      .find({ user: new Types.ObjectId(userId) })
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
        user: new Types.ObjectId(userId),
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

  async analyzeUpload(
    filePath: string,
    expectedDocumentType?: string,
    mimeType?: string,
    fileBuffer?: Buffer,
  ): Promise<LegacyAnalysisResult> {
    const filename = basename(filePath);
    this.logger.log(
      `Analyzing upload via document intelligence pipeline: filename="${filename}", mimeType="${mimeType}", expectedType="${expectedDocumentType}"`,
    );

    let buffer = fileBuffer;
    if (!buffer || buffer.length === 0) {
      try {
        const absolutePath = this.getFilePath(filePath);
        if (existsSync(absolutePath)) {
          buffer = require('fs').readFileSync(absolutePath);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to read file from path ${filePath}: ${message}`);
      }
    }

    return this.documentsService.analyzeUpload(
      filename,
      expectedDocumentType,
      mimeType,
      buffer,
    );
  }
}
