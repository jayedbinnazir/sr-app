import { Injectable } from '@nestjs/common';
import { CreateSalesRepDto } from '../dto/create-sales_rep.dto';
import { UpdateSalesRepDto } from '../dto/update-sales_rep.dto';


@Injectable()
export class SalesRepService {
  create(createSalesRepDto: CreateSalesRepDto) {
    return 'This action adds a new salesRep';
  }

  findAll() {
    return `This action returns all salesRep`;
  }

  findOne(id: number) {
    return `This action returns a #${id} salesRep`;
  }

  update(id: number, updateSalesRepDto: UpdateSalesRepDto) {
    return `This action updates a #${id} salesRep`;
  }

  remove(id: number) {
    return `This action removes a #${id} salesRep`;
  }
}
