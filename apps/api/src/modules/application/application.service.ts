import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UploadedDocument, UploadedDocumentDocument } from '../../models/UploadedDocument';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(UploadedDocument.name) private uploadModel: Model<UploadedDocumentDocument>,
  ) {}

  async getSummaryForUser(userId: string) {
    const uploads = await this.uploadModel.find({ user: userId }).populate('requiredDocument').exec();
    const total = uploads.length;
    const detected = uploads.filter((item) => item.detectionStatus === 'DETECTED').length;
    const unknown = uploads.filter((item) => item.detectionStatus === 'UNKNOWN').length;
    const mismatch = uploads.filter((item) => item.detectionStatus === 'MISMATCH').length;
    return {
      totalDocuments: total,
      detected,
      unknown,
      mismatch,
      uploads,
      tips: [
        'Upload clear scans or photos of your documents.',
        'Use file names that match the document type for faster detection.',
        'Review status after every upload to ensure all documents are accepted.',
      ],
    };
  }
}
