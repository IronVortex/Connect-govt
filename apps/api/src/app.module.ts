import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { ServicesModule } from './modules/services/services.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ApplicationModule } from './modules/application/application.module';
import { SeedService } from './modules/seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI || 'mongodb://localhost:27017/connect-gov'),
    AuthModule,
    UsersModule,
    DepartmentsModule,
    ServicesModule,
    DocumentsModule,
    UploadsModule,
    ApplicationModule,
  ],
  controllers: [],
  providers: [SeedService],
})
export class AppModule {}
