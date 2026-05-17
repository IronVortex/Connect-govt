import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { Service, ServiceSchema } from '../../models/Service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
