import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, In } from "typeorm";
import { CreateAreaDto } from "../dto/create-area.dto";
import { Area } from "../entities/area.entity";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateAreaDto } from "../dto/update-area.dto";
import { Territory } from "src/territory/entities/territory.entity";
import { Region } from "src/region/entities/region.entity";


type PaginatedAreas = {
  data: Area[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

type PaginatedTerritories = {
  data: Territory[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

type TerritoryAssignmentSummary = {
  areaId: string;
  requested: number;
  assigned: number;
  alreadyAssigned: string[];
  conflicting: string[];
  missing: string[];
};

type TerritoryUnassignmentSummary = {
  areaId: string;
  requested: number;
  unassigned: number;
  skipped: string[];
  missing: string[];
};

type TerritoryFilters = {
  distributorId?: string;
};

@Injectable()
export class AreaService {
  private readonly cacheKeys = new Set<string>();
  private readonly cacheTtl = 300;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private buildCacheKey(parts: Array<string | number | null | undefined>): string {
    return ['area-service', ...parts.map((part) => (part ?? 'null').toString())].join(':');
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


  async createArea(createAreaDto: CreateAreaDto, manager?: EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const region = await em!.findOne(Region, { where: { id: createAreaDto.region_id } });
      if (!region) {
        throw new NotFoundException(`Region with ID '${createAreaDto.region_id}' not found`);
      }
      const existing = await em!.findOne(Area, { where: { name: createAreaDto.name, region_id: createAreaDto.region_id } })
      if (existing) {
        throw new ConflictException(`Area with name '${createAreaDto.name}' already exists`);
      }
      const area = em!.create(Area, { ...createAreaDto });
      const saved = await em!.save(area);
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


  async getAreas(
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedAreas> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
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
      const cacheKey = this.buildCacheKey(['areas', page, limit]);
      const cached = await this.getFromCache<PaginatedAreas>(cacheKey);
      if (cached) {
        return cached;
      }
      const qb = em!
        .createQueryBuilder(Area, "area")
        .leftJoinAndSelect("area.region", "region")
        .orderBy("area.name", "ASC")
        .addOrderBy("area.id", "ASC")
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      const result: PaginatedAreas = {
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


  async searchAreas(
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedAreas> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
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
      const trimmed = (search ?? "").trim();
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
      const pattern = `%${trimmed.replace(/[%_]/g, "\\$&")}%`;
      const qb = em!
        .createQueryBuilder(Area, "area")
        .where("area.name ILIKE :pattern", { pattern })
        .orderBy("area.name", "ASC")
        .addOrderBy("area.id", "ASC")
        .skip((page - 1) * limit)
        .take(limit);

      const cacheKey = this.buildCacheKey(['areas-search', trimmed, page, limit]);
      const cached = await this.getFromCache<PaginatedAreas>(cacheKey);
      if (cached) {
        return cached;
      }

      const [data, total] = await qb.getManyAndCount();
      const result: PaginatedAreas = {
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


  async updateArea(id: string, updateAreaDto: UpdateAreaDto, manager?: EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const existing = await em!.findOne(Area, { where: { id } });
      if (!existing) {
        throw new NotFoundException(`Area with ID ${id} not found`);
      }
      if (updateAreaDto.region_id) {
        const region = await em!.findOne(Region, { where: { id: updateAreaDto.region_id } });
        if (!region) {
          throw new NotFoundException(`Region with ID '${updateAreaDto.region_id}' not found`);
        }
      }
      Object.assign(existing, updateAreaDto);
      const updated = await em!.save(existing);
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


  async deleteArea(id: string, manager?: EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const existing = await em!.findOne(Area, { where: { id } });
      if (!existing) {
        throw new NotFoundException(`Area with ID ${id} not found`);
      }
      await em!.remove(existing);
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      await this.invalidateCache();
      return { message: `Area with ID ${id} deleted successfully` };
    }
    catch (error) {
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

  async totalAreaCount(manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const areaCount = await em!.count(Area);
      if (areaCount === 0) {
        throw new NotFoundException(`No areas found`);
      }
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return areaCount;
    }
    catch (error) {
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


  async getFilteredTerritoriesByAreaId(
    areaId: string,
    options?: PaginationDto,
    filters?: TerritoryFilters,
    manager?: EntityManager,
  ): Promise<PaginatedTerritories> {
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
      const cacheKey = this.buildCacheKey([
        'area-territories',
        areaId,
        page,
        limit,
        filters?.distributorId ?? null,
      ]);
      const cached = await this.getFromCache<PaginatedTerritories>(cacheKey);
      if (cached) {
        return cached;
      }

      const qb = em!
        .createQueryBuilder(Territory, "territory")
        .leftJoinAndSelect("territory.area", "area")
        .where("territory.area_id = :areaId", { areaId });

      if (filters?.distributorId) {
        qb.andWhere("territory.distributor_id = :distributorId", {
          distributorId: filters.distributorId,
        });
      }

      const [data, total] = await qb
        .orderBy("territory.name", "ASC")
        .addOrderBy("territory.id", "ASC")
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();
      if (total === 0) {
        throw new NotFoundException(`No territories found for area ID ${areaId}`);
      }
      const result: PaginatedTerritories = {
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

  async getTerritoriesCountByAreaId(areaId: string, manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const territoryCount = await em!.count(Territory, { where: { area_id: areaId } });
      if (territoryCount === 0) {
        throw new NotFoundException(`No territories found for area ID ${areaId}`);
      }
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return territoryCount;
    }
    catch (error) {
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

  async assignTerritoriesToArea(
    areaId: string,
    territoryIds: string[],
    manager?: EntityManager,
  ): Promise<TerritoryAssignmentSummary> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const area = await em!.findOne(Area, { where: { id: areaId } });
      if (!area) {
        throw new NotFoundException(`Area with ID ${areaId} not found`);
      }

      const uniqueTerritoryIds = Array.from(
        new Set(
          territoryIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      );

      if (!uniqueTerritoryIds.length) {
        if (!manager) {
          await queryRunner?.commitTransaction();
        }
        return {
          areaId,
          requested: 0,
          assigned: 0,
          alreadyAssigned: [],
          conflicting: [],
          missing: [],
        };
      }

      const territories = await em!.find(Territory, {
        where: { id: In(uniqueTerritoryIds) },
        select: ['id', 'area_id'],
      });

      const foundIds = new Set(territories.map((territory) => territory.id));
      const missing = uniqueTerritoryIds.filter((id) => !foundIds.has(id));

      const toAssign: string[] = [];
      const alreadyAssigned: string[] = [];
      const conflicting: string[] = [];

      for (const territory of territories) {
        if (!territory.area_id) {
          toAssign.push(territory.id);
        } else if (territory.area_id === areaId) {
          alreadyAssigned.push(territory.id);
        } else {
          conflicting.push(territory.id);
        }
      }

      if (toAssign.length) {
        await em!
          .createQueryBuilder()
          .update(Territory)
          .set({ area_id: areaId })
          .whereInIds(toAssign)
          .execute();
      }

      const summary: TerritoryAssignmentSummary = {
        areaId,
        requested: uniqueTerritoryIds.length,
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

  async unassignTerritoriesFromArea(
    areaId: string,
    territoryIds: string[],
    manager?: EntityManager,
  ): Promise<TerritoryUnassignmentSummary> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const area = await em!.findOne(Area, { where: { id: areaId } });
      if (!area) {
        throw new NotFoundException(`Area with ID ${areaId} not found`);
      }

      const uniqueTerritoryIds = Array.from(
        new Set(
          territoryIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      );

      if (!uniqueTerritoryIds.length) {
        if (!manager) {
          await queryRunner?.commitTransaction();
        }
        return {
          areaId,
          requested: 0,
          unassigned: 0,
          skipped: [],
          missing: [],
        };
      }

      const territories = await em!.find(Territory, {
        where: { id: In(uniqueTerritoryIds) },
        select: ['id', 'area_id'],
      });

      const foundIds = new Set(territories.map((territory) => territory.id));
      const missing = uniqueTerritoryIds.filter((id) => !foundIds.has(id));

      const toUnassign: string[] = [];
      const skipped: string[] = [];

      for (const territory of territories) {
        if (territory.area_id === areaId) {
          toUnassign.push(territory.id);
        } else {
          skipped.push(territory.id);
        }
      }

      if (toUnassign.length) {
        await em!
          .createQueryBuilder()
          .update(Territory)
          .set({ area_id: null })
          .whereInIds(toUnassign)
          .execute();
      }

      const summary: TerritoryUnassignmentSummary = {
        areaId,
        requested: uniqueTerritoryIds.length,
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







