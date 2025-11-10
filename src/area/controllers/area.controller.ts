import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { AreaService } from "../services/area.service";
import { CreateAreaDto } from "../dto/create-area.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateAreaDto } from "../dto/update-area.dto";
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags('Areas')
@Controller({
  path: 'v1/admin/areas',
  version: '1',
})
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new area' })
  @ApiBody({
    type: CreateAreaDto,
    examples: {
      default: {
        summary: 'Sample area',
        value: {
          name: 'Gulshan',
          region_id: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
        },
      },
    },
  })
  createArea(@Body() createAreaDto: CreateAreaDto) {
    return this.areaService.createArea(createAreaDto);
  }

  @Get()
  @ApiOperation({ summary: 'List areas with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  getAreas(@Query() options: PaginationDto) {
    return this.areaService.getAreas(options);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search areas by name' })
  @ApiQuery({
    name: 'search',
    description: 'Search keyword',
    example: 'Gulshan',
  })
  searchAreas(@Query('search') search: string) {
    return this.areaService.searchAreas(search);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update area information' })
  @ApiParam({
    name: 'id',
    description: 'Area identifier',
    example: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
  })
  @ApiBody({
    type: UpdateAreaDto,
    examples: {
      default: {
        summary: 'Update area name',
        value: { name: 'Banani' },
      },
    },
  })
  updateArea(@Param('id') id: string, @Body() updateAreaDto: UpdateAreaDto) {
    return this.areaService.updateArea(id, updateAreaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an area' })
  @ApiParam({
    name: 'id',
    description: 'Area identifier',
    example: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
  })
  deleteArea(@Param('id') id: string) {
    return this.areaService.deleteArea(id);
  }

  @Get('total-count')
  @ApiOperation({ summary: 'Get total area count' })
  totalAreaCount() {
    return this.areaService.totalAreaCount();
  }

  @Get(':id/territories')
  @ApiOperation({ summary: 'List territories within an area' })
  @ApiParam({
    name: 'id',
    description: 'Area identifier',
    example: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  getTerritoriesByAreaId(@Param('id') id: string, @Query() options: PaginationDto) {
    return this.areaService.getTerritoriesByAreaId(id, options);
  }

  @Get(':id/territories/total-count')
  @ApiOperation({ summary: 'Get count of territories within an area' })
  @ApiParam({
    name: 'id',
    description: 'Area identifier',
    example: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
  })
  getTerritoriesCountByAreaId(@Param('id') id: string) {
    return this.areaService.getTerritoriesCountByAreaId(id);
  }
}
