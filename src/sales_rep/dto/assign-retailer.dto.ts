import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssignRetailerDto {
  @ApiProperty({
    description: 'Retailer identifier',
    example: 'e7f3a9d2-4a75-4bb1-9dcd-2c35a2d7a9f3',
  })
  @IsUUID('4')
  retailer_id: string;
}

export class BulkAssignRetailersDto {
  @ApiProperty({
    type: [AssignRetailerDto],
    description: 'List of retailers to assign',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(70)
  @ValidateNested({ each: true })
  @Type(() => AssignRetailerDto)
  retailers: AssignRetailerDto[];
}


