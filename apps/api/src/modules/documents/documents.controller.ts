import { Controller, Get, Post, Body, Param, Inject } from '@nestjs/common';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(@Inject(DocumentsService) private documentsService: DocumentsService) {}

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get('service/:serviceId')
  findByService(@Param('serviceId') serviceId: string) {
    return this.documentsService.findByService(serviceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

 @Post()
create(
  @Body()
  body: {
    name: string;
    description?: string;
    service: string;
  },
) {
  return this.documentsService.create({
    name: body.name,
    description: body.description,
    service: body.service as any,
  });
}
}
