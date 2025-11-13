import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  static readonly DEFAULT_LIMIT = 20;
  static readonly MAX_LIMIT = 100;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number.parseInt(value, 10))
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => Number.parseInt(value, 10))
  limit?: number;

  static resolve(
    options?: PaginationDto,
    fallback?: { defaultLimit?: number; maxLimit?: number },
  ): { page: number; limit: number } {
    const defaultLimit = fallback?.defaultLimit ?? PaginationDto.DEFAULT_LIMIT;
    const maxLimit = fallback?.maxLimit ?? PaginationDto.MAX_LIMIT;

    const rawPage = Math.floor(options?.page ?? 1);
    const rawLimit = Math.floor(options?.limit ?? defaultLimit);

    const page = rawPage > 0 ? rawPage : 1;
    const limit =
      rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;

    return { page, limit };
  }
}


