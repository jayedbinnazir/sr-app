import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({
    description: 'Unique area name',
    example: 'Gulshan',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => value.trim().toLowerCase())
  name: string;

  @ApiProperty({
    description: 'Identifier of the parent region',
    example: 'b6a2af5f-0f21-4f05-9f07-58be9890e3d2',
  })
  @IsUUID()
  region_id: string;
}

