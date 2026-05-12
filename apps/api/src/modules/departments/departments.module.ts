// Copilot: Register both Department and Service schemas in one MongooseModule.forFeature call.
// Ensure DepartmentsService is listed in providers and DepartmentsController in controllers.
// Ensure the exported DepartmentsService is used in other modules.
// Copilot: Register both Department and Service schemas in one MongooseModule.forFeature call.
// Ensure DepartmentsService is listed in providers and DepartmentsController in controllers.
// Ensure the exported DepartmentsService is used in other modules.


import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { Department, DepartmentSchema } from '../../models/Department';
import { Service, ServiceSchema } from '../../models/Service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Service.name, schema: ServiceSchema }, // ✅ Register ServiceModel here
    ]),
  ],
  providers: [DepartmentsService],
  controllers: [DepartmentsController],
})
export class DepartmentsModule {}
