import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DocumentDetectionService } from './document-detection.service';
import { UploadedDocument, UploadedDocumentSchema } from '../../models/UploadedDocument';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { User, UserSchema } from '../../models/User';
import { memoryStorage } from 'multer';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
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
      { name: UploadedDocument.name, schema: UploadedDocumentSchema },
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, DocumentDetectionService],
  exports: [UploadsService],
})
export class UploadsModule {}
