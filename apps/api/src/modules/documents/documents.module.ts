import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { memoryStorage } from 'multer';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DetectionService } from './detection.service';
import { OcrService } from './ocr.service';
import { ValidationService } from './validation.service';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { Service, ServiceSchema } from '../../models/Service';
import {
  DocumentIntelligenceRecord,
  DocumentIntelligenceRecordSchema,
} from '../../models/DocumentIntelligenceRecord';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return cb(new BadRequestException('Only PDF, PNG, and JPEG files are allowed.'), false);
        }
        if (!file.originalname || file.originalname.length > 255) {
          return cb(new BadRequestException('Invalid file name.'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
    MongooseModule.forFeature([
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: DocumentIntelligenceRecord.name, schema: DocumentIntelligenceRecordSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, DetectionService, OcrService, ValidationService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
