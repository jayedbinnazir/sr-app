import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  name: string;

  @IsNotEmpty()
  @IsEmail()
  @MinLength(5)
  @MaxLength(30)
  email: string;

  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  @MinLength(6)
  password?: string | null; // Password can be null if not set, e.g., for OAuth logins

  @IsOptional()
  @IsNotEmpty()
  @Transform(({ value }) => String(value).trim())
  @MinLength(6)
  confirmPassword?: string | null; // Confirm password can be null if not set, e.g., for OAuth logins

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === '' ? undefined : String(value).trim(),
  )
  phone?: string | null; // Phone can be null if not provided

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === '' ? undefined : String(value).trim(),
  )
  address?: string | null; // Address can be null if not provided

  //Google OAuth specific fields

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === '' ? undefined : String(value).trim(),
  )
  google_picture?: string | null;

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === '' ? undefined : String(value).trim(),
  )
  provider?: string | null; // 'local', 'google', etc.

  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean = false; // Default to false, can be updated later

  @IsOptional()
  @IsString()
  @Transform(({ value }) =>
    value === null || value === '' ? undefined : String(value).trim(),
  )
  providerId?: string | null; // Google ID, etc.
}
