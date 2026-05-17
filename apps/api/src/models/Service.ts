import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service> & {
  _id: Types.ObjectId;
};

@Schema({
  timestamps: true,
})
export class Service {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  department!: Types.ObjectId;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);