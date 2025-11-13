import { Module } from '@nestjs/common';
import { ImportWorkerService } from './services/import-worker.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [ImportWorkerService],
})
export class ImportWorkerModule {}
