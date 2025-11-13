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
import { BulkAssignTerritoriesDto } from "../dto/bulk-assign-territories.dto";
import { BulkUnassignTerritoriesDto } from "../dto/bulk-unassign-territories.dto";

@ApiTags('Areas')
@Controller({
  path: 'v1/admin/areas',
  version: '1',
})
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(AuthRole.Admin)
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

  @Post(':id/territories/assign')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Assign multiple territories to an area' })
  @ApiParam({
    name: 'id',
    description: 'Area identifier',
    example: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
  })
  @ApiBody({
    type: BulkAssignTerritoriesDto,
    examples: {
      default: {
        summary: 'Assign territories to area',
        value: {
          territoryIds: [
            'bf98c716-bf37-4c2b-9d49-1b30c5c0cf1e',
            '3a760e41-1c7d-4b0a-8a88-0fb9bc4a27c3',
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Summary of bulk territory assignment',
    schema: {
      example: {
        areaId: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
        requested: 2,
        assigned: 1,
        alreadyAssigned: ['bf98c716-bf37-4c2b-9d49-1b30c5c0cf1e'],
        conflicting: ['4c5f4d61-1d41-4f1b-87d3-e2f5ce7a0b1a'],
        missing: [],
      },
    },
  })
  assignTerritoriesToArea(
    @Param('id') areaId: string,
    @Body() dto: BulkAssignTerritoriesDto,
  ) {
    return this.areaService.assignTerritoriesToArea(areaId, dto.territoryIds);
  }

  @Post(':id/territories/unassign')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Unassign multiple territories from an area' })
  @ApiParam({
    name: 'id',
    description: 'Area identifier',
    example: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
  })
  @ApiBody({
    type: BulkUnassignTerritoriesDto,
    examples: {
      default: {
        summary: 'Unassign territories from area',
        value: {
          territoryIds: [
            'bf98c716-bf37-4c2b-9d49-1b30c5c0cf1e',
            '3a760e41-1c7d-4b0a-8a88-0fb9bc4a27c3',
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Summary of bulk territory unassignment',
    schema: {
      example: {
        areaId: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
        requested: 2,
        unassigned: 1,
        skipped: ['3a760e41-1c7d-4b0a-8a88-0fb9bc4a27c3'],
        missing: [],
      },
    },
  })
  unassignTerritoriesFromArea(
    @Param('id') areaId: string,
    @Body() dto: BulkUnassignTerritoriesDto,
  ) {
    return this.areaService.unassignTerritoriesFromArea(
      areaId,
      dto.territoryIds,
    );
  }
}
