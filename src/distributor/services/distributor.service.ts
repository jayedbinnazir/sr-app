import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateDistributorDto } from '../dto/create-distributor.dto';
import { UpdateDistributorDto } from '../dto/update-distributor.dto';
import { Distributor } from '../entities/distributor.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Area } from 'src/area/entities/area.entity';

type DistributorListResult = {
  data: Distributor[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

type DistributorSearchItem = {
  id: string;
  name: string;
  areaId: string | null;
  areaName: string | null;
  regionId: string | null;
  regionName: string | null;
};

type DistributorSearchResult = {
  data: DistributorSearchItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

@Injectable()
export class DistributorService {
  private readonly cacheKeys = new Set<string>();
  private readonly cacheTtl = 300;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private buildCacheKey(parts: Array<string | number | null | undefined>): string {
    return ['distributor-service', ...parts.map((part) => (part ?? 'null').toString())].join(':');
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    const cached = await this.cacheManager.get<T>(key);
    return cached ?? null;
  }

  private async setCache<T>(key: string, value: T): Promise<void> {
    await this.cacheManager.set(key, value, this.cacheTtl);
    this.cacheKeys.add(key);
  }

  private async invalidateCache(): Promise<void> {
    if (!this.cacheKeys.size) {
      return;
    }
    await Promise.all(
      Array.from(this.cacheKeys).map(async (key) => this.cacheManager.del(key)),
    );
    this.cacheKeys.clear();
  }

  async createDistributor(
    createDistributorDto: CreateDistributorDto,
    manager?: EntityManager,
  ): Promise<Distributor> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const area = await this.ensureAreaExists(
        createDistributorDto.area_id,
        em,
      );

      const existing = await em!.findOne(Distributor, {
        where: { name: createDistributorDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Distributor with name '${createDistributorDto.name}' already exists`,
        );
      }

      const distributor = em!.create(Distributor, {
        name: createDistributorDto.name,
        area_id: createDistributorDto.area_id ?? null,
      });

      const saved = await em!.save(distributor);

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      if (area) {
        saved.area = area;
      }

      await this.invalidateCache();

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

  async listDistributors(
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<DistributorListResult> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });
      const cacheKey = this.buildCacheKey(['distributors', page, limit]);
      const cached = await this.getFromCache<DistributorListResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const qb = em!
        .createQueryBuilder(Distributor, 'distributor')
        .leftJoinAndSelect('distributor.area', 'area')
        .leftJoinAndSelect('area.region', 'region')
        .orderBy('distributor.name', 'ASC')
        .addOrderBy('distributor.id', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();

      const result: DistributorListResult = {
        data,
        meta: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
      };

      await this.setCache(cacheKey, result);

      return result;
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

  async getDistributorDetail(
    id: string,
    manager?: EntityManager,
  ): Promise<Distributor> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      const cacheKey = this.buildCacheKey(['distributor', id]);
      const cached = await this.getFromCache<Distributor>(cacheKey);
      if (cached) {
        return cached;
      }

      const distributor = await em!
        .createQueryBuilder(Distributor, 'distributor')
        .leftJoinAndSelect('distributor.area', 'area')
        .leftJoinAndSelect('area.region', 'region')
        .where('distributor.id = :id', { id })
        .getOne();

      if (!distributor) {
        throw new NotFoundException(`Distributor with ID ${id} not found`);
      }

      await this.setCache(cacheKey, distributor);

      return distributor;
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

  async updateDistributor(
    id: string,
    updateDistributorDto: UpdateDistributorDto,
    manager?: EntityManager,
  ): Promise<Distributor> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const distributor = await em!.findOne(Distributor, { where: { id } });

      if (!distributor) {
        throw new NotFoundException(`Distributor with ID ${id} not found`);
      }

      if (
        updateDistributorDto.name &&
        updateDistributorDto.name !== distributor.name
      ) {
        const existing = await em!.findOne(Distributor, {
          where: { name: updateDistributorDto.name },
        });

        if (existing) {
          throw new ConflictException(
            `Distributor with name '${updateDistributorDto.name}' already exists`,
          );
        }
      }

      if (updateDistributorDto.area_id !== undefined) {
        const area = await this.ensureAreaExists(updateDistributorDto.area_id, em);
        distributor.area_id = updateDistributorDto.area_id ?? null;
        distributor.area = area ?? null;
      }

      if (updateDistributorDto.name) {
        distributor.name = updateDistributorDto.name;
      }

      const updated = await em!.save(distributor);

      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      await this.invalidateCache();

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

  async deleteDistributor(id: string, manager?: EntityManager): Promise<void> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const distributor = await em!.findOne(Distributor, { where: { id } });

      if (!distributor) {
        throw new NotFoundException(`Distributor with ID ${id} not found`);
      }

      await em!.remove(distributor);

      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      await this.invalidateCache();
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

  async distributorCount(manager?: EntityManager): Promise<number> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      const count = await em!.count(Distributor);
      return count;
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

  async searchDistributors(
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<DistributorSearchResult> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });

      const trimmed = (search ?? '').trim();

      if (!trimmed) {
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            hasNext: false,
          },
        };
      }

      const pattern = `%${trimmed.replace(/[%_]/g, '\\$&')}%`;
      const cacheKey = this.buildCacheKey(['distributors-search', trimmed, page, limit]);
      const cached = await this.getFromCache<DistributorSearchResult>(cacheKey);
      if (cached) {
        return cached;
      }

      const qb = em!
        .createQueryBuilder(Distributor, 'distributor')
        .leftJoinAndSelect('distributor.area', 'area')
        .leftJoinAndSelect('area.region', 'region')
        .where('distributor.name ILIKE :pattern', { pattern })
        .orderBy('distributor.name', 'ASC')
        .addOrderBy('distributor.id', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [entities, total] = await qb.getManyAndCount();

      const data = entities.map<DistributorSearchItem>((entity) => ({
        id: entity.id,
        name: entity.name,
        areaId: entity.area_id ?? null,
        areaName: entity.area?.name ?? null,
        regionId: entity.area?.region?.id ?? null,
        regionName: entity.area?.region?.name ?? null,
      }));

      const result: DistributorSearchResult = {
        data,
        meta: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
      };

      await this.setCache(cacheKey, result);

      return result;
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

  private async ensureAreaExists(
    areaId: string | null | undefined,
    manager?: EntityManager,
  ): Promise<Area | null> {
    if (!areaId) {
      return null;
    }

    const area = await manager!.findOne(Area, {
      where: { id: areaId },
      relations: ['region'],
    });

    if (!area) {
      throw new BadRequestException(`Area with ID ${areaId} not found`);
    }

    return area;
  }
}

