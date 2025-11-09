import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { RegionService } from '../services/region.service';
import { CreateRegionDto } from '../dto/create-region.dto';
import { UpdateRegionDto } from '../dto/update-region.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Controller({
  path: 'v1/admin/regions',
  version: '1',
})
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Post()
  create(@Body() dto: CreateRegionDto) {
    return this.regionService.createRegion(dto);
  }

  @Get()
  getRegions(@Query() pagination: PaginationDto) {
    return this.regionService.getRegions(pagination);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionService.updateRegion(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.regionService.deleteRegion(id);
  }

  @Get(':id/areas')
  getAreas(@Param('id') regionId: string, @Query() pagination: PaginationDto) {
    return this.regionService.getAreasByRegionId(regionId, pagination);
  }

  @Get('count')
  getRegionCount() {
    return this.regionService.regionCount();
  }

  @Get(':id/areas/count')
  getAreaCount(@Param('id') regionId: string) {
    return this.regionService.getAreasCountByRegionId(regionId);
  }

  @Get('search')
  searchRegions(@Query('search') search: string) {
    return this.regionService.searchRegions(search);
  }
}