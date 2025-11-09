import { Controller } from "@nestjs/common";
import { TerritoryService } from "../services/territory.service";

@Controller({
  path: 'v1/admin/territories',
  version: '1',
})
export class TerritoryController {
  constructor(private readonly territoryService: TerritoryService) {}

 
}

