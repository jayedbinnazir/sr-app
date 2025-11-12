import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class RetailerPaginationQueryDto extends PaginationDto {}

export class RetailerSearchQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Search keyword for retailer name, phone, or UID',
    example: 'abir',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

export class RetailerFilterQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description:
      'JSON string containing filter criteria. Example: {"regionId":"7d1d0c03-4c7f-4a3f-a4c1-4c6e4d15ef99"}',
    example: '{"regionId":"7d1d0c03-4c7f-4a3f-a4c1-4c6e4d15ef99"}',
  })
  @IsOptional()
  @IsString()
  filter?: string;
}


