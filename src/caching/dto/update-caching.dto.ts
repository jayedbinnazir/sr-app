import { PartialType } from '@nestjs/mapped-types';
import { CreateCachingDto } from './create-caching.dto';

export class UpdateCachingDto extends PartialType(CreateCachingDto) {}
