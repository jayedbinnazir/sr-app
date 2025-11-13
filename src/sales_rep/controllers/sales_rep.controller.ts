import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SalesRepService } from '../services/sales_rep.service';
import { UpdateRetailerDto } from 'src/retailer/dto/update-retailer.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SalesRepGuard } from 'src/auth/guards/sales-rep.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';
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

@ApiTags('Sales Rep Retailers')
@ApiBearerAuth()
@Controller({
  path: 'v1/sales-reps/retailers',
  version: '1',
})
@UseGuards(JwtAuthGuard, SalesRepGuard)
@Roles(AuthRole.SalesRep)
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Get()
  @ApiOperation({ summary: 'List assigned retailers for the current sales rep' })
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
  listAssignedRetailers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RetailerPaginationQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.listPaginatedAssignedRetailers(
      user.id,
      query,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search within assigned retailers' })
  @ApiQuery({
    name: 'search',
    description: 'Search by retailer name, phone, or UID',
    example: 'abir',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated search results from assigned retailers',
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
          total: 1,
          page: 1,
          limit: 20,
          hasNext: false,
        },
      } as AssignedRetailerList,
    },
  })
  searchAssignedRetailers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RetailerSearchQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.searchAssignedRetailers(
      user.id,
      query.search ?? '',
      query,
    );
  }

  @Get('filter')
  @ApiOperation({ summary: 'Filter assigned retailers by hierarchy' })
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
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RetailerFilterQueryDto,
  ): Promise<AssignedRetailerList> {
    return this.salesRepService.filterAssignedRetailers(
      user.id,
      query,
      query.filter,
    );
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total assigned retailer count' })
  @ApiOkResponse({
    description: 'Total count of active assignments',
    schema: { example: 42 },
  })
  assignedRetailerCount(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<number> {
    return this.salesRepService.assignedRetailerCount(user.id);
  }

  @Get(':retailerId')
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

  @Patch(':retailerId')
  @ApiOperation({
    summary: 'Update points, routes, or notes for an assigned retailer',
  })
  @ApiParam({
    name: 'retailerId',
    description: 'Retailer identifier',
    example: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
  })
  @ApiBody({
    type: UpdateRetailerDto,
    examples: {
      updatePoints: {
        summary: 'Update retailer points',
        value: { points: 120 },
      },
      updateRoutes: {
        summary: 'Update retailer route information',
        value: { routes: 'Route-A > Route-B' },
      },
      updateNotes: {
        summary: 'Add a note for the retailer',
        value: { notes: 'Follow up next Monday' },
      },
    },
  })
  @ApiOkResponse({
    description: 'Updated retailer record',
    schema: {
      example: {
        id: '0c9d2be8-2d40-4315-9d35-640ebd4ad9cd',
        uid: 'RT-2025-0001',
        name: 'Abir General Store',
        points: 120,
        routes: 'Route-A > Route-B',
        notes: 'Follow up next Monday',
      },
    },
  })
  updateAssignedRetailer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('retailerId') retailerId: string,
    @Body() updateRetailerDto: UpdateRetailerDto,
  ) {
    return this.salesRepService.updateRetailer(
      user.id,
      { id: retailerId },
      updateRetailerDto,
    );
  }
}


