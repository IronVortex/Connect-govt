import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  async create(@Body() body: CreateDepartmentDto) {
    return this.departmentsService.create(body);
  }

  @Get(':id/services')
  async findServicesByDepartment(@Param('id') id: string) {
    return this.departmentsService.findServicesByDepartment(id);
  }
}
