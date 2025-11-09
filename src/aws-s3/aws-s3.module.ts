import { Module } from '@nestjs/common';
import { AwsS3Service } from './services/aws-s3.service';
import { ConfigModule } from '@nestjs/config';
import { AwsS3Controller } from './controllers/aws-s3.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BucketFiles } from './entities/aws-s3.entity';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from 'src/file-system/services/multer.config.service';

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useClass: MulterConfigService,
    }),
    TypeOrmModule.forFeature([BucketFiles]),
  ],
  controllers: [AwsS3Controller],
  providers: [AwsS3Service],
})
export class AwsS3Module {}
