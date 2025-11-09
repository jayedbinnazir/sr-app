import { Controller, Get, HttpException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): any {
    throw new HttpException('Just Testing Exception Filters', 400);
    return {
      msg: `requested by ${process.env.APP_NAME}`,
    };
  }
}
