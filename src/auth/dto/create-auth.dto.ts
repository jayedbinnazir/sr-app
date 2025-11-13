import { IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthRole } from '../types/auth-role.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAuthDto {
  @ApiProperty({
    description: 'User role attempting to authenticate',
    enum: AuthRole,
    example: AuthRole.SalesRep,
  })
  @IsString()
  @IsEnum(AuthRole)
  type: AuthRole;

  @ApiProperty({
    description: 'Username or email address used to log in',
    example: 'abir.rahman',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  identifier: string;

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
