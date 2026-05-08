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

  async detectDocumentType(
    filename: string,
    content?: string,
  ): Promise<string> {
    const lower = filename.toLowerCase();

    if (lower.includes('passport')) return 'Passport';

    if (lower.includes('id') || lower.includes('identity')) {
      return 'ID Card';
    }

    if (lower.includes('birth')) return 'Birth Certificate';

    if (lower.includes('marriage')) {
      return 'Marriage Certificate';
    }

    if (lower.includes('address')) return 'Address Proof';

    if (lower.includes('license')) {
      return 'Driving License';
    }

    return 'Unknown';
  }
}