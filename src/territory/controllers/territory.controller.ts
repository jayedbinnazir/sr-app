import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { TerritoryService } from "../services/territory.service";
import { CreateTerritoryDto } from "../dto/create-territory.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateTerritoryDto } from "../dto/update-territory.dto";

@Controller({
  path: 'v1/admin/territories',
  version: '1',
})
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Post()
  createTerritory(@Body() createTerritoryDto: CreateTerritoryDto) {
    return this.territoryService.createTerritory(createTerritoryDto);
  }

  
  @Get()
  getTerritories(@Query() options: PaginationDto) {
    return this.territoryService.getTerritories(options);
  }


  @Get('search')
  searchTerritories(@Query('search') search: string) {
    return this.territoryService.searchTerritories(search);
  }

  @Patch(':id')
  updateTerritory(@Param('id') id: string, @Body() updateTerritoryDto: UpdateTerritoryDto) {
    return this.territoryService.updateTerritory(id, updateTerritoryDto);
  }

  @Delete(':id')
  deleteTerritory(@Param('id') id: string) {
    return this.territoryService.deleteTerritory(id);
  }

  @Get('total-count')
  totalTerritoryCount() {
    return this.territoryService.totalTerritoryCount();
  }

}

