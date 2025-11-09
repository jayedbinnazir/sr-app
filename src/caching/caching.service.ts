import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CachingService implements OnModuleInit {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async onModuleInit() {
    console.log('🧪 Testing Redis connection with password...');

    try {
      await this.cacheManager.set('connection-test', 'success', 10);
      const test = await this.cacheManager.get('connection-test');
      console.log('✅ Redis connection test:', test);

      // Test with your actual data pattern
      await this.cacheManager.set(
        'user:test',
        { id: 999, name: 'Test User' },
        60,
      );
      const userTest = await this.cacheManager.get('user:test');
      console.log('✅ User cache test:', userTest);
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
    }
  }

  async findOne(id: number) {
    const cacheKey = `user:${id}`;

    // Try to get from cache
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      console.log('✅ Returning from cache');
      return cached;
    }

    // Fetch from DB (simulated)
    const user = { id, name: 'Jayed', age: 25 };
    console.log('🔄 Fetching from DB');

    // Save to Redis - TTL in seconds (3000 seconds = 50 minutes)
    await this.cacheManager.set(cacheKey, user, 300000);
    console.log('💾 Saved to cache');

    return user;
  }
}
