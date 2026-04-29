import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UploadedDocumentDocument = UploadedDocument & Document;

@Schema()
export class UploadedDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'RequiredDocument', required: true })
  requiredDocument!: Types.ObjectId | string;

  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  path!: string;

  @Prop({ required: true })
  mimetype!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ default: 'UNKNOWN' })
  detectionStatus?: string;

  @Prop()
  detectedType?: string;

  @Prop({ default: Date.now })
  uploadedAt?: Date;
}

export const UploadedDocumentSchema = SchemaFactory.createForClass(UploadedDocument);