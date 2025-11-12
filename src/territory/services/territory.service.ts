import { Cache, CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { CreateTerritoryDto } from "../dto/create-territory.dto";
import { Territory } from "../entities/territory.entity";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateTerritoryDto } from "../dto/update-territory.dto";


type PaginatedTerritories = {
  data: Territory[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

type TerritorySearchFilters = {
  distributorId?: string;
};

@Injectable()
export class TerritoryService {
  private readonly cacheKeys = new Set<string>();
  private readonly cacheTtl = 300;

  constructor(
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) { }

  private buildCacheKey(parts: Array<string | number | null | undefined>): string {
    return ['territory-service', ...parts.map((part) => (part ?? 'null').toString())].join(':');
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

  async createTerritory(createTerritoryDto: CreateTerritoryDto, manager?: EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const existing = await em!.findOne(Territory, { where: { name: createTerritoryDto.name, area_id: createTerritoryDto.area_id } });
      if (existing) {
        throw new ConflictException(`Territory with name '${createTerritoryDto.name}' already exists`);
      }
      const territory = em!.create(Territory, { ...createTerritoryDto });
      const saved = await em!.save(territory);
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


  async getTerritories(
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedTerritories> {
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
      const cacheKey = this.buildCacheKey(['territories', page, limit]);
      const cached = await this.getFromCache<PaginatedTerritories>(cacheKey);
      if (cached) {
        return cached;
      }
      const qb = em!
        .createQueryBuilder(Territory, "territory")
        .orderBy("territory.name", "ASC")
        .addOrderBy("territory.id", "ASC")
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
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

  async searchFilteredTerritories(
    search: string,
    options?: PaginationDto,
    filters?: TerritorySearchFilters,
    manager?: EntityManager,
  ): Promise<PaginatedTerritories> {
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
      const cacheKey = this.buildCacheKey([
        'territories-search',
        trimmed,
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
        .where("territory.name ILIKE :pattern", { pattern });

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


  async updateTerritory(id:string, updateTerritoryDto:UpdateTerritoryDto, manager?:EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const existing = await em!.findOne(Territory, { where: { id } });
      if (!existing) {
        throw new NotFoundException(`Territory with ID ${id} not found`);
      }
      Object.assign(existing, updateTerritoryDto);
      const updated = await em!.save(existing);
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      await this.invalidateCache();
      return updated;
    }catch(error){
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

  async deleteTerritory(id:string, manager?:EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const existing = await em!.findOne(Territory, { where: { id } });
      if (!existing) {
        throw new NotFoundException(`Territory with ID ${id} not found`);
      }
      await em!.remove(existing);
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      await this.invalidateCache();
      return { message: `Territory with ID ${id} deleted successfully` };
    }
    catch(error){
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
  async totalTerritoryCount(manager?:EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const territoryCount = await em!.count(Territory);
      if (territoryCount === 0) {
        throw new NotFoundException(`No territories found`);
      }
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return territoryCount;
    }
    catch(error){
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