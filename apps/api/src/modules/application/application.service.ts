import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UploadedDocument, UploadedDocumentDocument } from '../../models/UploadedDocument';
import { Application, ApplicationDocument, APPLICATION_STATUSES, ApplicationStatus } from '../../models/Application';
import { Service, ServiceDocument } from '../../models/Service';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectModel(UploadedDocument.name) private uploadModel: Model<UploadedDocumentDocument>,
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async getSummaryForUser(userId: string) {
    const uploads = await this.uploadModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({ path: 'requiredDocument', populate: { path: 'service' } })
      .exec();

    const total = uploads.length;
    const matched = uploads.filter((item) => item.detectionStatus === 'MATCHED').length;
    const detected = uploads.filter((item) => item.detectionStatus === 'DETECTED').length;
    const needsReview = uploads.filter((item) => item.detectionStatus === 'NEEDS_REVIEW').length;
    const mismatched = uploads.filter((item) => item.detectionStatus === 'MISMATCHED').length;
    const unknown = uploads.filter((item) => item.detectionStatus === 'UNKNOWN').length;

    const feesMap: Record<string, { serviceId: string; name: string; fee?: number; estimatedProcessingTime?: string }> = {};

    for (const u of uploads) {
      const req = u.requiredDocument as any;
      const svc = req?.service as any;
      if (svc && svc._id) {
        const id = svc._id.toString();
        if (!feesMap[id]) {
          feesMap[id] = {
            serviceId: id,
            name: svc.name || String(svc._id),
            fee: svc.fee ?? 0,
            estimatedProcessingTime: svc.estimatedProcessingTime ?? '7-10 working days',
          };
        }
      }
    }

    const feesByService = Object.values(feesMap);
    const totalFee = feesByService.reduce((s, f) => s + (f.fee ?? 0), 0);

    function parseUpperBound(text?: string) {
      if (!text) return 0;
      const m = text.match(/(\d+)\s*-\s*(\d+)/);
      if (m) return parseInt(m[2], 10);
      const single = text.match(/(\d+)/);
      return single ? parseInt(single[1], 10) : 0;
    }

    const estimatedUpper = feesByService.length ? Math.max(...feesByService.map((f) => parseUpperBound(f.estimatedProcessingTime))) : 0;
    const estimatedProcessingTime = estimatedUpper ? `${estimatedUpper} working days` : feesByService[0]?.estimatedProcessingTime || '7-10 working days';

    return {
      totalDocuments: total,
      matched,
      detected,
      needsReview,
      mismatched,
      unknown,
      uploads,
      tips: [
        'Upload clear, high-contrast scans or photos of your documents.',
        'Ensure documents are well-lit and all text is readable.',
        'Documents marked "Review" need your attention before final submission.',
        'Use original/official documents rather than photocopies for better detection.',
      ],
      feesByService,
      totalFee,
      estimatedProcessingTime,
    };
  }

  async createApplication(userId: string, serviceId: string, notes?: string): Promise<Application> {
    const service = await this.serviceModel.findById(serviceId).exec();
    if (!service) {
      throw new NotFoundException('Selected service not found.');
    }

    const existing = await this.applicationModel.findOne({ user: new Types.ObjectId(userId), service: service._id, deletedAt: null }).exec();
    if (existing) {
      throw new BadRequestException('An application for this service already exists.');
    }

    const appId = await this.generateAppId(service.name);
    const application = new this.applicationModel({
      user: new Types.ObjectId(userId),
      service: service._id,
      notes,
      status: 'DRAFT',
      appId,
    });
    return application.save();
  }

  async getApplicationsForUser(userId: string, userRole: string) {
    const query = userRole === 'admin' ? { deletedAt: null } : { user: new Types.ObjectId(userId), deletedAt: null };
    return this.applicationModel.find(query).populate('service').populate('uploadedDocuments').exec();
  }

  async getApplicationById(applicationId: string, userId: string, userRole: string) {
    const application = await this.applicationModel
      .findOne({ _id: applicationId, deletedAt: null })
      .populate('service')
      .populate('uploadedDocuments')
      .exec();

    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    if (userRole !== 'admin' && application.user.toString() !== userId) {
      throw new ForbiddenException('You do not have access to this application.');
    }

    return application;
  }

  async updateApplication(
    applicationId: string,
    userId: string,
    userRole: string,
    updates: Partial<Pick<Application, 'notes' | 'status'>>,
  ) {
    const application = await this.applicationModel.findOne({ _id: applicationId, deletedAt: null }).exec();
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const isOwner = application.user.toString() === userId;
    if (!isOwner && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to update this application.');
    }

    if (updates.status) {
      const newStatus = updates.status as ApplicationStatus;
      if (!APPLICATION_STATUSES.includes(newStatus)) {
        throw new BadRequestException('Invalid application status.');
      }

      if (userRole !== 'admin') {
        const allowedOwnerTransitions: ApplicationStatus[] = ['DRAFT', 'SUBMITTED', 'NEEDS_CORRECTION'];
        if (!allowedOwnerTransitions.includes(newStatus)) {
          throw new ForbiddenException('Only administrators can set this status.');
        }
        if (!['DRAFT', 'NEEDS_CORRECTION'].includes(application.status) && newStatus === 'SUBMITTED') {
          throw new BadRequestException('Only draft or correction-needed applications can be submitted.');
        }
      }

      if (newStatus === 'SUBMITTED') {
        const userUploads = await this.uploadModel
          .find({ user: application.user })
          .populate('requiredDocument')
          .exec();
        
        const appUploads = userUploads.filter(u => {
          const reqDoc = u.requiredDocument as any;
          return reqDoc && reqDoc.service && reqDoc.service.toString() === application.service.toString();
        });
        
        application.uploadedDocuments = appUploads.map(u => u._id);
      }

      application.status = newStatus;
    }

    if (updates.notes !== undefined) {
      application.notes = updates.notes;
    }

    return application.save();
  }

  async softDeleteApplication(applicationId: string, userId: string, userRole: string) {
    const application = await this.applicationModel.findOne({ _id: applicationId, deletedAt: null }).exec();
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    const isOwner = application.user.toString() === userId;
    if (!isOwner && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to delete this application.');
    }

    application.deletedAt = new Date();
    return application.save();
  }

  async getStatusTimeline(applicationId: string) {
    const application = await this.applicationModel.findById(applicationId).exec();
    if (!application) {
      throw new NotFoundException('Application not found.');
    }

    return APPLICATION_STATUSES.map((status) => ({
      status,
      completed: APPLICATION_STATUSES.indexOf(application.status) >= APPLICATION_STATUSES.indexOf(status),
      timestamp: application.updatedAt,
    }));
  }

  async generateAppId(serviceName: string): Promise<string> {
    const year = new Date().getFullYear();
    const serviceCode = (serviceName || 'GEN')
      .split(/\s+/)
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 4) || 'GEN';
    const counter = await this.applicationModel.db.collection('counters').findOneAndUpdate(
      { key: `app:${serviceCode}:${year}` },
      { $inc: { seq: 1 } },
      { upsert: true, returnDocument: 'after' as any },
    );
    const seq = (counter?.value?.seq ?? 1) as number;
    const seqStr = String(seq).padStart(6, '0');
    return `CNCT/${serviceCode}/${year}/${seqStr}`;
  }
}
