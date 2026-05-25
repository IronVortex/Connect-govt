import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service> & {
  _id: Types.ObjectId;
};

@Schema({
  collection: 'services',
  timestamps: true,
})
export class Service {
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 160,
  })
  name!: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 1500,
  })
  description?: string;

  @Prop({ type: Number, default: 0 })
  fee?: number;

  @Prop({ type: String, trim: true, maxlength: 160, default: '7-10 working days' })
  estimatedProcessingTime?: string;

  @Prop({ type: Number, default: 0 })
  priorityLevel?: number;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  department!: Types.ObjectId;
}

export const ServiceSchema = SchemaFactory.createForClass(Service);

ServiceSchema.index({ department: 1, name: 1 }, { unique: true });
