import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  UseGuards,
  Request,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Types } from 'mongoose';

@Controller('upload')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':documentId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PDF, PNG, and JPEG files are allowed.',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the 10MB limit.');
    }

    const detectedType = await this.uploadsService.detectDocumentType(
      file.originalname,
    );

    const upload = await this.uploadsService.create({
      user: new Types.ObjectId(req.user.id),
      requiredDocument: new Types.ObjectId(documentId),
      filename: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      detectedType,
      detectionStatus:
        detectedType !== 'Unknown' ? 'DETECTED' : 'UNKNOWN',
    });

    return upload;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getUserUploads(@Request() req: any) {
    return this.uploadsService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:uploadId')
  async getStatus(@Param('uploadId') uploadId: string) {
    return this.uploadsService.findOne(uploadId);
  }
}