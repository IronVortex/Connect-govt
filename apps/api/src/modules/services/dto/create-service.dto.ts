import { IsString, IsOptional, IsMongoId, Length, MaxLength } from 'class-validator';

export class CreateServiceDto {
  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;

  @IsMongoId()
  department!: string;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  description?: string;

  @IsOptional()
  @IsMongoId()
  department?: string;
}
