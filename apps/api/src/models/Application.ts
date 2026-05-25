import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ApplicationDocument = HydratedDocument<Application> & {
  _id: Types.ObjectId;
};
export const APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_CORRECTION',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

@Schema({
  collection: 'applications',
  timestamps: true,
})
export class Application {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true,
  })
  service!: Types.ObjectId;

  @Prop({
    type: String,
    enum: APPLICATION_STATUSES,
    default: 'DRAFT',
    required: true,
    index: true,
  })
  status!: ApplicationStatus;

  @Prop({
    type: String,
    unique: true,
    default: () => new Types.ObjectId().toHexString(),
  })
  appId!: string;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'UploadedDocument' }],
    default: [],
  })
  uploadedDocuments!: Types.ObjectId[];

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  notes?: string;

  @Prop({ type: Date, required: false })
  deletedAt?: Date;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

ApplicationSchema.index({ user: 1, service: 1 }, { unique: true });
ApplicationSchema.index({ user: 1, status: 1, updatedAt: -1 });
ApplicationSchema.index({ service: 1, status: 1, updatedAt: -1 });
