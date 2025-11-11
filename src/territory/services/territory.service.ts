import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
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

@Injectable()
export class TerritoryService {
  constructor(
    private readonly dataSource: DataSource,
  ) { }

  async createTerritory(createTerritoryDto: CreateTerritoryDto, manager?: EntityManager) {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
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
    }
    try {
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });
      const qb = em!
        .createQueryBuilder(Territory, "territory")
        .orderBy("territory.name", "ASC")
        .addOrderBy("territory.id", "ASC")
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

  async searchTerritories(
    search: string,
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
        .createQueryBuilder(Territory, "territory")
        .where("territory.name ILIKE :pattern", { pattern })
        .orderBy("territory.name", "ASC")
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