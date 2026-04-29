import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { UploadedDocument, UploadedDocumentSchema } from '../../models/UploadedDocument';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UploadedDocument.name, schema: UploadedDocumentSchema }]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
