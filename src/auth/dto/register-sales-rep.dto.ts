import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterSalesRepDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(120)
  password: string;
}


