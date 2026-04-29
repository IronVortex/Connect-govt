import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RequiredDocument, RequiredDocumentDocument } from '../../models/RequiredDocument';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(RequiredDocument.name) private documentModel: Model<RequiredDocumentDocument>,
  ) {}

  async findAll(): Promise<RequiredDocument[]> {
    return this.documentModel.find().populate('service').exec();
  }

  async findByService(serviceId: string): Promise<RequiredDocument[]> {
    return this.documentModel.find({ service: serviceId }).exec();
  }

  async findOne(id: string): Promise<RequiredDocument | null> {
    return this.documentModel.findById(id).populate('service').exec();
  }

  async create(document: Partial<RequiredDocument>): Promise<RequiredDocumentDocument> {
    const newDocument = new this.documentModel(document);
    return newDocument.save();
  }
}
