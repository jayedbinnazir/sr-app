import { PartialType } from '@nestjs/mapped-types';
import { CreateAppUserDto } from './create-app_user.dto';

export class UpdateAppUserDto extends PartialType(CreateAppUserDto) {}
