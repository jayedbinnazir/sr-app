import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Distributor } from './entities/distributor.entity';
import { DistributorController } from './controllers/distributor.controller';
import { DistributorService } from './services/distributor.service';


@Module({
  imports: [TypeOrmModule.forFeature([Distributor])],
  controllers: [DistributorController],
  providers: [DistributorService],
  exports: [DistributorService],
})
export class DistributorModule {}

