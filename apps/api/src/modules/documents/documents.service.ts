import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
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
    if (!isValidObjectId(serviceId)) {
      throw new BadRequestException('Invalid service id');
    }

    return this.documentModel.find({ service: serviceId }).exec();
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
