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
import { IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BulkAssignAreasDto } from '../dto/bulk-assign-areas.dto';
import { BulkUnassignAreasDto } from '../dto/bulk-unassign-areas.dto';

class RegionAreaFilterQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by distributor ID',
    example: '2a7d9bc3-ae6b-4fbb-8e74-b4b9953d8f52',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  distributorId?: string;

  @ApiPropertyOptional({
    description: 'Filter by territory ID',
    example: '9bf9f1e4-8a34-4980-9dba-2bcb67688423',
    type: String,
  })
  @IsOptional()
  @IsUUID()
  @Type(() => String)
  territoryId?: string;
}

@ApiTags('Regions')
@Controller({
  path: 'v1/admin/regions',
  version: '1',
})
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(AuthRole.Admin)
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
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'distributorId',
    required: false,
    type: String,
    description: 'Filter areas by distributor',
    example: '2a7d9bc3-ae6b-4fbb-8e74-b4b9953d8f52',
  })
  @ApiQuery({
    name: 'territoryId',
    required: false,
    type: String,
    description: 'Filter areas by territory',
    example: '9bf9f1e4-8a34-4980-9dba-2bcb67688423',
  })
  getAreas(
    @Param('id') regionId: string,
    @Query() query: RegionAreaFilterQueryDto,
  ) {
    return this.regionService.getAreaFilteredByRegionId(
      regionId,
      query,
      {
        distributorId: query.distributorId,
        territoryId: query.territoryId,
      },
    );
  }

  @Post(':id/areas/assign')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Assign multiple areas to a region' })
  @ApiParam({
    name: 'id',
    description: 'Region identifier',
    example: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
  })
  @ApiBody({
    type: BulkAssignAreasDto,
    examples: {
      default: {
        summary: 'Assign areas to region',
        value: {
          areaIds: [
            '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
            '3c8e5b2d-98ab-4a6f-9bfa-9ae4f9d8c1c4',
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Summary of bulk area assignment',
    schema: {
      example: {
        regionId: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
        requested: 3,
        assigned: 2,
        alreadyAssigned: ['7f531df6-7899-4d9b-9a25-44d5aa5c9bda'],
        conflicting: ['d1a6efb9-38e7-48bf-8c1a-3d0d2f22a9b4'],
        missing: ['3c8e5b2d-98ab-4a6f-9bfa-9ae4f9d8c1c4'],
      },
    },
  })
  assignAreasToRegion(
    @Param('id') regionId: string,
    @Body() dto: BulkAssignAreasDto,
  ) {
    return this.regionService.assignAreasToRegion(regionId, dto.areaIds);
  }

  @Post(':id/areas/unassign')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({ summary: 'Unassign multiple areas from a region' })
  @ApiParam({
    name: 'id',
    description: 'Region identifier',
    example: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
  })
  @ApiBody({
    type: BulkUnassignAreasDto,
    examples: {
      default: {
        summary: 'Unassign areas from region',
        value: {
          areaIds: [
            '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
            '3c8e5b2d-98ab-4a6f-9bfa-9ae4f9d8c1c4',
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Summary of bulk area unassignment',
    schema: {
      example: {
        regionId: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
        requested: 2,
        unassigned: 2,
        skipped: [],
        missing: ['3c8e5b2d-98ab-4a6f-9bfa-9ae4f9d8c1c4'],
      },
    },
  })
  unassignAreasFromRegion(
    @Param('id') regionId: string,
    @Body() dto: BulkUnassignAreasDto,
  ) {
    return this.regionService.unassignAreasFromRegion(regionId, dto.areaIds);
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