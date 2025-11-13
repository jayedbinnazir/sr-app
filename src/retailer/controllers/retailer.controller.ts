import { Controller } from "@nestjs/common";
import { RetailerService } from "../services/retailer.service";



@Controller({
  path: 'v1/retailers',
  version: '1',
})
export class RetailerController {
  constructor(private readonly retailerService: RetailerService) {}

  
}

