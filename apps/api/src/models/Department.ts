import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department> & {
  _id: Types.ObjectId;
};

@Schema({
  timestamps: true,
})
export class Department {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;
}

export const DepartmentSchema =
  SchemaFactory.createForClass(Department);