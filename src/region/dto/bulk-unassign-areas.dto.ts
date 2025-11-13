import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class BulkUnassignAreasDto {
  @ApiProperty({
    type: [String],
    description: 'List of area identifiers to unassign from the region',
    example: [
      '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
      '3c8e5b2d-98ab-4a6f-9bfa-9ae4f9d8c1c4',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  areaIds: string[];
}


