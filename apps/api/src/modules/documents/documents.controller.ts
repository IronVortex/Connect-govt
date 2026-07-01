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
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { Roles } from '../auth/roles.decorator';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(@Inject(DocumentsService) private documentsService: DocumentsService) {}

  @Get()
  @RequirePermissions('read:services')
  findAll() {
    return this.documentsService.findAll();
  }

  @Get('service/:serviceId')
  @RequirePermissions('read:services')
  findByService(@Param('serviceId') serviceId: string) {
    return this.documentsService.findByService(serviceId);
  }

  @Get('intelligence/me')
  @RequirePermissions('upload:documents')
  findMyIntelligence(@Req() req: { user: { id: string } }) {
    return this.documentsService.findIntelligenceByUser(req.user.id);
  }

  @Post('verify')
  @RequirePermissions('upload:documents')
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
  @RequirePermissions('read:services')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @RequirePermissions('manage:documents')
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
