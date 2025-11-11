import {
  BadRequestException,
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { FileSystemService } from 'src/file-system/services/file-system.service';
import { FileSystem } from 'src/file-system/entities/file-system.entity';
import {
  RETAILER_IMPORT_JOB_NAME,
  RETAILER_IMPORT_QUEUE,
} from '../import.constants';
import { RetailerImportJob } from '../types/retailer-import-job.interface';

@Injectable()
export class ImportService implements OnModuleDestroy {
  constructor(
    private readonly fileSystemService: FileSystemService,
    @Inject(RETAILER_IMPORT_QUEUE)
    private readonly retailerImportQueue: Queue<RetailerImportJob>,
  ) {}

  async importRetailersFromCsv(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }
    if (!file.mimetype.toLowerCase().includes('csv')) {
      throw new BadRequestException('Only CSV files are supported');
    }

    const savedFile: FileSystem =
      await this.fileSystemService.createFileFromMulter(file);

    const job = await this.retailerImportQueue.add(
      RETAILER_IMPORT_JOB_NAME,
      {
        fileId: savedFile.id,
        filePath: savedFile.path,
        originalName: savedFile.originalName,
        mimeType: savedFile.mimetype,
        size: savedFile.size,
      },
      {
        removeOnComplete: {
          age: 60 * 60,
          count: 500,
        },
        removeOnFail: false,
      },
    );

    return {
      jobId: job.id,
      fileId: savedFile.id,
      message:
        'Retailer CSV queued for import. The background worker will process it shortly.',
    };
  }

  async onModuleDestroy() {
    await this.retailerImportQueue.close();
  }
}
