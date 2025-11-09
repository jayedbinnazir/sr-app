import { Controller } from "@nestjs/common";
import { RegionService } from "../services/region.service";

@Controller({
  path: 'v1/admin/regions',
  version: '1',
})
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

 
}

