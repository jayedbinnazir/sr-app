import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Territory } from "./entities/territory.entity";
import { TerritoryController } from "./controllers/territory.controller";
import { TerritoryService } from "./services/territory.service";
import { Area } from "src/area/entities/area.entity";
import { CachingModule } from "src/caching/caching.module";

@Module({
  imports: [TypeOrmModule.forFeature([Territory, Area]), CachingModule],
  controllers: [TerritoryController],
  providers: [TerritoryService],
  exports: [TerritoryService],
})
export class TerritoryModule {}

