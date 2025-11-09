import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import type { CreateAuthDto } from '../dto/create-auth.dto';
import { ApiTags } from '@nestjs/swagger';
import { RegisterAdminDto } from '../dto/register-admin.dto';
import { RegisterSalesRepDto } from '../dto/register-sales-rep.dto';
import type { Response } from 'express';

@ApiTags('Auth')
@Controller({
  path: 'v1/auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/admin')
  @HttpCode(HttpStatus.CREATED)
  async registerAdmin(
    @Body() dto: RegisterAdminDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerAdmin(dto);
    this.authService.attachAuthCookie(res, result.accessToken);
    this.authService.attachAuthHeader(res, result.accessToken);
    return result;
  }

  @Post('register/sales-rep')
  @HttpCode(HttpStatus.CREATED)
  async registerSalesRep(
    @Body() dto: RegisterSalesRepDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerSalesRep(dto);
    this.authService.attachAuthCookie(res, result.accessToken);
    this.authService.attachAuthHeader(res, result.accessToken);
    return result;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() createAuthDto: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(createAuthDto);
    this.authService.attachAuthCookie(res, result.accessToken);
    this.authService.attachAuthHeader(res, result.accessToken);
    return result;
  }
}
