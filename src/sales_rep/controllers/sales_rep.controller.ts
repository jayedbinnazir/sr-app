import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SalesRepService } from '../services/sales_rep.service';
import { CreateSalesRepDto } from '../dto/create-sales_rep.dto';
import { UpdateSalesRepDto } from '../dto/update-sales_rep.dto';


@Controller('sales-rep')
export class SalesRepController {
  constructor(private readonly salesRepService: SalesRepService) {}

  @Post()
  create(@Body() createSalesRepDto: CreateSalesRepDto) {
    return this.salesRepService.create(createSalesRepDto);
  }

  @Get()
  findAll() {
    return this.salesRepService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.salesRepService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSalesRepDto: UpdateSalesRepDto) {
    return this.salesRepService.update(+id, updateSalesRepDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.salesRepService.remove(+id);
  }
}
