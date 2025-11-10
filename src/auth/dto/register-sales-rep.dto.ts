import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterSalesRepDto {
  @ApiPropertyOptional({
    description: 'Unique username for the sales representative (required if email not provided)',
    example: 'abir.rahman',
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  username?: string | null;

  @ApiPropertyOptional({
    description: 'Login email address (required if username not provided)',
    example: 'abir@manush.tech',
    maxLength: 150,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string | null;

  @ApiProperty({
    description: 'Full name of the sales representative',
    example: 'Abir Rahman',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+8801711355057',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @ApiProperty({
    description: 'Account password',
    example: 'Abir015!',
    minLength: 8,
    maxLength: 120,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(120)
  password: string;
}

