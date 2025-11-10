import { BadRequestException, Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { SalesRepService } from '../services/sales_rep.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { UpdateRetailerDto } from 'src/retailer/dto/update-retailer.dto';


@Controller({
  path: 'v1/sales-reps',
  version: '1',
})
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Get(':id/retailers')
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
  assignedRetailerCount(@Param('id') salesRepId: string) {
    return this.salesRepService.assignedRetailerCount(salesRepId);
  }
}
