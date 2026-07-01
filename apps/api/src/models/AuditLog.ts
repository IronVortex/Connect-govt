import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog> & {
  _id: Types.ObjectId;
};

@Schema({
  collection: 'auditLogs',
  timestamps: { createdAt: true, updatedAt: false }, // only createdAt is relevant for immutable logs
})
export class AuditLog {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    index: true,
  })
  user?: Types.ObjectId;

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  role?: string;

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  action!: string; // e.g. LOGIN, LOGOUT, UPLOAD_DOCUMENT, SUBMIT_APPLICATION

  @Prop({
    type: String,
    required: true,
    index: true,
  })
  module!: string; // e.g. AUTH, DOCUMENTS, APPLICATIONS, USERS

  @Prop({
    type: String,
    required: true,
  })
  ipAddress!: string;

  @Prop({
    type: String,
    required: true,
    enum: ['SUCCESS', 'FAILURE'],
    index: true,
  })
  status!: 'SUCCESS' | 'FAILURE';

  @Prop({
    type: String,
    required: false,
  })
  requestId?: string;

  @Prop({
    type: Object,
    default: {},
  })
  metadata?: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

AuditLogSchema.index({ createdAt: -1 });
