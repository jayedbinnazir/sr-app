import { Module } from '@nestjs/common';
import { RetailerAdminController } from './controllers/retailer-admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Retailer } from './entities/retailer.entity';
import { Region } from 'src/region/entities/region.entity';
import { Area } from 'src/area/entities/area.entity';
import { Distributor } from 'src/distributor/entities/distributor.entity';
import { Territory } from 'src/territory/entities/territory.entity';
import { AuthModule } from 'src/auth/auth.module';
import { RetailerService } from './services/retailer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Retailer,
      Region,
      Area,
      Distributor,
      Territory,
    ]),
    AuthModule,
  ],
  controllers: [
    RetailerAdminController,
  ],
  providers: [RetailerService],
  exports: [RetailerService],
})
export class RetailerModule {}

