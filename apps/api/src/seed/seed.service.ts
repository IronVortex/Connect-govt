import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    @InjectModel(Department.name)
    private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(RequiredDocument.name)
    private readonly requiredDocumentModel: Model<RequiredDocumentDocument>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedIfEmpty();
  }

  private async seedIfEmpty(): Promise<void> {
    this.logger.log('🌱 Seeding database...');

    try {
      const hasDepartments = await this.departmentModel.exists({});
      if (hasDepartments) {
        this.logger.log('⏭️ Seed skipped — data already present');
        return;
      }

      const [rtoDepartment, passportDepartment, drivingAuthorityDepartment, taxDepartment] =
        await this.departmentModel.insertMany([
          {
            name: 'Transport Department (RTO)',
            description:
              'Vehicle registration and transport-related citizen services.',
          },
          {
            name: 'Passport Department',
            description:
              'Passport issuance, renewal, and verification services.',
          },
          {
            name: 'Driving License Authority',
            description:
              'Driving license issuance, renewal, and compliance services.',
          },
          {
            name: 'Tax Department',
            description:
              'Tax identity, filings, and PAN-related public services.',
          },
        ]);

      const [
        newCarRegistration,
        drivingLicenseRenewal,
        passportApplication,
        panCardIssuance,
      ] = await this.serviceModel.insertMany([
        {
          name: 'New Car Registration',
          description: 'Register a newly purchased car.',
          department: new Types.ObjectId(rtoDepartment._id),
        },
        {
          name: 'Driving License Renewal',
          description: 'Renew your existing driving license.',
          department: new Types.ObjectId(drivingAuthorityDepartment._id),
        },
        {
          name: 'Passport Application',
          description: 'Apply for a new passport.',
          department: new Types.ObjectId(passportDepartment._id),
        },
        {
          name: 'PAN Card Issuance',
          description: 'Request a new PAN card.',
          department: new Types.ObjectId(taxDepartment._id),
        },
      ]);

      await this.requiredDocumentModel.insertMany([
        {
          name: 'Aadhaar',
          description: 'Government-issued Aadhaar copy.',
          service: new Types.ObjectId(newCarRegistration._id),
        },
        {
          name: 'PAN',
          description: 'Valid PAN card copy.',
          service: new Types.ObjectId(newCarRegistration._id),
        },
        {
          name: 'Insurance',
          description: 'Valid vehicle insurance document.',
          service: new Types.ObjectId(newCarRegistration._id),
        },
        {
          name: 'Invoice',
          description: 'Vehicle purchase invoice from dealer.',
          service: new Types.ObjectId(newCarRegistration._id),
        },
        {
          name: 'Driving Test Certificate',
          description: 'Driving test pass certificate.',
          service: new Types.ObjectId(drivingLicenseRenewal._id),
        },
        {
          name: 'Aadhaar',
          description: 'Government-issued Aadhaar copy.',
          service: new Types.ObjectId(drivingLicenseRenewal._id),
        },
        {
          name: 'Birth Certificate',
          description: 'Official birth certificate copy.',
          service: new Types.ObjectId(passportApplication._id),
        },
        {
          name: 'Address Proof',
          description: 'Address proof such as utility bill or rent agreement.',
          service: new Types.ObjectId(passportApplication._id),
        },
        {
          name: 'Aadhaar',
          description: 'Government-issued Aadhaar copy.',
          service: new Types.ObjectId(passportApplication._id),
        },
        {
          name: 'Aadhaar',
          description: 'Government-issued Aadhaar copy.',
          service: new Types.ObjectId(panCardIssuance._id),
        },
        {
          name: 'PAN',
          description: 'Existing PAN or PAN acknowledgment document.',
          service: new Types.ObjectId(panCardIssuance._id),
        },
      ]);

      this.logger.log('✅ Seed complete');
    } catch (error: any) {
      this.logger.error(`❌ Seed failed: ${error?.message || String(error)}`);
      throw error;
    }
  }
}
