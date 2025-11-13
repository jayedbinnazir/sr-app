import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTerritoryDto {
  @ApiProperty({
    description: 'Territory name',
    example: 'Gulshan 1',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    description: 'Identifier of the parent area',
    example: 'dfdfef55-b0cd-449a-9ea7-b6de793f6f0f',
  })
  @IsUUID()
  area_id: string;
}

