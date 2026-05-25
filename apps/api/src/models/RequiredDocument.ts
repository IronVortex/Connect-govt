import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RequiredDocumentDocument = HydratedDocument<RequiredDocument> & {
  _id: Types.ObjectId;
};

@Schema({
  collection: 'requiredDocuments',
  timestamps: true,
})
export class RequiredDocument {
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
    maxlength: 1000,
  })
  description?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Service',
    required: true,
    index: true,
  })
  service!: Types.ObjectId;
}

export const RequiredDocumentSchema =
  SchemaFactory.createForClass(RequiredDocument);

RequiredDocumentSchema.index({ service: 1, name: 1 }, { unique: true });
