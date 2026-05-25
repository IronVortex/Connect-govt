import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Department, DepartmentDocument } from '../models/Department';
import { Service, ServiceDocument } from '../models/Service';
import {
  RequiredDocument,
  RequiredDocumentDocument,
} from '../models/RequiredDocument';

type DocumentSeed = {
  name: string;
  description: string;
};

type ServiceSeed = {
  name: string;
  description: string;
  documents: DocumentSeed[];
};

type DepartmentSeed = {
  name: string;
  description: string;
  services: ServiceSeed[];
};

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  private readonly departmentSeeds: DepartmentSeed[] = [
    {
      name: 'Health',
      description: 'Health-related services for citizens.',
      services: [
        {
          name: 'Hospital Registration',
          description: 'Register for hospital services and appointments.',
          documents: [
            {
              name: 'Aadhaar Card',
              description: 'Proof of identity issued by UIDAI.',
            },
            {
              name: 'Address Proof',
              description:
                'Utility bill, rent agreement, or government issued address proof.',
            },
            {
              name: 'Insurance Certificate',
              description: 'Valid health insurance card or certificate.',
            },
            {
              name: 'Passport Size Photo',
              description: 'Recent passport size photograph.',
            },
          ],
        },
        {
          name: 'Vaccination',
          description: 'Book vaccination services.',
          documents: [
            {
              name: 'Aadhaar Card',
              description: 'Proof of identity issued by UIDAI.',
            },
            {
              name: 'Birth Certificate',
              description: 'Age proof for minors.',
            },
            {
              name: 'Previous Vaccination Record',
              description: 'Existing vaccination record, if available.',
            },
          ],
        },
      ],
    },
    {
      name: 'Education',
      description: 'Education and school-related public services.',
      services: [
        {
          name: 'School Admission',
          description: 'Apply for school admission and enrollment.',
          documents: [
            {
              name: 'Birth Certificate',
              description:
                'Birth certificate issued by a competent authority.',
            },
            {
              name: 'Aadhaar Card',
              description: 'Student Aadhaar card or enrolment proof.',
            },
            {
              name: 'Passport Size Photo',
              description: 'Recent passport size photograph of the student.',
            },
            {
              name: 'Address Proof',
              description: 'Residential proof of parent or guardian.',
            },
            {
              name: 'Transfer Certificate',
              description:
                'Transfer certificate from previous school, if applicable.',
            },
          ],
        },
        {
          name: 'Scholarship Application',
          description: 'Submit an application for scholarships.',
          documents: [
            {
              name: 'Aadhaar Card',
              description: 'Proof of identity issued by UIDAI.',
            },
            {
              name: 'Income Certificate',
              description:
                'Family income certificate from competent authority.',
            },
            {
              name: 'Marks Card',
              description: 'Latest academic marks card or transcript.',
            },
            {
              name: 'Bank Passbook',
              description: 'Bank account proof for scholarship disbursal.',
            },
          ],
        },
      ],
    },
    {
      name: 'Transport',
      description: 'Transport and licensing services.',
      services: [
        {
          name: 'Driver\u2019s License',
          description: 'Apply for or renew a driver\u2019s license.',
          documents: [
            {
              name: 'Aadhaar Card',
              description: 'Proof of identity issued by UIDAI.',
            },
            {
              name: 'Address Proof',
              description: 'Current residential address proof.',
            },
            {
              name: 'Age Proof',
              description: 'Birth certificate, school certificate, or passport.',
            },
            {
              name: 'Passport Size Photo',
              description: 'Recent passport size photograph.',
            },
          ],
        },
        {
          name: 'Vehicle Registration',
          description: 'Register or transfer vehicle ownership.',
          documents: [
            {
              name: 'Aadhaar Card',
              description: 'Proof of identity issued by UIDAI.',
            },
            {
              name: 'PAN Card',
              description: 'Permanent Account Number card.',
            },
            {
              name: 'Invoice / Bill of Sale',
              description: 'Sales invoice from dealer.',
            },
            {
              name: 'Insurance Certificate',
              description: 'Valid motor insurance policy document.',
            },
            {
              name: 'Address Proof',
              description: 'Current residential address proof.',
            },
          ],
        },
      ],
    },
  ];

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

    await this.seedAndRepair();
  }

  private async waitForConnection(): Promise<boolean> {
    if (this.connection.readyState === 1) {
      return true;
    }

    try {
      await Promise.race([
        this.connection.asPromise(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('MongoDB connection timeout')),
            5000,
          ),
        ),
      ]);
      return Number(this.connection.readyState) === 1;
    } catch (error: any) {
      this.logger.warn(error?.message || 'MongoDB connection unavailable');
      return false;
    }
  }

  private async seedAndRepair(): Promise<void> {
    this.logger.log('Seeding and repairing database relationships');

    try {
      await this.migrateLegacyRequiredDocuments();

      for (const departmentSeed of this.departmentSeeds) {
        const department = await this.departmentModel.findOneAndUpdate(
          { name: departmentSeed.name },
          {
            $set: {
              name: departmentSeed.name,
              description: departmentSeed.description,
            },
          },
          { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
        );

        for (const serviceSeed of departmentSeed.services) {
          const service = await this.serviceModel.findOneAndUpdate(
            {
              name: serviceSeed.name,
              department: department._id,
            },
            {
              $set: {
                name: serviceSeed.name,
                description: serviceSeed.description,
                department: department._id,
                fee: (serviceSeed as any).fee ?? 250,
                estimatedProcessingTime:
                  (serviceSeed as any).estimatedProcessingTime ??
                  '7-10 working days',
                priorityLevel: (serviceSeed as any).priorityLevel ?? 0,
              },
            },
            { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true },
          );

          for (const documentSeed of serviceSeed.documents) {
            await this.requiredDocumentModel.updateOne(
              {
                service: service._id,
                name: documentSeed.name,
              },
              {
                $set: {
                  name: documentSeed.name,
                  description: documentSeed.description,
                  service: service._id,
                },
              },
              { upsert: true },
            );
          }

          await this.requiredDocumentModel.deleteMany({
            service: service._id,
            name: { $nin: serviceSeed.documents.map((document) => document.name) },
          });
        }
      }

      await this.logDocumentCoverage();
      this.logger.log('Seed and relationship repair completed');
    } catch (error: any) {
      this.logger.error(`Seed failed: ${error?.message || String(error)}`);
      throw error;
    }
  }

  private async migrateLegacyRequiredDocuments(): Promise<void> {
    const db = this.connection.db;
    if (!db) {
      return;
    }

    const legacyExists = await db
      .listCollections({ name: 'requireddocuments' })
      .hasNext();

    if (!legacyExists) {
      return;
    }

    const legacyDocuments = await db
      .collection('requireddocuments')
      .find({
        service: { $type: 'objectId' },
        name: { $type: 'string' },
      })
      .toArray();

    if (legacyDocuments.length === 0) {
      return;
    }

    const linkedServices = await this.serviceModel
      .find({ _id: { $in: legacyDocuments.map((document) => document.service) } })
      .select('_id')
      .lean();
    const serviceIds = new Set(
      linkedServices.map((service) => service._id.toString()),
    );

    let migrated = 0;
    for (const legacyDocument of legacyDocuments) {
      if (!serviceIds.has(legacyDocument.service.toString())) {
        continue;
      }

      await this.requiredDocumentModel.updateOne(
        {
          service: legacyDocument.service,
          name: legacyDocument.name,
        },
        {
          $set: {
            name: legacyDocument.name,
            description: legacyDocument.description,
            service: legacyDocument.service,
          },
        },
        { upsert: true },
      );
      migrated += 1;
    }

    this.logger.log(
      `Migrated ${migrated} required documents from legacy requireddocuments collection`,
    );
  }

  private async logDocumentCoverage(): Promise<void> {
    const services = await this.serviceModel.find().sort({ name: 1 }).lean();

    for (const service of services) {
      const count = await this.requiredDocumentModel.countDocuments({
        service: service._id,
      });

      if (count === 0) {
        this.logger.warn(
          `Service "${service.name}" has no required documents linked`,
        );
      } else {
        this.logger.log(
          `Service "${service.name}" has ${count} required documents`,
        );
      }
    }
  }
}
