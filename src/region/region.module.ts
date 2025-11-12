import { TypeOrmModule } from "@nestjs/typeorm";
import { RegionController } from "./controllers/region.controller";
import { RegionService } from "./services/region.service";
import { Region } from "./entities/region.entity";
import { Module } from "@nestjs/common";
import { CachingModule } from "src/caching/caching.module";

@Module({
  imports: [TypeOrmModule.forFeature([Region]), CachingModule],
  controllers: [RegionController],
  providers: [RegionService],
  exports: [RegionService],
})
export class RegionModule { }

