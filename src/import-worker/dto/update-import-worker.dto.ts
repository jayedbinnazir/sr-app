import { PartialType } from '@nestjs/swagger';
import { CreateImportWorkerDto } from './create-import-worker.dto';

export class UpdateImportWorkerDto extends PartialType(CreateImportWorkerDto) {}
