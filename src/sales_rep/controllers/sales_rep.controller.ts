import { BadRequestException, Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { SalesRepService } from '../services/sales_rep.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateRetailerDto } from 'src/retailer/dto/update-retailer.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Sales Representative Assignments')
@Controller({
  path: 'v1/sales-reps',
  version: '1',
})
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Get(':id/retailers')
  @ApiOperation({ summary: 'List retailers assigned to a sales representative' })
  @ApiParam({
    name: 'id',
    description: 'Sales representative identifier',
    example: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated list of assigned retailers',
    schema: {
      example: {
        data: [
          {
            id: '9eab40c2-ffb1-46c8-8fa1-79b9bcb63d6e',
            uid: 'RTL-0001',
            name: 'Elite Super Shop',
            phone: '+8801711000000',
            points: 1250,
            routes: 'Route A',
            notes: 'Top performing retailer',
          },
        ],
        meta: {
          total: 1,
          page: 1,
          limit: 20,
          hasNext: false,
        },
      },
    },
  })
  listAssignedRetailers(
    @Param('id') salesRepId: string,
    @Query() options: PaginationDto,
  ) {
    return this.salesRepService.listPaginatedAssignedRetailers(
      salesRepId,
      options,
    );
  }

  @Get(':id/retailers/search')
  @ApiOperation({ summary: 'Search assigned retailers by name, phone, or UID' })
  @ApiParam({
    name: 'id',
    description: 'Sales representative identifier',
    example: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
  })
  @ApiQuery({
    name: 'search',
    description: 'Search keyword (name, phone, UID, points, routes, notes)',
    example: 'Elite',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  searchAssignedRetailers(
    @Param('id') salesRepId: string,
    @Query('search') search: string,
    @Query() options: PaginationDto,
  ) {
    return this.salesRepService.searchAssignedRetailers(
      salesRepId,
      search ?? '',
      options,
    );
  }

  @Get(':id/retailers/:retailerRef')
  @ApiOperation({ summary: 'Get details of an assigned retailer' })
  @ApiParam({
    name: 'id',
    description: 'Sales representative identifier',
    example: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
  })
  @ApiParam({
    name: 'retailerRef',
    description: 'Retailer identifier or UID based on "by" query parameter',
    example: '9eab40c2-ffb1-46c8-8fa1-79b9bcb63d6e',
  })
  @ApiQuery({
    name: 'by',
    description: 'Interpretation of retailerRef',
    required: false,
    enum: ['id', 'uid'],
    example: 'id',
  })
  @ApiOkResponse({
    description: 'Retailer details',
    schema: {
      example: {
        id: '9eab40c2-ffb1-46c8-8fa1-79b9bcb63d6e',
        uid: 'RTL-0001',
        name: 'Elite Super Shop',
        phone: '+8801711000000',
        points: 1250,
        routes: 'Route A',
        notes: 'Top performing retailer',
        region: { id: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec', name: 'Dhaka' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid "by" parameter supplied',
  })
  getAssignedRetailerDetail(
    @Param('id') salesRepId: string,
    @Param('retailerRef') retailerRef: string,
    @Query('by') by: 'id' | 'uid' = 'id',
  ) {
    const identifier =
      by === 'uid'
        ? { uid: retailerRef }
        : by === 'id'
        ? { id: retailerRef }
        : null;

    if (!identifier) {
      throw new BadRequestException("Query parameter 'by' must be either 'id' or 'uid'");
    }

    return this.salesRepService.getAssignedRetailerDetail(
      salesRepId,
      identifier,
    );
  }

  @Patch(':id/retailers/:retailerRef')
  @ApiOperation({ summary: 'Update points, routes, or notes for an assigned retailer' })
  @ApiParam({
    name: 'id',
    description: 'Sales representative identifier',
    example: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
  })
  @ApiParam({
    name: 'retailerRef',
    description: 'Retailer identifier or UID based on "by" query parameter',
    example: 'RTL-0001',
  })
  @ApiQuery({
    name: 'by',
    description: 'Interpretation of retailerRef',
    required: false,
    enum: ['id', 'uid'],
    example: 'uid',
  })
  @ApiBody({
    type: UpdateRetailerDto,
    examples: {
      default: {
        summary: 'Update retailer points and notes',
        value: {
          points: 1400,
          routes: 'Route B',
          notes: 'Promised higher monthly quota',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid "by" parameter supplied',
  })
  updateAssignedRetailer(
    @Param('id') salesRepId: string,
    @Param('retailerRef') retailerRef: string,
    @Query('by') by: 'id' | 'uid' = 'id',
    @Body() dto: UpdateRetailerDto,
  ) {
    const identifier =
      by === 'uid'
        ? { uid: retailerRef }
        : by === 'id'
        ? { id: retailerRef }
        : null;

    if (!identifier) {
      throw new BadRequestException("Query parameter 'by' must be either 'id' or 'uid'");
    }

    return this.salesRepService.updateRetailer(salesRepId, identifier, dto);
  }

  @Get(':id/retailers/count')
  @ApiOperation({ summary: 'Count retailers assigned to a sales representative' })
  @ApiParam({
    name: 'id',
    description: 'Sales representative identifier',
    example: 'f3dcf094-982f-4c65-8ab8-2a9e8ac75a74',
  })
  assignedRetailerCount(@Param('id') salesRepId: string) {
    return this.salesRepService.assignedRetailerCount(salesRepId);
  }
}
