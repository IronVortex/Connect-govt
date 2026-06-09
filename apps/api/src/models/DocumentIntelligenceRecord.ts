import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { KYC_DOCUMENT_TYPES } from '../modules/documents/types/document-intelligence.types';

export type DocumentIntelligenceRecordDocument =
  HydratedDocument<DocumentIntelligenceRecord>;

@Schema({
  collection: 'documentIntelligenceRecords',
  timestamps: true,
})
export class DocumentIntelligenceRecord {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  user!: Types.ObjectId;

  @Prop({
    type: String,
    enum: KYC_DOCUMENT_TYPES,
    required: true,
    index: true,
  })
  documentType!: string;

  @Prop({
    type: {
      name: { type: String, trim: true, maxlength: 160 },
      dob: { type: String, trim: true, maxlength: 32 },
      idNumber: { type: String, trim: true, maxlength: 64 },
    },
    default: {},
  })
  extractedData!: {
    name?: string;
    dob?: string;
    idNumber?: string;
  };

  @Prop({
    type: {
      isValid: { type: Boolean, required: true },
      confidence: { type: Number, required: true, min: 0, max: 1 },
      missingFields: { type: [String], default: [] },
      reasons: { type: [String], default: [] },
    },
    required: true,
  })
  validation!: {
    isValid: boolean;
    confidence: number;
    missingFields: string[];
    reasons: string[];
  };

  @Prop({
    type: String,
    trim: true,
    maxlength: 5000,
  })
  extractedText?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 255,
  })
  filename?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 120,
  })
  mimetype?: string;

  @Prop({
    type: String,
    trim: true,
    maxlength: 50,
    default: 'intelligence',
  })
  source!: string;
}

export const DocumentIntelligenceRecordSchema = SchemaFactory.createForClass(
  DocumentIntelligenceRecord,
);

DocumentIntelligenceRecordSchema.index({ user: 1, createdAt: -1 });
