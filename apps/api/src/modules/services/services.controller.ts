import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ServicesService } from './services.service';
import { DocumentsService } from '../documents/documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('services')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ServicesController {
  constructor(
    private servicesService: ServicesService,
    private documentsService: DocumentsService,
  ) {}

  @Get()
  @RequirePermissions('read:services')
  findAll() {
    return this.servicesService.findAll();
  }

  @Get('department/:departmentId')
  @RequirePermissions('read:services')
  findByDepartment(
    @Param('departmentId') departmentId: string,
  ) {
    return this.servicesService.findByDepartment(
      departmentId,
    );
  }

  @Get(':id/documents')
  @RequirePermissions('read:services')
  findDocumentsByService(@Param('id') id: string) {
    return this.documentsService.findByService(id);
  }

  @Get(':id')
  @RequirePermissions('read:services')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @RequirePermissions('manage:services')
  async create(
    @Body()
    body: {
      name: string;
      description?: string;
      department: string;
    },
  ) {
    return this.servicesService.create(body);
  }
}
