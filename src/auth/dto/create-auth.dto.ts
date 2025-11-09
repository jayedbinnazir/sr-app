import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { AuthRole } from '../types/auth-role.enum';

export class CreateAuthDto {
  @IsString()
  @IsEnum(AuthRole)
  type: AuthRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  identifier: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  password: string;
}
