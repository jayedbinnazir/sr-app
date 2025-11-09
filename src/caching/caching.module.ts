import { Module } from '@nestjs/common';
import { CachingService } from './caching.service';
import { CachingController } from './caching.controller';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: () => ({
        store: redisStore,
        host: 'redis', // <-- matches the Docker service name
        port: 6379,
        ttl: 60, // seconds (1 minute cache)
        password: 'myStrongPassword',
      }),
    }),
  ],
  controllers: [CachingController],
  providers: [CachingService],
  exports: [CacheModule],
})
export class CachingModule {}
