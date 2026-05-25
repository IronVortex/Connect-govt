import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department> & {
  _id: Types.ObjectId;
};

@Schema({
  collection: 'departments',
  timestamps: true,
})
export class Department {
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120,
  })
  name!: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 1000,
  })
  description?: string;
}

export const DepartmentSchema =
  SchemaFactory.createForClass(Department);

DepartmentSchema.index({ name: 1 }, { unique: true });
