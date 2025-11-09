import { Controller } from "@nestjs/common";
import { AreaService } from "../services/area.service";

@Controller({
  path: 'v1/admin/areas',
  version: '1',
})
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  
}

