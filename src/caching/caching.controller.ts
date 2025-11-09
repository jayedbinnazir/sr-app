import { Controller, Get, Body } from '@nestjs/common';
import { CachingService } from './caching.service';

@Controller('caching')
export class CachingController {
  constructor(private readonly cachingService: CachingService) {}

  @Get()
  async findAll() {
    const id = 2;
    try {
      const user = await this.cachingService.findOne(id);
      return {
        success: true,
        data: user,
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
}
