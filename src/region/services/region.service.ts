import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateRegionDto } from '../dto/create-region.dto';
import { Region } from '../entities/region.entity';
import { UpdateRegionDto } from '../dto/update-region.dto';
import { Area } from 'src/area/entities/area.entity';

type PaginationOptions = {
  page?: number;
  limit?: number;
};

type PaginatedAreas = {
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
  data: Area[];
};

@Injectable()
export class RegionService {
  private static readonly DEFAULT_LIMIT = 20;
  private static readonly MAX_LIMIT = 100;

  constructor(private readonly dataSource: DataSource) {}

  async createRegion(
    createRegionDto: CreateRegionDto,
    manager?: EntityManager,
  ): Promise<Region> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const existing = await em!.findOne(Region, {
        where: { name: createRegionDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Region with name '${createRegionDto.name}' already exists`,
        );
      }
      const region = em!.create(Region, { ...createRegionDto });
      const saved = await em!.save(region);
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return saved;
    } catch (error) {
      if (!manager) {
        await queryRunner?.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async updateRegion(
    id: string,
    updateRegionDto: UpdateRegionDto,
    manager?: EntityManager,
  ): Promise<Region> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const region = await em!.findOne(Region, { where: { id } });
      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found`);
      }
      Object.assign(region, updateRegionDto);
      const updated = await em!.save(region);
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return updated;
    } catch (error) {
      if (!manager) {
        await queryRunner?.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async deleteRegion(id: string, manager?: EntityManager): Promise<void> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const region = await em!.findOne(Region, { where: { id } });
      if (!region) {
        throw new NotFoundException(`Region with ID ${id} not found`);
      }
      await em!.remove(region);
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
    } catch (error) {
      if (!manager) {
        await queryRunner?.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async getAreasByRegionId(
    regionId: string,
    optionsOrManager?: PaginationOptions | EntityManager,
    managerMaybe?: EntityManager,
  ): Promise<PaginatedAreas> {
    let options: PaginationOptions | undefined;
    let manager: EntityManager | undefined;

    if (optionsOrManager instanceof EntityManager) {
      manager = optionsOrManager;
    } else {
      options = optionsOrManager;
      manager = managerMaybe;
    }

    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      const { page, limit } = this.resolvePagination(options);

      const qb = em!
        .createQueryBuilder(Area, 'area')
        .leftJoinAndSelect('area.region', 'region')
        .where('area.region_id = :regionId', { regionId })
        .orderBy('area.name', 'ASC')
        .addOrderBy('area.id', 'ASC');

      const [data, total] = await qb
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount();

      if (total === 0) {
        throw new NotFoundException(`No areas found for region ID ${regionId}`);
      }

      return {
        meta: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
        data,
      };
    } catch (error) {
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  private resolvePagination(options?: PaginationOptions): {
    page: number;
    limit: number;
  } {
    const rawPage = Math.floor(options?.page ?? 1);
    const rawLimit = Math.floor(
      options?.limit ?? RegionService.DEFAULT_LIMIT,
    );

    const page = rawPage > 0 ? rawPage : 1;
    const limit =
      rawLimit > 0
        ? Math.min(rawLimit, RegionService.MAX_LIMIT)
        : RegionService.DEFAULT_LIMIT;

    return { page, limit };
  }
}