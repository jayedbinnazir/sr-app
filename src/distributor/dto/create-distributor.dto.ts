import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateDistributorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;
}

