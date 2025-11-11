import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RegionService } from '../services/region.service';
import { CreateRegionDto } from '../dto/create-region.dto';
import { UpdateRegionDto } from '../dto/update-region.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';

@ApiTags('Regions')
@Controller({
  path: 'v1/admin/regions',
  version: '1',
})
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Create a new region' })
  @ApiBody({
    type: CreateRegionDto,
    examples: {
      default: {
        summary: 'Sample region',
        value: {
          name: 'Sylhet',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Region created',
    schema: {
      example: {
        id: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
        name: 'Sylhet',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
    },
  })
  create(@Body() dto: CreateRegionDto) {
    return this.regionService.createRegion(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List regions with pagination' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  getRegions(@Query() pagination: PaginationDto) {
    return this.regionService.getRegions(pagination);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update region details' })
  @ApiParam({
    name: 'id',
    description: 'Region identifier',
    example: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
  })
  @ApiBody({
    type: UpdateRegionDto,
    examples: {
      default: {
        summary: 'Update name',
        value: { name: 'New Region Name' },
      },
    },
  })
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionService.updateRegion(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Delete a region' })
  @ApiParam({
    name: 'id',
    description: 'Region identifier',
    example: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
  })
  remove(@Param('id') id: string) {
    return this.regionService.deleteRegion(id);
  }

  @Get(':id/areas')
  @ApiOperation({ summary: 'List areas within a region' })
  @ApiParam({
    name: 'id',
    description: 'Region identifier',
    example: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
  })
  getAreas(@Param('id') regionId: string, @Query() pagination: PaginationDto) {
    return this.regionService.getAreasByRegionId(regionId, pagination);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total region count' })
  getRegionCount() {
    return this.regionService.regionCount();
  }

  @Get(':id/areas/count')
  @ApiOperation({ summary: 'Get total number of areas inside a region' })
  @ApiParam({
    name: 'id',
    description: 'Region identifier',
    example: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
  })
  getAreaCount(@Param('id') regionId: string) {
    return this.regionService.getAreasCountByRegionId(regionId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search regions by name' })
  @ApiQuery({
    name: 'search',
    description: 'Search term for region name',
    example: 'Dhaka',
  })
  searchRegions(@Query('search') search: string) {
    return this.regionService.searchRegions(search);
  }
}