import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from '../../models/Department';
import { Service, ServiceDocument } from '../../models/Service';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
  ) {
    this.logger.log(`✅ DepartmentModel injected: ${!!departmentModel}`);
    this.logger.log(`✅ ServiceModel injected: ${!!serviceModel}`);
  }

  async findAll(): Promise<DepartmentDocument[]> {
    try {
      const departments = await this.departmentModel.find().exec();
      this.logger.log(`findAll returned ${departments?.length || 0} departments`);
      return departments || [];
    } catch (error: any) {
      this.logger.error(`findAll failed: ${error?.message || String(error)}`);
      return [];
    }
  }

  async findServicesByDepartment(departmentId: string): Promise<ServiceDocument[]> {
    try {
      const services = await this.serviceModel
        .find({ department: departmentId })
        .populate('department')
        .exec();
      this.logger.log(`findServicesByDepartment returned ${services?.length || 0} services`);
      return services || [];
    } catch (error: any) {
      this.logger.error(`findServicesByDepartment failed: ${error?.message || String(error)}`);
      return [];
    }
  }

  async findOne(id: string): Promise<DepartmentDocument> {
    const department = await this.departmentModel.findById(id).exec();
    if (!department) {
      throw new NotFoundException(`Department with id ${id} not found`);
    }
    return department;
  }

  async create(createDepartmentDto: { name: string; description?: string }): Promise<DepartmentDocument> {
    const createdDepartment = new this.departmentModel(createDepartmentDto);
    return createdDepartment.save();
  }
}
