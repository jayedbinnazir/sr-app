import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterAdminDto {
  @ApiProperty({
    description: 'Full name of the admin user',
    example: 'Jayed Bin Nazir',
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: 'Login email address (required if username not provided)',
    example: 'admin@example.com',
    maxLength: 150,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;

  @ApiPropertyOptional({
    description: 'Preferred username (required if email not provided)',
    example: 'jayed.nazir',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  username?: string | null;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+8801521323469',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiProperty({
    description: 'Account password',
    example: 'Admin123!',
    minLength: 8,
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(120)
  password: string;
}

