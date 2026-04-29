import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Department, DepartmentDocument } from '../../models/Department';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectModel(Department.name)
    private departmentModel: Model<DepartmentDocument>,
  ) {}

  async findAll(): Promise<Department[]> {
    return this.departmentModel.find().lean().exec();
  }

  async findOne(id: string): Promise<Department | null> {
    const department = await this.departmentModel.findById(id).lean().exec();

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async create(
    department: Partial<Department>,
  ): Promise<DepartmentDocument> {
    const newDepartment = new this.departmentModel(department);
    return newDepartment.save();
  }
}