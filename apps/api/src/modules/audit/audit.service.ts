import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../../models/AuditLog';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(entry: {
    user?: string | Types.ObjectId;
    role?: string;
    action: string;
    module: string;
    ipAddress: string;
    status: 'SUCCESS' | 'FAILURE';
    requestId?: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLogDocument> {
    try {
      const userObjectId = entry.user ? new Types.ObjectId(entry.user) : undefined;
      const logEntry = new this.auditLogModel({
        ...entry,
        user: userObjectId,
      });
      const saved = await logEntry.save();
      this.logger.log(`[AUDIT] Action: ${entry.action} by ${entry.role || 'GUEST'} - Status: ${entry.status}`);
      return saved;
    } catch (err: any) {
      this.logger.error(`Failed to save audit log: ${err.message}`);
      throw err;
    }
  }

  async findAll(
    limit = 50,
    page = 1,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find()
        .populate('user', 'email name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments().exec(),
    ]);

    return { logs, total };
  }
}
