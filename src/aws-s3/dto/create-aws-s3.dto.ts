import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateBucketFileDto {
  @IsString()
  originalName: string;

  @IsString()
  path: string; // S3 key or local file path

  @IsOptional()
  @IsString()
  url?: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  size: number;

  @IsOptional()
  @IsString()
  userId?: string;

  // S3 specific
  @IsOptional()
  @IsString()
  s3Key?: string;

  @IsOptional()
  @IsString()
  s3Etag?: string;

  @IsOptional()
  @IsString()
  s3VersionId?: string;

  @IsOptional()
  @IsIn(['s3', 'local'])
  storageType?: string;
}
