import { Module } from '@nestjs/common';
import { ImportController } from './controllers/import.controller';
import { ImportService } from './services/import.service';
import { FileSystemModule } from 'src/file-system/file-system.module';
import { AuthModule } from 'src/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  RETAILER_IMPORT_QUEUE,
  RETAILER_IMPORT_QUEUE_NAME,
} from './import.constants';
import { RetailerImportJob } from './types/retailer-import-job.interface';

@Module({
  imports: [ConfigModule, FileSystemModule, AuthModule],
  controllers: [ImportController],
  providers: [
    {
      provide: RETAILER_IMPORT_QUEUE,
      useFactory: (configService: ConfigService) => {
      
        console.log('dbConfig------bla bla bla--->', configService.get<string>('db.redis_host'));
        return new Queue<RetailerImportJob>(RETAILER_IMPORT_QUEUE_NAME, {
          connection: {
            host: configService.get<string>('db.redis_host') ?? 'redis',
            port: Number(configService.get<number>('db.redis_port')) || 6379,
            password: configService.get<string>('db.redis_password') || 'myStrongPassword',
          },
          defaultJobOptions: {
            removeOnComplete: {
              age: 60 * 60, // 1 hour
              count: 1000,
            },
            attempts: 1,
          },
        });
      },
      inject: [ConfigService],
    },
    ImportService,
  ],
  exports: [ImportService, RETAILER_IMPORT_QUEUE],
})
export class ImportModule {}
