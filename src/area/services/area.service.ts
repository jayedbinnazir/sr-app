import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Like } from "typeorm";
import { CreateAreaDto } from "../dto/create-area.dto";
import { Area } from "../entities/area.entity";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateAreaDto } from "../dto/update-area.dto";
import { Territory } from "src/territory/entities/territory.entity";
import { Region } from "src/region/entities/region.entity";


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


  async getAreas(options?: PaginationDto, manager?: EntityManager) {
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
      const areas = await em!.find(Area, {
        skip: (page - 1) * limit,
        take: limit,
      });
      return areas;
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


  async searchAreas(search: string, manager?: EntityManager): Promise<string[]> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const areas = await em!.find(Area, { where: { name: Like(`%${search}%`) } });
      return areas.map(area => area.name);
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


  async getTerritoriesByAreaId(areaId: string, options?: PaginationDto, manager?: EntityManager) {
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
      const territories = await em!.find(Territory, { where: { area_id: areaId }, skip: (page - 1) * limit, take: limit });
      return territories;
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







