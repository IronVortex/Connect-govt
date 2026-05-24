import { Module, BadRequestException } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DetectionService } from './detection.service';
import { UploadedDocument, UploadedDocumentSchema } from '../../models/UploadedDocument';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { User, UserSchema } from '../../models/User';
import { diskStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          cb(null, `${Date.now()}-${file.originalname}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Invalid file type'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
    MongooseModule.forFeature([
      { name: UploadedDocument.name, schema: UploadedDocumentSchema },
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UploadsController],
  providers: [UploadsService, DetectionService],
  exports: [UploadsService],
})
export class UploadsModule {}
