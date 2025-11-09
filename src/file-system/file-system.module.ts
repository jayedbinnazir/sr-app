import { Module } from '@nestjs/common';
import { FileSystemController } from './controllers/file-system.controller';
import { FileSystemService } from './services/file-system.service';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './services/multer.config.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileSystem } from './entities/file-system.entity';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useClass: MulterConfigService,
    }),
    TypeOrmModule.forFeature([FileSystem]),
  ],
  controllers: [FileSystemController],
  providers: [FileSystemService, MulterConfigService],
  exports: [
    MulterConfigService,
    FileSystemService,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useClass: MulterConfigService,
    }),
  ],
})
export class FileSystemModule {}
