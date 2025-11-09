import {
  Controller,
  // Get,
  Post,
  Body,
  // Patch,
  // Param,
  // Delete,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AwsS3Service } from '../services/aws-s3.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('aws-s3')
export class AwsS3Controller {
  constructor(private readonly awsS3Service: AwsS3Service) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async create(@UploadedFile() file: Express.Multer.File) {
    console.log('---------------------------------------->', file);
    return await this.awsS3Service.uploadBucketFile(file, '2');
  }
  // @Get()
  // findAll() {
  //   return this.awsS3Service.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.awsS3Service.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateAwsS3Dto: UpdateAwsS3Dto) {
  //   return this.awsS3Service.update(+id, updateAwsS3Dto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.awsS3Service.remove(+id);
  // }
}
