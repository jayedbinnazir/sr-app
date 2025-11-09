import { Module } from '@nestjs/common';
import { CachingService } from './caching.service';
import { CachingController } from './caching.controller';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const ttl = Number(configService.get('RETAILER_CACHE_TTL') ?? 60);
        return {
          store: redisStore as unknown,
          host: configService.get<string>('REDIS_HOST') ?? 'redis',
          port: Number(configService.get<number>('REDIS_PORT') ?? 6379),
          password: configService.get<string>('REDIS_PASSWORD') ?? undefined,
          ttl,
        };
      },
    }),
  ],
  controllers: [CachingController],
  providers: [CachingService],
  exports: [CacheModule],
})
export class CachingModule {}
