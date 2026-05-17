import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Service, ServiceDocument } from '../../models/Service';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectModel(Service.name)
    private serviceModel: Model<ServiceDocument>,
  ) {}

  async findAll(): Promise<ServiceDocument[]> {
    try {
      const services = await this.serviceModel
        .find()
        .populate('department')
        .exec();
      return services || [];
    } catch (error: any) {
      this.logger.error(`findAll failed: ${error?.message || String(error)}`);
      throw new InternalServerErrorException('Unable to load services');
    }
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<ServiceDocument[]> {
    if (!isValidObjectId(departmentId)) {
      throw new BadRequestException('Invalid department id');
    }

    return this.serviceModel
      .find({
        department: new Types.ObjectId(departmentId),
      })
      .populate('department')
      .exec();
  }

  async findOne(id: string): Promise<ServiceDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid service id');
    }

    const service = await this.serviceModel
      .findById(id)
      .populate('department')
      .exec();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async create(service: {
    name: string;
    description?: string;
    department: string;
  }): Promise<ServiceDocument> {
    if (!isValidObjectId(service.department)) {
      throw new BadRequestException('Invalid department id');
    }

    const newService = new this.serviceModel({
      name: service.name,
      description: service.description,
      department: new Types.ObjectId(service.department),
    });

    return newService.save();
  }
}
