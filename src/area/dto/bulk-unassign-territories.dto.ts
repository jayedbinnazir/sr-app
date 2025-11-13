import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsUUID,
} from 'class-validator';

export class BulkUnassignTerritoriesDto {
  @ApiProperty({
    type: [String],
    description: 'List of territory identifiers to unassign from the area',
    example: [
      'bf98c716-bf37-4c2b-9d49-1b30c5c0cf1e',
      '3a760e41-1c7d-4b0a-8a88-0fb9bc4a27c3',
    ],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  territoryIds: string[];
}


