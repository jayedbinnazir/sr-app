import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class ListRetailerDto {
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value) || 1)
  page = 1;

  @IsInt()
  @Min(1)
  @Max(200)
  @Transform(({ value }) => Number(value) || 20)
  limit = 20;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  search?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsUUID()
  distributorId?: string;

  @IsOptional()
  @IsUUID()
  territoryId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['name', 'updated_at'])
  sortBy?: 'name' | 'updated_at';

  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

