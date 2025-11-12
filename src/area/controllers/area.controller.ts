import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
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
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { AdminGuard } from "src/auth/guards/admin.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { AuthRole } from "src/auth/types/auth-role.enum";

@ApiTags('Areas')
@Controller({
  path: 'v1/admin/areas',
  version: '1',
})
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
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
  @ApiQuery({
    name: 'distributorId',
    required: false,
    type: String,
    description: 'Filter territories by distributor',
    example: 'c9e4b8b2-64db-4df5-b8f5-ffb1f4f56f9d',
  })
  getFilteredTerritoriesByAreaId(
    @Param('id') id: string,
    @Query() options: PaginationDto,
    @Query('distributorId') distributorId?: string,
  ) {
    return this.areaService.getFilteredTerritoriesByAreaId(
      id,
      options,
      {
        distributorId,
      },
    );
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
