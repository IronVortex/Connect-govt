import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { RequiredDocument, RequiredDocumentDocument } from '../../models/RequiredDocument';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(RequiredDocument.name) private documentModel: Model<RequiredDocumentDocument>,
  ) {}

  async findAll(): Promise<RequiredDocument[]> {
    try {
      const documents = await this.documentModel
        .find()
        .populate('service')
        .exec();
      return documents || [];
    } catch (error: any) {
      this.logger.error(`findAll failed: ${error?.message || String(error)}`);
      throw new InternalServerErrorException('Unable to load documents');
    }
  }

  async findByService(serviceId: string): Promise<RequiredDocument[]> {
    this.logger.log(`[DocumentsService] findByService called with serviceId: ${serviceId}`);
    if (!isValidObjectId(serviceId)) {
      this.logger.warn(`[DocumentsService] Invalid ObjectId: ${serviceId}`);
      throw new BadRequestException('Invalid service id');
    }
    const objectId = new Types.ObjectId(serviceId);
    const docs = await this.documentModel
      .find({ service: objectId })
      .populate('service')
      .exec();
    this.logger.log(`[DocumentsService] Found ${docs.length} documents for service ${serviceId}`);
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
}
