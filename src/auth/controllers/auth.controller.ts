import { Body, Controller, HttpCode, HttpStatus, Post, Res } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterAdminDto } from '../dto/register-admin.dto';
import { RegisterSalesRepDto } from '../dto/register-sales-rep.dto';
import type { Response } from 'express';
import { CreateAuthDto } from '../dto/create-auth.dto';

@ApiTags('Auth')
@Controller({
  path: 'v1/auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new admin user' })
  @ApiBody({
    description: 'Admin registration payload',
    type: RegisterAdminDto,
    examples: {
      default: {
        summary: 'Sample admin registration',
        value: {
          name: 'Jayed Bin Nazir',
          email: 'admin@example.com',
          username: 'jayed.nazir',
          phone: '+8801521323469',
          password: 'Admin123!',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Admin registered successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Created successfully',
        path: '/api/v1/auth/register/admin',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {
          accessToken: '<jwt-token>',
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            id: 'd5d9c6fa-5bd5-4d26-81f0-8dcd9c86ef11',
            type: 'admin',
            name: 'Jayed Bin Nazir',
            email: 'admin@example.com',
            phone: '+8801521323469',
            username: 'jayed.nazir',
            role: 'admin',
          },
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'Register a new sales representative' })
  @ApiBody({
    description: 'Sales representative registration payload',
    type: RegisterSalesRepDto,
    examples: {
      default: {
        summary: 'Sample sales rep registration',
        value: {
          name: 'Abir Rahman',
          username: 'abir.rahman',
          email: 'abir@manush.tech',
          phone: '+8801711355057',
          password: 'Abir015!',
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Sales representative registered successfully',
    schema: {
      example: {
        statusCode: 201,
        message: 'Created successfully',
        path: '/api/v1/auth/register/sales-rep',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {
          accessToken: '<jwt-token>',
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            id: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
            user_id: '82a0b644-8235-45e9-8c21-ffb1eb58c556',
            type: 'sales_rep',
            name: 'Abir Rahman',
            email: 'abir@manush.tech',
            phone: '+8801711355057',
            username: 'abir.rahman',
            role: 'sales_rep',
          },
        },
      },
    },
  })
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
  @ApiOperation({ summary: 'Authenticate an admin or sales representative' })
  @ApiBody({
    description: 'Login credentials',
    type: CreateAuthDto,
    examples: {
      salesRep: {
        summary: 'Sales representative login',
        value: {
          type: 'sales_rep',
          identifier: 'salesrep1@example.com',
          password: 'SalesRep1!',
        },
      },
      admin: {
        summary: 'Admin login',
        value: {
          type: 'admin',
          identifier: 'jayed.official1998@gmail.com',
          password: 'Jayed015',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Login successful',
    schema: {
      example: {
        statusCode: 200,
        message: 'Logged in successfully',
        path: '/api/v1/auth/login',
        timestamp: '2025-01-01T00:00:00.000Z',
        data: {
          accessToken: '<jwt-token>',
          expiresIn: 3600,
          tokenType: 'Bearer',
          user: {
            id: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
            user_id: '82a0b644-8235-45e9-8c21-ffb1eb58c556',
            type: 'sales_rep',
            name: 'Abir Rahman',
            email: 'abir@manush.tech',
            phone: '+8801711355057',
            username: 'abir.rahman',
            role: 'sales_rep',
          },
        },
      },
    },
  })
  async login(
    @Body() createAuthDto: CreateAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log(createAuthDto);
    const result = await this.authService.login(createAuthDto);
    res.statusMessage = 'Logged in successfully';
    this.authService.attachAuthCookie(res, result.accessToken);
    this.authService.attachAuthHeader(res, result.accessToken);
    return result;
  }
}
