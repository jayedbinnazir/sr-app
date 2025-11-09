import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateAreaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsUUID()
  region_id: string;
}

