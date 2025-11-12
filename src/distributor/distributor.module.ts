import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Distributor } from './entities/distributor.entity';
import { DistributorController } from './controllers/distributor.controller';
import { DistributorSalesRepController } from './controllers/distributor-sales-rep.controller';
import { DistributorService } from './services/distributor.service';
import { AuthModule } from 'src/auth/auth.module';
import { CachingModule } from 'src/caching/caching.module';

@Module({
  imports: [TypeOrmModule.forFeature([Distributor]), AuthModule, CachingModule],
  controllers: [DistributorController, DistributorSalesRepController],
  providers: [DistributorService],
  exports: [DistributorService],
})
export class DistributorModule {}

