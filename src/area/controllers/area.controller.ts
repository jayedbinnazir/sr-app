import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { AreaService } from "../services/area.service";
import { CreateAreaDto } from "../dto/create-area.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateAreaDto } from "../dto/update-area.dto";

@Controller({
  path: 'v1/admin/areas',
  version: '1',
})
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  createArea(@Body() createAreaDto: CreateAreaDto) {
    return this.areaService.createArea(createAreaDto);
  }

  @Get()
  getAreas(@Query() options: PaginationDto) {
    return this.areaService.getAreas(options);
  }

  @Get('search')
  searchAreas(@Query('search') search: string) {
    return this.areaService.searchAreas(search);
  }

  @Patch(':id')
  updateArea(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areaService.updateArea(id, updateAreaDto);
  }

  @Delete(':id')
  deleteArea(@Param('id') id: string) {
    return this.areaService.deleteArea(id);
  }

  @Get('total-count')
  totalAreaCount() {
    return this.areaService.totalAreaCount();
  }


  @Get(':id/territories')
  getTerritoriesByAreaId(@Param('id') id: string, @Query() options: PaginationDto) {
    return this.areaService.getTerritoriesByAreaId(id, options);
  }

  @Get(':id/territories/total-count')
  getTerritoriesCountByAreaId(@Param('id') id: string) {
    return this.areaService.getTerritoriesCountByAreaId(id);
  }
}

