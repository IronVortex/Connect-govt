import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ServicesService } from './services.service';
import { DocumentsService } from '../documents/documents.service';

interface CreateServiceDto {
  name: string;
  description?: string;
  department: string;
}

@Controller('services')
export class ServicesController {
  constructor(
    private servicesService: ServicesService,
    private documentsService: DocumentsService,
  ) {}

  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @Get('department/:departmentId')
  findByDepartment(
    @Param('departmentId') departmentId: string,
  ) {
    return this.servicesService.findByDepartment(
      departmentId,
    );
  }



  @Get(':id/documents')
  findDocumentsByService(@Param('id') id: string) {
    return this.documentsService.findByService(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }
}
