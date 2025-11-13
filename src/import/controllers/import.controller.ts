import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { ImportService } from '../services/import.service';

import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AuthRole } from 'src/auth/types/auth-role.enum';

@ApiTags('Import')
@Controller({
  path: 'v1/admin/import',
  version: '1',
})
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  @Post('csv/retailers')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Roles(AuthRole.Admin)
  @ApiOperation({
    summary: 'Import retailers from a CSV file',
    description:
      'Upload a CSV generated from the project dataset. The pipeline is tuned for large imports and comfortably handles the 1 million-row file bundled at ./csv_zip/retailers_1million.rar (extract before uploading).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'CSV file containing retailer data',
        },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  importRetailersFromCsv(@UploadedFile() file: Express.Multer.File) {
    return this.importService.importRetailersFromCsv(file);
  }
}
