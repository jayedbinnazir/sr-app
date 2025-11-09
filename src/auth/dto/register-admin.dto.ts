import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterAdminDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsEmail()
  @MaxLength(150)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(120)
  password: string;
}


