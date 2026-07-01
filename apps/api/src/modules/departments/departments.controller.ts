import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('departments')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @RequirePermissions('read:departments')
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  @RequirePermissions('read:departments')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @RequirePermissions('manage:departments')
  async create(@Body() body: CreateDepartmentDto) {
    return this.departmentsService.create(body);
  }

  @Get(':id/services')
  @RequirePermissions('read:departments')
  async findServicesByDepartment(@Param('id') id: string) {
    return this.departmentsService.findServicesByDepartment(id);
  }
}
