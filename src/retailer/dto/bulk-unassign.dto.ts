import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class BulkUnassignDto {
  @IsUUID()
  salesRepId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID(undefined, { each: true })
  retailerIds: string[];

  @IsOptional()
  @IsString()
  correlationId?: string;
}

