import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DepartmentDocument = Department & Document;

@Schema()
export class Department {
  @Prop({ required: true, type: String })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ default: Date.now, type: Date })
  createdAt?: Date;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);