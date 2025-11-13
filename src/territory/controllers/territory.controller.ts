import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { TerritoryService } from "../services/territory.service";
import { CreateTerritoryDto } from "../dto/create-territory.dto";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateTerritoryDto } from "../dto/update-territory.dto";
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { AdminGuard } from "src/auth/guards/admin.guard";
import { Roles } from "src/auth/decorators/roles.decorator";
import { AuthRole } from "src/auth/types/auth-role.enum";

@ApiTags('Territories')
@Controller({
  path: 'v1/admin/territories',
  version: '1',
})
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Create a new territory' })
  @ApiBody({
    type: CreateTerritoryDto,
    examples: {
      default: {
        summary: 'Sample territory',
        value: {
          name: 'Gulshan 1',
          area_id: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
        },
      },
    },
  })
  createTerritory(@Body() createTerritoryDto: CreateTerritoryDto) {
    return this.territoryService.createTerritory(createTerritoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'List territories with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  getTerritories(@Query() options: PaginationDto) {
    return this.territoryService.getTerritories(options);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search territories by name' })
  @ApiQuery({
    name: 'search',
    description: 'Search keyword',
    example: 'Gulshan',
  })
  @ApiQuery({
    name: 'distributorId',
    required: false,
    type: String,
    description: 'Filter territories by distributor',
    example: '5f189af2-983f-4122-8f87-d47b1d1bcd9e',
  })
  searchFilteredTerritories(
    @Query('search') search: string,
    @Query() options: PaginationDto,
    @Query('distributorId') distributorId?: string,
  ) {
    return this.territoryService.searchFilteredTerritories(
      search,
      options,
      {
        distributorId,
      },
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Update territory details' })
  @ApiParam({
    name: 'id',
    description: 'Territory identifier',
    example: 'bf98c716-bf37-4c2b-9d49-1b30c5c0cf1e',
  })
  @ApiBody({
    type: UpdateTerritoryDto,
    examples: {
      default: {
        summary: 'Update name',
        value: { name: 'Gulshan 2' },
      },
    },
  })
  updateTerritory(@Param('id') id: string, @Body() updateTerritoryDto: UpdateTerritoryDto) {
    return this.territoryService.updateTerritory(id, updateTerritoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Delete a territory' })
  @ApiParam({
    name: 'id',
    description: 'Territory identifier',
    example: 'bf98c716-bf37-4c2b-9d49-1b30c5c0cf1e',
  })
  deleteTerritory(@Param('id') id: string) {
    return this.territoryService.deleteTerritory(id);
  }

  @Get('total-count')
  @ApiOperation({ summary: 'Get total territory count' })
  totalTerritoryCount() {
    return this.territoryService.totalTerritoryCount();
  }
}
