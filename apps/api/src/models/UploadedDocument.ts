import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UploadedDocumentDocument = HydratedDocument<UploadedDocument>;
export const UPLOAD_DETECTION_STATUSES = [
  'DETECTED',
  'MISMATCH',
  'UNKNOWN',
] as const;
export type UploadDetectionStatus =
  (typeof UPLOAD_DETECTION_STATUSES)[number];
export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
] as const;

@Schema({
  collection: 'uploads',
  timestamps: true,
})
export class UploadedDocument {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'RequiredDocument',
    required: true,
    index: true,
  })
  requiredDocument!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 255,
  })
  filename!: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    maxlength: 1000,
  })
  path!: string;

  @Prop({
    type: String,
    required: true,
    enum: ALLOWED_UPLOAD_MIME_TYPES,
  })
  mimetype!: string;

  @Prop({
    type: Number,
    required: true,
    min: 1,
    max: 5 * 1024 * 1024,
  })
  size!: number;

  @Prop({
    type: String,
    enum: UPLOAD_DETECTION_STATUSES,
    default: 'UNKNOWN',
    required: true,
    index: true,
  })
  detectionStatus!: UploadDetectionStatus;

  @Prop({
    type: String,
    trim: true,
    maxlength: 160,
  })
  detectedType?: string;
}

export const UploadedDocumentSchema =
  SchemaFactory.createForClass(UploadedDocument);

UploadedDocumentSchema.index({ user: 1, requiredDocument: 1 });
UploadedDocumentSchema.index({ user: 1, detectionStatus: 1, updatedAt: -1 });
