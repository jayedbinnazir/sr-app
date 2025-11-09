import { Module } from '@nestjs/common';
import { RetailerController } from './controllers/retailer.controller';
import { RetailerAdminController } from './controllers/retailer-admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Retailer } from './entities/retailer.entity';
import { SalesRepRetailer } from 'src/sales_rep/entities/sales-rep-retailer.entity';
import { Region } from 'src/region/entities/region.entity';
import { Area } from 'src/area/entities/area.entity';
import { Distributor } from 'src/distributor/entities/distributor.entity';
import { Territory } from 'src/territory/entities/territory.entity';
import { CachingModule } from 'src/caching/caching.module';
import { AuthModule } from 'src/auth/auth.module';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import { RetailerAssignmentController } from './controllers/retailer-assignment.controller';
import { RetailerService } from './services/retailer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Retailer,
      SalesRep,
      SalesRepRetailer,
      Region,
      Area,
      Distributor,
      Territory,
    ]),
    CachingModule,
    AuthModule,
  ],
  controllers: [
    RetailerController,
    RetailerAdminController,
    RetailerAssignmentController,
  ],
  providers: [RetailerService],
  exports: [RetailerService],
})
export class RetailerModule {}

