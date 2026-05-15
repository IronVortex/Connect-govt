import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
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
      throw new InternalServerErrorException('Unable to load departments');
    }
  }

  async findOne(id: string): Promise<DepartmentDocument> {
    if (!isValidObjectId(id)) {
      this.logger.warn(`findOne invalid ObjectId: ${id}`);
      throw new BadRequestException('Invalid department id');
    }

    try {
      const department = await this.departmentModel.findById(id).exec();
      if (!department) {
        throw new NotFoundException(`Department with id ${id} not found`);
      }
      return department;
    } catch (error: any) {
      this.logger.error(`findOne failed: ${error?.message || String(error)}`);
      throw error instanceof NotFoundException ? error : new NotFoundException('Department not found');
    }
  }

  async create(createDepartmentDto: { name: string; description?: string }): Promise<DepartmentDocument> {
    try {
      const createdDepartment = new this.departmentModel(createDepartmentDto);
      const savedDepartment = await createdDepartment.save();
      this.logger.log(`Department created with id ${savedDepartment._id}`);
      return savedDepartment;
    } catch (error: any) {
      this.logger.error(`create failed: ${error?.message || String(error)}`);
      throw error;
    }
  }

  async findServicesByDepartment(departmentId: string): Promise<ServiceDocument[]> {
    if (!isValidObjectId(departmentId)) {
      this.logger.warn(`findServicesByDepartment invalid ObjectId: ${departmentId}`);
      throw new BadRequestException('Invalid department id');
    }

    try {
      const department = await this.departmentModel.exists({ _id: departmentId });
      if (!department) {
        throw new NotFoundException(`Department with id ${departmentId} not found`);
      }

      const services = await this.serviceModel
        .find({ department: new Types.ObjectId(departmentId) })
        .populate('department')
        .exec();
      this.logger.log(`findServicesByDepartment returned ${services?.length || 0} services`);
      return services || [];
    } catch (error: any) {
      this.logger.error(`findServicesByDepartment failed: ${error?.message || String(error)}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException('Unable to load department services');
    }
  }
}
