import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFileDto {
  @IsString()
  originalName: string;

  @IsString()
  fileName: string;

  @IsString()
  path: string;

  @IsString()
  mimetype: string;

  @IsNumber()
  size: number;

  @IsOptional()
  @IsString()
  userId?: string;
}
