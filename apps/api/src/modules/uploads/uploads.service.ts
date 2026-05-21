import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UploadedDocument,
  UploadedDocumentDocument,
} from '../../models/UploadedDocument';

@Injectable()
export class UploadsService {
  constructor(
    @InjectModel(UploadedDocument.name)
    private uploadModel: Model<UploadedDocumentDocument>,
  ) {}

  async create(
    upload: Partial<UploadedDocument>,
  ): Promise<UploadedDocument> {
    const newUpload = new this.uploadModel(upload);
    return newUpload.save();
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

  private getTypeFromText(text: string): string | null {
    const lower = text.toLowerCase();

    if (lower.includes('aadhaar') || lower.includes('aadhar')) {
      return 'Aadhaar';
    }
    if (lower.includes('pan')) {
      return 'PAN';
    }
    if (lower.includes('insurance')) {
      return 'Insurance';
    }
    if (lower.includes('invoice')) {
      return 'Invoice';
    }

    return null;
  }

  detectDocumentType(
    filename: string,
    content?: string,
  ): string {
    return (
      this.getTypeFromText(filename) ??
      this.getTypeFromText(content || '') ??
      'Unknown'
    );
  }

  analyzeUpload(
    filename: string,
    expectedDocumentType?: string,
    content?: string,
  ): { documentType: string; status: 'DETECTED' | 'MISMATCH' | 'UNKNOWN' } {
    const detectedType = this.detectDocumentType(filename, content);

    if (detectedType === 'Unknown') {
      return { documentType: 'Unknown', status: 'UNKNOWN' };
    }

    if (
      expectedDocumentType &&
      detectedType.toLowerCase() !== expectedDocumentType.toLowerCase()
    ) {
      return { documentType: detectedType, status: 'MISMATCH' };
    }

    return { documentType: detectedType, status: 'DETECTED' };
  }
}