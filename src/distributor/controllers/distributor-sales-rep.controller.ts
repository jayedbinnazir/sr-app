import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DistributorService } from '../services/distributor.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { SalesRepGuard } from 'src/auth/guards/sales-rep.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';

@Controller({
  path: 'v1/sales-reps/distributors',
  version: '1',
})
@UseGuards(JwtAuthGuard, SalesRepGuard)
@Roles(AuthRole.SalesRep)
export class DistributorSalesRepController {
  constructor(private readonly distributorService: DistributorService) {}

  @Get('search')
  searchDistributors(
    @Query('search') search: string,
    @Query() options: PaginationDto,
  ) {
    return this.distributorService.searchDistributors(search ?? '', options);
  }

  @Get('count')
  distributorCount() {
    return this.distributorService.distributorCount();
  }
}

