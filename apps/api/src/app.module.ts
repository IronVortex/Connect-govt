import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from './filters/transform.interceptor';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ServicesModule } from './modules/services/services.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ApplicationModule } from './modules/application/application.module';
import { SeedService } from './seed/seed.service';
import { AppController } from './app.controller';
import { Department, DepartmentSchema } from './models/Department';
import { Service, ServiceSchema } from './models/Service';
import { RequiredDocument, RequiredDocumentSchema } from './models/RequiredDocument';
import { Application, ApplicationSchema } from './models/Application';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
      validationSchema: envValidationSchema,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error(
            'MONGODB_URI environment variable is required. '
            + 'Please configure it in your .env file or deployment platform.'
          );
        }
        const dbName = configService.get<string>('MONGODB_DB') || 'connect-govt';
        
        return {
          uri,
          dbName,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
          retryAttempts: 3,
          retryDelay: 1000,
          autoIndex: true,
        };
      },
    }),
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: RequiredDocument.name, schema: RequiredDocumentSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    ServicesModule,
    DocumentsModule,
    UploadsModule,
    ApplicationModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    SeedService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
