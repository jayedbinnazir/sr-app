import { PartialType } from '@nestjs/mapped-types';
import { CreateDistributorDto } from './create-distributor.dto';

export class UpdateDistributorDto extends PartialType(CreateDistributorDto) {}

