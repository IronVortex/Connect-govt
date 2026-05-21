import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UploadedDocumentDocument = UploadedDocument & Document;

@Schema()
export class UploadedDocument {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId | string;

  @Prop({ type: Types.ObjectId, ref: 'RequiredDocument', required: true })
  requiredDocument!: Types.ObjectId | string;

  @Prop({ required: true, type: String })
  filename!: string;

  @Prop({ required: true, type: String })
  path!: string;

  @Prop({ required: true, type: String })
  mimetype!: string;

  @Prop({ required: true, type: Number })
  size!: number;

  @Prop({ default: 'UNKNOWN', type: String })
  detectionStatus?: string;

  @Prop({ type: String })
  detectedType?: string;

  @Prop({ default: Date.now, type: Date })
  uploadedAt?: Date;
}

export const UploadedDocumentSchema = SchemaFactory.createForClass(UploadedDocument);