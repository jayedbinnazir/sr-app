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
import { DistributorService } from '../services/distributor.service';
import { CreateDistributorDto } from '../dto/create-distributor.dto';
import { UpdateDistributorDto } from '../dto/update-distributor.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';

@Controller({
  path: 'v1/admin/distributors',
  version: '1',
})
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(AuthRole.Admin)
export class DistributorController {
  constructor(private readonly distributorService: DistributorService) {}

  @Post()
  createDistributor(@Body() dto: CreateDistributorDto) {
    return this.distributorService.createDistributor(dto);
  }

  @Get()
  listDistributors(@Query() options: PaginationDto) {
    return this.distributorService.listDistributors(options);
  }

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

  @Get(':id')
  getDistributorDetail(@Param('id') id: string) {
    return this.distributorService.getDistributorDetail(id);
  }

  @Patch(':id')
  updateDistributor(
    @Param('id') id: string,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.distributorService.updateDistributor(id, dto);
  }

  @Delete(':id')
  deleteDistributor(@Param('id') id: string) {
    return this.distributorService.deleteDistributor(id);
  }
}
