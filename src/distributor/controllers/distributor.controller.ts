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
import { DistributorService } from '../services/distributor.service';
import { CreateDistributorDto } from '../dto/create-distributor.dto';
import { UpdateDistributorDto } from '../dto/update-distributor.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';

@ApiTags('Distributors')
@Controller({
  path: 'v1/admin/distributors',
  version: '1',
})
@UseGuards(JwtAuthGuard, AdminGuard)
@Roles(AuthRole.Admin)
export class DistributorController {
  constructor(private readonly distributorService: DistributorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new distributor' })
  @ApiBody({
    type: CreateDistributorDto,
    examples: {
      default: {
        summary: 'Create distributor',
        value: {
          name: 'ABC Distribution',
          area_id: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
        },
      },
    },
  })
  createDistributor(@Body() dto: CreateDistributorDto) {
    return this.distributorService.createDistributor(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List distributors' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({
    description: 'Paginated list of distributors',
    schema: {
      example: {
        data: [
          {
            id: '0f92ff8c-3841-4ab5-9bd7-52f9a0c51999',
            name: 'ABC Distribution',
            area_id: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
            area: {
              id: '7f531df6-7899-4d9b-9a25-44d5aa5c9bda',
              name: 'Gulshan',
              region: { id: 'd2b4b327-56a9-4b34-8b73-8a6232af5dec', name: 'Dhaka' },
            },
          },
        ],
        meta: { total: 1, page: 1, limit: 20, hasNext: false },
      },
    },
  })
  listDistributors(@Query() options: PaginationDto) {
    return this.distributorService.listDistributors(options);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search distributors by name' })
  @ApiQuery({
    name: 'search',
    description: 'Case-insensitive search term',
    example: 'ABC',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  searchDistributors(
    @Query('search') search: string,
    @Query() options: PaginationDto,
  ) {
    return this.distributorService.searchDistributors(search ?? '', options);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get total distributor count' })
  distributorCount() {
    return this.distributorService.distributorCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get distributor details' })
  @ApiParam({
    name: 'id',
    description: 'Distributor identifier',
    example: '0f92ff8c-3841-4ab5-9bd7-52f9a0c51999',
  })
  getDistributorDetail(@Param('id') id: string) {
    return this.distributorService.getDistributorDetail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update distributor details' })
  @ApiParam({
    name: 'id',
    description: 'Distributor identifier',
    example: '0f92ff8c-3841-4ab5-9bd7-52f9a0c51999',
  })
  @ApiBody({
    type: UpdateDistributorDto,
    examples: {
      default: {
        summary: 'Update distributor',
        value: {
          name: 'ABC Distribution Ltd',
          area_id: '3c8e5b2d-98ab-4a6f-9bfa-9ae4f9d8c1c4',
        },
      },
    },
  })
  updateDistributor(
    @Param('id') id: string,
    @Body() dto: UpdateDistributorDto,
  ) {
    return this.distributorService.updateDistributor(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete distributor' })
  @ApiParam({
    name: 'id',
    description: 'Distributor identifier',
    example: '0f92ff8c-3841-4ab5-9bd7-52f9a0c51999',
  })
  deleteDistributor(@Param('id') id: string) {
    return this.distributorService.deleteDistributor(id);
  }
}
