import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
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

@Injectable()
export class AreaService {
  constructor(
    private readonly dataSource: DataSource,
  ) { }


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
    }
    try {
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });
      const qb = em!
        .createQueryBuilder(Area, "area")
        .leftJoinAndSelect("area.region", "region")
        .orderBy("area.name", "ASC")
        .addOrderBy("area.id", "ASC")
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      return {
        data,
        meta: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
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


  async searchAreas(
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedAreas> {
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
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      return {
        data,
        meta: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
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


  async getTerritoriesByAreaId(
    areaId: string,
    options?: PaginationDto,
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
      const qb = em!
        .createQueryBuilder(Territory, "territory")
        .leftJoinAndSelect("territory.area", "area")
        .where("territory.area_id = :areaId", { areaId })
        .orderBy("territory.name", "ASC")
        .addOrderBy("territory.id", "ASC")
        .skip((page - 1) * limit)
        .take(limit);
      const [data, total] = await qb.getManyAndCount();
      if (total === 0) {
        throw new NotFoundException(`No territories found for area ID ${areaId}`);
      }
      return {
        data,
        meta: {
          total,
          page,
          limit,
          hasNext: page * limit < total,
        },
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
}







