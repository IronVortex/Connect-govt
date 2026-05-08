import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';

import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  create(
    @Body()
    body: {
      name: string;
      description?: string;
    },
  ) {
    return this.departmentsService.create(body);
  }
}