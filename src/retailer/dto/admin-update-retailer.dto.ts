import { PartialType } from '@nestjs/mapped-types';
import { CreateRetailerAdminDto } from './create-retailer-admin.dto';

export class AdminUpdateRetailerDto extends PartialType(
  CreateRetailerAdminDto,
) {}

