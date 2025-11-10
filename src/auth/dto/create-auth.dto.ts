import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { AuthRole } from '../types/auth-role.enum';




export class CreateAuthAdminDto {

  @IsString()
  @IsEnum(AuthRole)
  type: AuthRole;

  @IsEmail()
  @MaxLength(150)
  email: string;


  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  password: string;
}

export class CreateAuthSalesRepDto {

  @IsString()
  @IsEnum(AuthRole)
  type: AuthRole;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(120)
  password: string;
}

