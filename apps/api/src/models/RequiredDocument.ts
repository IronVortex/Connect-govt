import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequiredDocumentDocument = RequiredDocument & Document;

@Schema()
export class RequiredDocument {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Service', required: true })
  service!: Types.ObjectId | string;

  @Prop({ default: Date.now })
  createdAt?: Date;
}

export const RequiredDocumentSchema = SchemaFactory.createForClass(RequiredDocument);