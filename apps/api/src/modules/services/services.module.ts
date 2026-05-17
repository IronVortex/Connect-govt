import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service, ServiceSchema } from '../../models/Service';
import { Department, DepartmentSchema } from '../../models/Department';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Service.name, schema: ServiceSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
    ]),
    DocumentsModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
