import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(15)
  name: string;
}

