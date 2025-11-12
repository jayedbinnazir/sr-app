import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesRepService } from '../services/sales_rep.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';
import { AssignRetailerDto, BulkAssignRetailersDto } from '../dto/assign-retailer.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/auth/types/auth-user.type';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  RetailerFilterQueryDto,
  RetailerPaginationQueryDto,
  RetailerSearchQueryDto,
} from '../dto/retailer-query.dto';

type AssignedRetailerList = Awaited<
  ReturnType<SalesRepService['listPaginatedAssignedRetailers']>
>;
type AssignmentSummary = Awaited<
  ReturnType<SalesRepService['assignRetailersToSalesRep']>
>;
type AssignRetailerResponse = Awaited<
  ReturnType<SalesRepService['assignRetailerToSalesRep']>
>;

@ApiTags('Admin Sales Reps')
@ApiBearerAuth()
@Controller({
  path: 'v1/admin/sales-reps',
  version: '1',
})
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(AuthRole.Admin)
export class SalesRepAdminController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Get(':salesRepId/retailers')
  @ApiOperation({
    summary: 'List retailers assigned to a sales rep',
  })
  @ApiParam({
    name: 'salesRepId',
    description: 'Sales representative identifier',
    example: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated list of assigned retailers',
    schema: {
      example: {
        data: [
          {
            id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
            uid: 'RT-2025-0001',
            name: 'Abir General Store',
            phone: '+8801711000000',
          },
        ],
        meta: {
          total: 42,
          page: 1,
          limit: 20,
          hasNext: true,
        },
      } as AssignedRetailerList,
    },
  })
  listAssignedRetailersForSalesRep(
    @Param('salesRepId') salesRepId: string,
    @Query() query: RetailerPaginationQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.listPaginatedAssignedRetailers(
      salesRepId,
      query,
    );
  }

  @Get('retailers/unassigned')
  @ApiOperation({
    summary: 'List retailers with no active sales rep assignment',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated list of unassigned retailers',
    schema: {
      example: {
        data: [
          {
            id: '23974db4-9804-43f5-b361-5cc9af43e993',
            uid: 'RT-2025-0099',
            name: 'New Horizon Shop',
            phone: '+8801814000000',
          },
        ],
        meta: {
          total: 8,
          page: 1,
          limit: 20,
          hasNext: false,
        },
      } as AssignedRetailerList,
    },
  })
  listUnassignedRetailers(
    @Query() query: RetailerPaginationQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.listAllPaginatedUnassignedRetailers(query);
  }

  @Get('retailers/search')
  @ApiOperation({ summary: 'Search retailers by name, phone, or UID' })
  @ApiQuery({
    name: 'search',
    description: 'Search keyword',
    example: 'horizon',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated search results',
    schema: {
      example: {
        data: [
          {
            id: '23974db4-9804-43f5-b361-5cc9af43e993',
            uid: 'RT-2025-0099',
            name: 'New Horizon Shop',
            phone: '+8801814000000',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          hasNext: false,
        },
      } as AssignedRetailerList,
    },
  })
  searchRetailers(
    @Query() query: RetailerSearchQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.searchRetailers(query.search ?? '', query);
  }

  @Get('retailers/filter')
  @ApiOperation({ summary: 'Filter retailers by hierarchy' })
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'JSON string describing filters. Example: {"regionId":"7d1d0c03-4c7f-4a3f-a4c1-4c6e4d15ef99"}',
    example: '{"regionId":"7d1d0c03-4c7f-4a3f-a4c1-4c6e4d15ef99"}',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated, filtered retailer list',
    schema: {
      example: {
        data: [
          {
            id: '23974db4-9804-43f5-b361-5cc9af43e993',
            uid: 'RT-2025-0099',
            name: 'New Horizon Shop',
            phone: '+8801814000000',
            region: { name: 'Dhaka Region' },
            area: { name: 'Gulshan' },
            distributor: { name: 'ABC Distributors' },
            territory: { name: 'Gulshan North' },
          },
        ],
        meta: {
          total: 3,
          page: 1,
          limit: 20,
          hasNext: false,
        },
      } as AssignedRetailerList,
    },
  })
  filterRetailers(
    @Query() query: RetailerFilterQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.filterRetailers(query.filter, query);
  }

  @Get(':salesRepId/retailers/filter')
  @ApiOperation({
    summary: 'Filter retailers assigned to a sales rep',
  })
  @ApiParam({
    name: 'salesRepId',
    description: 'Sales representative identifier',
    example: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
  })
  @ApiQuery({
    name: 'filter',
    required: false,
    description:
      'JSON string describing filters. Example: {"regionId":"7d1d0c03-4c7f-4a3f-a4c1-4c6e4d15ef99"}',
    example: '{"regionId":"7d1d0c03-4c7f-4a3f-a4c1-4c6e4d15ef99"}',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated, filtered list of assigned retailers',
    schema: {
      example: {
        data: [
          {
            id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
            uid: 'RT-2025-0001',
            name: 'Abir General Store',
            phone: '+8801711000000',
            region: { name: 'Dhaka Region' },
            area: { name: 'Gulshan' },
            distributor: { name: 'ABC Distributors' },
            territory: { name: 'Gulshan North' },
          },
        ],
        meta: {
          total: 3,
          page: 1,
          limit: 20,
          hasNext: false,
        },
      } as AssignedRetailerList,
    },
  })
  filterAssignedRetailers(
    @Param('salesRepId') salesRepId: string,
    @Query() query: RetailerFilterQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.filterAssignedRetailers(
      salesRepId,
      query,
      query.filter,
    );
  }

  @Get('retailers/total-count')
  @ApiOperation({ summary: 'Get total number of active retailers' })
  @ApiOkResponse({
    description: 'Total retailer count',
    schema: { example: 256 },
  })
  totalRetailersCount(): Promise<number> {
    return this.salesRepService.totalRetailersCount();
  }

  @Get(':salesRepId/retailers/count')
  @ApiOperation({ summary: 'Get count of retailers assigned to a sales rep' })
  @ApiParam({
    name: 'salesRepId',
    description: 'Sales representative identifier',
    example: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
  })
  @ApiOkResponse({
    description: 'Total assigned retailer count',
    schema: { example: 42 },
  })
  assignedRetailerCount(
    @Param('salesRepId') salesRepId: string,
  ): Promise<number> {
    return this.salesRepService.assignedRetailerCount(salesRepId);
  }

  @Get('retailers/:retailerId')
  @ApiOperation({ summary: 'Get retailer details' })
  @ApiParam({
    name: 'retailerId',
    description: 'Retailer identifier',
    example: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
  })
  @ApiOkResponse({
    description: 'Retailer profile',
    schema: {
      example: {
        id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
        uid: 'RT-2025-0001',
        name: 'Abir General Store',
        phone: '+8801711000000',
        region: { name: 'Dhaka Region' },
        area: { name: 'Gulshan' },
        distributor: { name: 'ABC Distributors' },
        territory: { name: 'Gulshan North' },
      },
    },
  })
  getRetailerDetail(@Param('retailerId') retailerId: string) {
    return this.salesRepService.getRetailerDetail(retailerId);
  }

  @Post(':salesRepId/retailers')
  @ApiOperation({ summary: 'Assign a retailer to a sales rep' })
  @ApiParam({
    name: 'salesRepId',
    description: 'Sales representative identifier',
    example: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
  })
  @ApiBody({
    type: AssignRetailerDto,
    examples: {
      default: {
        summary: 'Assign retailer payload',
        value: {
          retailer_id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Assignment summary',
    schema: {
      example: {
        summary: {
          salesRepId: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
          requested: 1,
          assigned: 1,
          skipped: 0,
          missing: [],
        },
      } as AssignRetailerResponse,
    },
  })
  assignRetailer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salesRepId') salesRepId: string,
    @Body() assignRetailerDto: AssignRetailerDto,
  ): Promise<AssignRetailerResponse> {
    return this.salesRepService.assignRetailerToSalesRep(
      salesRepId,
      assignRetailerDto.retailer_id,
      user.id,
    );
  }

  @Post(':salesRepId/retailers/bulk')
  @ApiOperation({ summary: 'Bulk assign retailers to a sales rep' })
  @ApiParam({
    name: 'salesRepId',
    description: 'Sales representative identifier',
    example: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
  })
  @ApiBody({
    type: BulkAssignRetailersDto,
    examples: {
      default: {
        summary: 'Bulk assignment payload',
        value: {
          retailers: [
            { retailer_id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd' },
            { retailer_id: '23974db4-9804-43f5-b361-5cc9af43e993' },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Bulk assignment summary',
    schema: {
      example: {
        salesRepId: '9f0e35a6-6c2c-4ad1-bc8c-86a130c97b6b',
        requested: 2,
        assigned: 2,
        skipped: 0,
        missing: [],
      } as AssignmentSummary,
    },
  })
  bulkAssignRetailers(
    @CurrentUser() user: AuthenticatedUser,
    @Param('salesRepId') salesRepId: string,
    @Body() bulkAssignRetailersDto: BulkAssignRetailersDto,
  ): Promise<AssignmentSummary> {
    const retailerIds = bulkAssignRetailersDto.retailers.map(
      (item) => item.retailer_id,
    );
    return this.salesRepService.assignRetailersToSalesRep(
      salesRepId,
      retailerIds,
      user.id,
    );
  }
}


