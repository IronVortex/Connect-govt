import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

  @UseGuards(JwtAuthGuard)
  @Get('intelligence/me')
  findMyIntelligence(@Req() req: { user: { id: string } }) {
    return this.documentsService.findIntelligenceByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  @UseInterceptors(FileInterceptor('file'))
  async verifyDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body('expectedDocumentType') expectedDocumentType: string | undefined,
    @Req() req: { user: { id: string } },
  ) {
    this.validateUpload(file);

    return this.documentsService.processDocument({
      buffer: file.buffer,
      mimeType: file.mimetype,
      filename: file.originalname,
      expectedDocumentType,
      userId: req.user.id,
      persist: true,
    });
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
      service: body.service as never,
    });
  }

  private validateUpload(file?: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, PNG, and JPEG files are allowed.');
    }

    if (file.size >= MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }
  }
}
