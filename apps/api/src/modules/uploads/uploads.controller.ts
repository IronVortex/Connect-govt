import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
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
import { RolesGuard } from '../auth/roles.guard';
import { PermissionsGuard, RequirePermissions } from '../auth/permissions.guard';
import { OwnershipGuard, CheckOwnership } from '../auth/ownership.guard';
import { Audit, AuditInterceptor } from '../audit/audit.interceptor';
import { Types } from 'mongoose';
import type { Response } from 'express';
import { createReadStream } from 'fs';

const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';

@Controller('upload')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(private uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'), AuditInterceptor)
  @Audit({ action: 'UPLOAD_DOCUMENT', module: 'DOCUMENTS' })
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

  @Post(':documentId')
  @RequirePermissions('upload:documents')
  @UseInterceptors(FileInterceptor('file'), AuditInterceptor)
  @Audit({ action: 'UPLOAD_DOCUMENT', module: 'DOCUMENTS' })
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

    const requestStart = performance.now();

    // ── Store the file ──────────────────────────────────────────────────────
    const tStoreStart = performance.now();
    const storagePath = this.uploadsService.storeFile(file);
    this.logger.log(`[UPLOAD] File stored: ${Math.round(performance.now() - tStoreStart)}ms`);

    // ── Analyse ─────────────────────────────────────────────────────────────
    const requiredDoc = await this.uploadsService.getRequiredDocument(documentId);
    const expectedType = requiredDoc ? requiredDoc.name : undefined;

    const tAnalyseStart = performance.now();
    const analysis = await this.uploadsService.analyzeUpload(
      storagePath,
      expectedType,
      file.mimetype,
      file.buffer,
    );
    this.logger.log(`[UPLOAD] Analysis: ${Math.round(performance.now() - tAnalyseStart)}ms`);

    // ── Persist to DB ────────────────────────────────────────────────────────
    const tSaveStart = performance.now();
    const upload = await this.uploadsService.create({
      user: new Types.ObjectId(req.user.id),
      requiredDocument: new Types.ObjectId(documentId),
      filename: file.originalname,
      path: storagePath,
      mimetype: file.mimetype,
      size: file.size,
      // Store enum key, not display label
      detectedType: analysis.detectedTypeEnum || analysis.detectedType,
      detectionStatus: analysis.status,
      confidence: analysis.confidence,
      extractedText: analysis.extractedText,
      detectionReasons: analysis.reasons,
      matchedExpectedType: expectedType,
      verified: analysis.verified,
      expiresAt:
        analysis.verified
          ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
          : undefined,
      source: 'upload',
    });
    const saveMs = Math.round(performance.now() - tSaveStart);
    this.logger.log(`[SAVE] DB write: ${saveMs}ms`);

    const totalMs = Math.round(performance.now() - requestStart);
    this.logger.log(`[UPLOAD] Request total: ${totalMs}ms`);

    // Merge save timing into the pipeline timings block for the response
    const timingsWithSave = analysis.timings
      ? { ...analysis.timings, save: saveMs, total: totalMs }
      : undefined;

    return {
      ...(upload as unknown as Record<string, unknown>),
      extractedFields: analysis.extractedFields,
      reasons: analysis.reasons,
      ...(!IS_PRODUCTION && timingsWithSave ? { timings: timingsWithSave } : {}),
    };
  }

  @Get('me')
  @RequirePermissions('upload:documents')
  async getUserUploads(@Req() req: any) {
    return this.uploadsService.findByUser(req.user.id);
  }

  @Get('wallet')
  @RequirePermissions('upload:documents')
  async getWalletDocuments(@Req() req: any) {
    return this.uploadsService.findWalletDocuments(req.user.id);
  }

  @Get('files/:uploadId')
  @RequirePermissions('upload:documents')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ modelName: 'UploadedDocument', paramName: 'uploadId' })
  async downloadFile(
    @Param('uploadId') uploadId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const upload = await this.uploadsService.findOne(uploadId);
    if (!upload) {
      throw new NotFoundException('File not found.');
    }

    const filePath = this.uploadsService.getFilePath(upload.path);
    const stream = createReadStream(filePath);
    res.setHeader('Content-Type', upload.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${upload.filename}"`);
    return stream.pipe(res);
  }

  @Get('status/:uploadId')
  @RequirePermissions('upload:documents')
  @UseGuards(OwnershipGuard)
  @CheckOwnership({ modelName: 'UploadedDocument', paramName: 'uploadId' })
  async getStatus(@Param('uploadId') uploadId: string) {
    return this.uploadsService.findOne(uploadId);
  }
}
