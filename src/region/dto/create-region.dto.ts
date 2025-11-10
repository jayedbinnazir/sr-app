import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRegionDto {
  @ApiProperty({
    description: 'Unique region name',
    example: 'Dhaka',
    maxLength: 15,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  name: string;
}

