import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ServiceDocument = Service & Document;

@Schema()
export class Service {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  department!: Types.ObjectId | string;

  @Prop({ default: Date.now })
  createdAt?: Date;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);