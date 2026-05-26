import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Types } from 'mongoose';
import type { Response } from 'express';
import { createReadStream } from 'fs';

@Controller('upload')
export class UploadsController {
  constructor(private uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadAndDetect(
    @UploadedFile() file: Express.Multer.File,
    @Body('expectedDocumentType') expectedDocumentType?: string,
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

    if (file.size >= 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }

    return this.uploadsService.analyzeUpload(
      file.originalname,
      expectedDocumentType,
      file.mimetype,
      file.buffer,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post(':documentId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
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

    if (file.size >= 5 * 1024 * 1024) {
      throw new BadRequestException('File size exceeds the 5MB limit.');
    }

    const requiredDoc = await this.uploadsService.getRequiredDocument(documentId);
    const expectedType = requiredDoc ? requiredDoc.name : undefined;
    const analysis = await this.uploadsService.analyzeUpload(
      file.originalname,
      expectedType,
      file.mimetype,
      file.buffer,
    );

    const storagePath = this.uploadsService.storeFile(file);
    const upload = await this.uploadsService.create({
      user: new Types.ObjectId(req.user.id),
      requiredDocument: new Types.ObjectId(documentId),
      filename: file.originalname,
      path: storagePath,
      mimetype: file.mimetype,
      size: file.size,
      detectedType: analysis.documentType,
      detectionStatus: analysis.status,
      verified: analysis.status === 'DETECTED',
      expiresAt:
        analysis.status === 'DETECTED'
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          : undefined,
      source: 'upload',
    });

    return upload;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getUserUploads(@Req() req: any) {
    return this.uploadsService.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('wallet')
  async getWalletDocuments(@Req() req: any) {
    return this.uploadsService.findWalletDocuments(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('files/:uploadId')
  async downloadFile(
    @Param('uploadId') uploadId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const upload = await this.uploadsService.findOne(uploadId);
    if (!upload || upload.user.toString() !== req.user.id) {
      throw new NotFoundException('File not found.');
    }

    const filePath = this.uploadsService.getFilePath(upload.path);
    const stream = createReadStream(filePath);
    res.setHeader('Content-Type', upload.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${upload.filename}"`);
    return stream.pipe(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:uploadId')
  async getStatus(@Param('uploadId') uploadId: string) {
    return this.uploadsService.findOne(uploadId);
  }
}
