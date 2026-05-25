import { IsMongoId, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import type { ApplicationStatus } from '../../../models/Application';
import { APPLICATION_STATUSES } from '../../../models/Application';

export class UpdateApplicationDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(APPLICATION_STATUSES)
  status?: ApplicationStatus;
}
