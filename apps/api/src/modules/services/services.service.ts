import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Service, ServiceDocument } from '../../models/Service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name)
    private serviceModel: Model<ServiceDocument>,
  ) {}

  async findAll(): Promise<ServiceDocument[]> {
    return this.serviceModel.find().populate('department').exec();
  }

  async findByDepartment(
    departmentId: string,
  ): Promise<ServiceDocument[]> {
    return this.serviceModel
      .find({
        department: new Types.ObjectId(departmentId),
      })
      .populate('department')
      .exec();
  }

  async findOne(id: string): Promise<ServiceDocument> {
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
    const newService = new this.serviceModel({
      name: service.name,
      description: service.description,
      department: new Types.ObjectId(service.department),
    });

    return newService.save();
  }
}