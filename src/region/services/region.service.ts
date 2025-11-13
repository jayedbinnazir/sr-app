import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { CreateRegionDto } from '../dto/create-region.dto';
import { Region } from '../entities/region.entity';
import { UpdateRegionDto } from '../dto/update-region.dto';
import { Area } from 'src/area/entities/area.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';

type PaginatedAreas = {
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
  data: Area[];
};

type AreaFilters = {
  distributorId?: string;
  territoryId?: string;
};

type PaginatedRegions = {
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
  data: Region[];
};

type AreaAssignmentSummary = {
  regionId: string;
  requested: number;
  assigned: number;
  alreadyAssigned: string[];
  conflicting: string[];
  missing: string[];
};

type AreaUnassignmentSummary = {
  regionId: string;
  requested: number;
  unassigned: number;
  skipped: string[];
  missing: string[];
};

@Injectable()
export class RegionService {
  private readonly cacheKeys = new Set<string>();
  private readonly cacheTtl = 300; // seconds

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private buildCacheKey(parts: Array<string | number | null | undefined>): string {
    return ['region-service', ...parts.map((part) => (part ?? 'null').toString())].join(':');
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
      Array.from(this.cacheKeys).map(async (key) => {
        await this.cacheManager.del(key);
      }),
    );
    this.cacheKeys.clear();
  }


  //Create Region
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


  //Get Paginated Regions
  async getRegions(
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedRegions> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });

      const cacheKey = this.buildCacheKey(['regions', page, limit]);
      const cached = await this.getFromCache<PaginatedRegions>(cacheKey);
      if (cached) {
        return cached;
      }

      const qb = em!
        .createQueryBuilder(Region, 'region')
        .orderBy('region.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      const result: PaginatedRegions = {
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

  //Search Regions Paginated
  async searchRegions(
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedRegions> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
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

      const cacheKey = this.buildCacheKey(['regions-search', trimmed, page, limit]);
      const cached = await this.getFromCache<PaginatedRegions>(cacheKey);
      if (cached) {
        return cached;
      }

      const qb = em!
        .createQueryBuilder(Region, 'region')
        .where('region.name ILIKE :pattern', { pattern })
        .orderBy('region.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      const result: PaginatedRegions = {
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


  //Update Region 
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


  //Delete Region
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


  //Get Region Count
  async regionCount(manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const regionCount = await em!.count(Region);
      if (regionCount === 0) {
        throw new NotFoundException(`No regions found`);
      }
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return regionCount;

    } catch(error){
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



  //Get Areas Filtered by Region ID
  async getFilteredAreasByRegionId(
    regionId: string,
    options?: PaginationDto,
    filters?: AreaFilters,
    manager?: EntityManager,
  ): Promise<PaginatedAreas> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });

      const qb = em!
        .createQueryBuilder(Area, 'area')
        .leftJoin(Region, 'region', 'region.id = area.region_id')
        .select([
          'area.id',
          'area.name',
          'area.region_id',
          'region.id',
          'region.name',
        ])
        .distinct(true)
        .where('area.region_id = :regionId', { regionId })
        .orderBy('area.name', 'ASC')
        .addOrderBy('area.id', 'ASC');

      if (filters?.distributorId) {
        qb.andWhere('distributors.id = :distributorId', {
          distributorId: filters.distributorId,
        });
      }
      if (filters?.territoryId) {
        qb.andWhere('territories.id = :territoryId', {
          territoryId: filters.territoryId,
        });
      }

      const [data, total] = await qb
        .skip((page - 1) * limit)
        .take(limit)
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


  //Get Areas Count by Region ID
  async getAreasCountByRegionId(regionId: string, manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const areaCount = await em!.count(Area, { where: { region_id: regionId } });
      if (areaCount === 0) {
        throw new NotFoundException(`No areas found for region ID ${regionId}`);
      }
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return areaCount;
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


  async assignAreasToRegion(
    regionId: string,
    areaIds: string[],
    manager?: EntityManager,
  ): Promise<AreaAssignmentSummary> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const region = await em!.findOne(Region, { where: { id: regionId } });
      if (!region) {
        throw new NotFoundException(`Region with ID ${regionId} not found`);
      }

      const uniqueAreaIds = Array.from(
        new Set(
          areaIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      );

      if (!uniqueAreaIds.length) {
        if (!manager) {
          await queryRunner?.commitTransaction();
        }
        return {
          regionId,
          requested: 0,
          assigned: 0,
          alreadyAssigned: [],
          conflicting: [],
          missing: [],
        };
      }

      const areas = await em!.find(Area, {
        where: { id: In(uniqueAreaIds) },
        select: ['id', 'region_id'],
      });

      const foundIds = new Set(areas.map((area) => area.id));
      const missing = uniqueAreaIds.filter((id) => !foundIds.has(id));

      const toAssign: string[] = [];
      const alreadyAssigned: string[] = [];
      const conflicting: string[] = [];

      for (const area of areas) {
        if (!area.region_id) {
          toAssign.push(area.id);
        } else if (area.region_id === regionId) {
          alreadyAssigned.push(area.id);
        } else {
          conflicting.push(area.id);
        }
      }

      if (toAssign.length) {
        await em!
          .createQueryBuilder()
          .update(Area)
          .set({ region_id: regionId })
          .whereInIds(toAssign)
          .execute();
      }

      const summary: AreaAssignmentSummary = {
        regionId,
        requested: uniqueAreaIds.length,
        assigned: toAssign.length,
        alreadyAssigned,
        conflicting,
        missing,
      };

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      await this.invalidateCache();

      return summary;
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

  async unassignAreasFromRegion(
    regionId: string,
    areaIds: string[],
    manager?: EntityManager,
  ): Promise<AreaUnassignmentSummary> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const region = await em!.findOne(Region, { where: { id: regionId } });
      if (!region) {
        throw new NotFoundException(`Region with ID ${regionId} not found`);
      }

      const uniqueAreaIds = Array.from(
        new Set(
          areaIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      );

      if (!uniqueAreaIds.length) {
        if (!manager) {
          await queryRunner?.commitTransaction();
        }
        return {
          regionId,
          requested: 0,
          unassigned: 0,
          skipped: [],
          missing: [],
        };
      }

      const areas = await em!.find(Area, {
        where: { id: In(uniqueAreaIds) },
        select: ['id', 'region_id'],
      });

      const foundIds = new Set(areas.map((area) => area.id));
      const missing = uniqueAreaIds.filter((id) => !foundIds.has(id));

      const toUnassign: string[] = [];
      const skipped: string[] = [];

      for (const area of areas) {
        if (area.region_id === regionId) {
          toUnassign.push(area.id);
        } else {
          skipped.push(area.id);
        }
      }

      if (toUnassign.length) {
        await em!
          .createQueryBuilder()
          .update(Area)
          .set({ region_id: null })
          .whereInIds(toUnassign)
          .execute();
      }

      const summary: AreaUnassignmentSummary = {
        regionId,
        requested: uniqueAreaIds.length,
        unassigned: toUnassign.length,
        skipped,
        missing,
      };

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      await this.invalidateCache();

      return summary;
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


}