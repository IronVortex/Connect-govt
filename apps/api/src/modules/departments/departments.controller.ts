import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {
    console.log('✅ DepartmentsService injected:', !!departmentsService);
  }

  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  async create(@Body() body: { name: string; description?: string }) {
    return this.departmentsService.create(body);
  }

  @Get(':id/services')
  async findServicesByDepartment(@Param('id') id: string) {
    return this.departmentsService.findServicesByDepartment(id);
  }

  @Get('/')
  healthCheck() {
    return { message: 'API is running 🚀' };
  }
}
