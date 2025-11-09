import {
  Controller,
  // Get,
  Post,
  Body,
  // Patch,
  // Param,
  // Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileSystemService } from '../services/file-system.service';
// import { UpdateFileSystemDto } from '../dto/update-file-system.dto';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('file-system')
export class FileSystemController {
  constructor(private readonly fileSystemService: FileSystemService) {}

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 3))
  async upload(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.fileSystemService.createFilesFromMulter(files, '100');
  }

  // @Get()
  // findAll() {
  //   return this.fileSystemService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.fileSystemService.findOne(+id);
  // }

  // @Patch(':id')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateFileSystemDto: UpdateFileSystemDto,
  // ) {
  //   return this.fileSystemService.update(+id, updateFileSystemDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.fileSystemService.remove(+id);
  // }
}
