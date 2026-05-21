import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequiredDocumentDocument = RequiredDocument & Document;

@Schema()
export class RequiredDocument {
  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  service!: Types.ObjectId | string;

  @Prop({ default: Date.now, type: Date })
  createdAt?: Date;
}

export const RequiredDocumentSchema = SchemaFactory.createForClass(RequiredDocument);