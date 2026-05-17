import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RequiredDocumentDocument = HydratedDocument<RequiredDocument> & {
  _id: Types.ObjectId;
};

@Schema({
  timestamps: true,
})
export class RequiredDocument {
  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  description?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  service!: Types.ObjectId;
}

export const RequiredDocumentSchema =
  SchemaFactory.createForClass(RequiredDocument);