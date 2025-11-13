import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRetailerAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  uid: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @IsUUID()
  region_id?: string | null;

  @IsOptional()
  @IsUUID()
  area_id?: string | null;

  @IsOptional()
  @IsUUID()
  distributor_id?: string | null;

  @IsOptional()
  @IsUUID()
  territory_id?: string | null;

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

