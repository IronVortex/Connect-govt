import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from '../models/Department';
import { Service, ServiceDocument } from '../models/Service';
import {
  RequiredDocument,
  RequiredDocumentDocument,
} from '../models/RequiredDocument';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(RequiredDocument.name)
    private readonly requiredDocumentModel: Model<RequiredDocumentDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    const connected = await this.waitForConnection();
    if (!connected) {
      this.logger.warn('Seed skipped because MongoDB is not connected');
      return;
    }

    await this.seedIfEmpty();
  }

  private async waitForConnection(): Promise<boolean> {
    if (this.connection.readyState === 1) {
      return true;
    }

    try {
      await Promise.race([
        this.connection.asPromise(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MongoDB connection timeout')), 5000),
        ),
      ]);
      return Number(this.connection.readyState) === 1;
    } catch (error: any) {
      this.logger.warn(error?.message || 'MongoDB connection unavailable');
      return false;
    }
  }

  private async seedIfEmpty(): Promise<void> {
    this.logger.log('🌱 Seeding database');

    try {
      const hasDepartments = await this.departmentModel.exists({});
      if (hasDepartments) {
        this.logger.log('⏭️ Seed skipped — data already present');
        return;
      }

      const [healthDepartment, educationDepartment, transportDepartment] =
        await this.departmentModel.insertMany([
          {
            name: 'Health',
            description: 'Health-related services for citizens.',
          },
          {
            name: 'Education',
            description: 'Education and school-related public services.',
          },
          {
            name: 'Transport',
            description: 'Transport and licensing services.',
          },
        ]);

      await this.serviceModel.insertMany([
        {
          name: 'Hospital Registration',
          description: 'Register for hospital services and appointments.',
          department: new Types.ObjectId(healthDepartment._id),
        },
        {
          name: 'Vaccination',
          description: 'Book vaccination services.',
          department: new Types.ObjectId(healthDepartment._id),
        },
        {
          name: 'School Admission',
          description: 'Apply for school admission and enrollment.',
          department: new Types.ObjectId(educationDepartment._id),
        },
        {
          name: 'Scholarship Application',
          description: 'Submit an application for scholarships.',
          department: new Types.ObjectId(educationDepartment._id),
        },
        {
          name: 'Driver’s License',
          description: 'Apply for or renew a driver’s license.',
          department: new Types.ObjectId(transportDepartment._id),
        },
        {
          name: 'Vehicle Registration',
          description: 'Register or transfer vehicle ownership.',
          department: new Types.ObjectId(transportDepartment._id),
        },
      ]);

      this.logger.log('✅ Seed completed');
    } catch (error: any) {
      this.logger.error(`❌ Seed failed: ${error?.message || String(error)}`);
      throw error;
    }
  }
}
