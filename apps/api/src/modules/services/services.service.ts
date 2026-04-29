import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../../models/Service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name)
    private serviceModel: Model<ServiceDocument>,
  ) {}

  async findAll(): Promise<Service[]> {
    return this.serviceModel.find().populate('department').lean().exec();
  }

  async findByDepartment(departmentId: string): Promise<Service[]> {
    return this.serviceModel
      .find({ department: departmentId })
      .populate('department')
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<Service | null> {
    const service = await this.serviceModel
      .findById(id)
      .populate('department')
      .lean()
      .exec();

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async create(service: Partial<Service>): Promise<ServiceDocument> {
    const newService = new this.serviceModel(service);
    return newService.save();
  }
}