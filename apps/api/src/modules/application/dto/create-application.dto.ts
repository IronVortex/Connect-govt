import { IsMongoId, IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { APPLICATION_STATUSES } from '../../../models/Application';

export class CreateApplicationDto {
  @IsMongoId()
  serviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsEnum(APPLICATION_STATUSES)
  status?: string;
}
