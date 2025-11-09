import {
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateTerritoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsUUID()
  area_id: string;
}

