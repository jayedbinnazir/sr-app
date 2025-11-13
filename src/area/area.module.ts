import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from './entities/area.entity';
import { Region } from 'src/region/entities/region.entity';
import { AuthModule } from 'src/auth/auth.module';
import { AreaController } from './controllers/area.controller';
import { AreaService } from './services/area.service';
import { CachingModule } from 'src/caching/caching.module';

@Module({
  imports: [TypeOrmModule.forFeature([Area, Region]), AuthModule, CachingModule],
  controllers: [AreaController],
  providers: [AreaService],
  exports: [AreaService],
})
export class AreaModule {}

