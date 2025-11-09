import { Controller } from "@nestjs/common";
import { RetailerService } from "../services/retailer.service";



@Controller({
  path: 'v1/admin/retailers',
  version: '1',
})
export class RetailerAdminController {
  constructor(private readonly retailerService: RetailerService) {}

 
}

