import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UploadedDocumentDocument = HydratedDocument<UploadedDocument>;

@Schema({
  timestamps: true,
})
export class UploadedDocument {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'RequiredDocument',
    required: true,
  })
  requiredDocument!: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
  })
  filename!: string;

  @Prop({
    type: String,
    required: true,
  })
  path!: string;

  @Prop({
    type: String,
    required: true,
  })
  mimetype!: string;

  @Prop({
    type: Number,
    required: true,
  })
  size!: number;

  @Prop({
    type: String,
    default: 'UNKNOWN',
  })
  detectionStatus?: string;

  @Prop({
    type: String,
  })
  detectedType?: string;
}

export const UploadedDocumentSchema =
  SchemaFactory.createForClass(UploadedDocument);