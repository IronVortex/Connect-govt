import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { memoryStorage } from 'multer';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { OCRService } from './ocr.service';
import { PreprocessingService } from './preprocessing.service';
import { ValidationService } from './validation.service';
import { VisionClassificationService } from './vision-classification.service';
import { VerificationService } from './verification.service';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { Service, ServiceSchema } from '../../models/Service';
import {
  DocumentIntelligenceRecord,
  DocumentIntelligenceRecordSchema,
} from '../../models/DocumentIntelligenceRecord';

// New Architecture Services
import { DocumentCacheService } from './document-cache.service';
import { ImageQualityService } from './image-quality.service';
import { GoogleOCRProvider } from './ocr/google.provider';
import { AzureOCRProvider } from './ocr/azure.provider';
import { TesseractOCRProvider } from './ocr/tesseract.provider';
import { DocumentAuthenticityService } from './document-authenticity.service';
import { FieldExtractionService } from './field-extraction.service';
import { ConfidenceService } from './confidence.service';
import { AuthModule } from '../auth/auth.module';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

@Module({
  imports: [
    AuthModule,
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
  providers: [
    // Legacy / Shared
    PreprocessingService,
    VerificationService,
    
    // New Pipeline Architecture
    DocumentCacheService,
    ImageQualityService,
    GoogleOCRProvider,
    AzureOCRProvider,
    TesseractOCRProvider,
    OCRService,
    DocumentAuthenticityService,
    VisionClassificationService,
    FieldExtractionService,
    ValidationService,
    ConfidenceService,
    
    // Orchestrator
    DocumentsService,
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
