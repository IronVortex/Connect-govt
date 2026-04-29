import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { Department, DepartmentSchema } from '../../models/Department';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Department.name, schema: DepartmentSchema }]),
  ],
  controllers: [DepartmentsController],
  providers: [DepartmentsService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
