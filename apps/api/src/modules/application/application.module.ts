import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { UploadedDocument, UploadedDocumentSchema } from '../../models/UploadedDocument';
import { RequiredDocument, RequiredDocumentSchema } from '../../models/RequiredDocument';
import { User, UserSchema } from '../../models/User';
import { Application, ApplicationSchema } from '../../models/Application';
import { Service, ServiceSchema } from '../../models/Service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UploadedDocument.name, schema: UploadedDocumentSchema },
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
      { name: User.name, schema: UserSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
