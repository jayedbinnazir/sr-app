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
import { RetailerService } from '../services/retailer.service';
import { CreateRetailerAdminDto } from '../dto/create-retailer-admin.dto';
import { AdminUpdateRetailerDto } from '../dto/admin-update-retailer.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';

@ApiTags('Retailers')
@ApiBearerAuth()
@Controller({
  path: 'v1/admin/retailers',
  version: '1',
})
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(AuthRole.Admin)
export class RetailerAdminController {
  constructor(private readonly retailerService: RetailerService) {}

  @Get()
  @ApiOperation({ summary: 'List retailers with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated retailer listing',
    schema: {
      example: {
        meta: {
          total: 42,
          page: 1,
          limit: 20,
          hasNext: true,
        },
        data: [
          {
            id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
            uid: 'RT-2025-0001',
            name: 'Abir General Store',
            phone: '+8801711000000',
            region_id: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
            area_id: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
            distributor_id: '2a7d9bc3-ae6b-4fbb-8e74-b4b9953d8f52',
            territory_id: '9bf9f1e4-8a34-4980-9dba-2bcb67688423',
            points: 120,
            routes: 'Route-A > Route-B',
            notes: 'Follow up next Monday',
            isAssigned: true,
          },
        ],
      },
    },
  })
  listRetailers(@Query() query: PaginationDto) {
    return this.retailerService.getRetailers(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search retailers by name, UID, or phone' })
  @ApiQuery({
    name: 'search',
    description: 'Search keyword',
    example: 'Gulshan',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated search results',
    schema: {
      example: {
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          hasNext: false,
        },
        data: [
          {
            id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
            uid: 'RT-2025-0001',
            name: 'Abir General Store',
            phone: '+8801711000000',
            points: 120,
          },
        ],
      },
    },
  })
  searchRetailers(
    @Query('search') search: string,
    @Query() query: PaginationDto,
  ) {
    return this.retailerService.searchRetailers(search, query);
  }

  @Get('count/total')
  @ApiOperation({ summary: 'Get total retailer count' })
  @ApiOkResponse({ description: 'Total retailer count', schema: { example: 256 } })
  totalRetailers() {
    return this.retailerService.retailerCount();
  }
  @Post()
  @ApiOperation({ summary: 'Create a retailer' })
  @ApiBody({
    type: CreateRetailerAdminDto,
    examples: {
      default: {
        summary: 'Create retailer payload',
        value: {
          uid: 'RT-2025-0100',
          name: 'New Horizon Shop',
          phone: '+8801814000000',
          region_id: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec',
          area_id: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
          distributor_id: '2a7d9bc3-ae6b-4fbb-8e74-b4b9953d8f52',
          territory_id: '9bf9f1e4-8a34-4980-9dba-2bcb67688423',
          points: 75,
          routes: 'Route-A',
          notes: 'Priority customer',
        },
      },
    },
  })
  createRetailer(@Body() dto: CreateRetailerAdminDto) {
    return this.retailerService.createRetailer(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get retailer details' })
  @ApiParam({
    name: 'id',
    description: 'Retailer identifier',
    example: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
  })
  getRetailer(@Param('id') retailerId: string) {
    return this.retailerService.getRetailerDetail(retailerId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update retailer details' })
  @ApiParam({
    name: 'id',
    description: 'Retailer identifier',
    example: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
  })
  @ApiBody({
    type: AdminUpdateRetailerDto,
    examples: {
      default: {
        summary: 'Update retailer payload',
        value: {
          name: 'Updated Retailer Name',
          routes: 'Route-B',
          notes: 'Updated notes',
        },
      },
    },
  })
  updateRetailer(
    @Param('id') retailerId: string,
    @Body() dto: AdminUpdateRetailerDto,
  ) {
    return this.retailerService.updateRetailer(retailerId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a retailer' })
  @ApiParam({
    name: 'id',
    description: 'Retailer identifier',
    example: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
  })
  deleteRetailer(@Param('id') retailerId: string) {
    return this.retailerService.deleteRetailer(retailerId);
  }
}

