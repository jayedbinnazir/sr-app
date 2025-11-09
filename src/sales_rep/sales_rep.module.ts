import { Module } from '@nestjs/common';
import { SalesRepController } from './controllers/sales_rep.controller';
import { SalesRepService } from './services/sales_rep.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesRep } from './entities/sales_rep.entity';
import { SalesRepRetailer } from './entities/sales-rep-retailer.entity';



@Module({
  imports: [TypeOrmModule.forFeature([SalesRep, SalesRepRetailer])],
  controllers: [SalesRepController],
  providers: [SalesRepService],
})
export class SalesRepModule {}

