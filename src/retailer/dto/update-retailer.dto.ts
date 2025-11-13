import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateRetailerDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000)
  points?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  routes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;
}

