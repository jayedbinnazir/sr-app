import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { DataSource, EntityManager, Like } from "typeorm";
import { CreateTerritoryDto } from "../dto/create-territory.dto";
import { Territory } from "../entities/territory.entity";
import { PaginationDto } from "src/common/dto/pagination.dto";
import { UpdateTerritoryDto } from "../dto/update-territory.dto";


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


  async getTerritories(options?:PaginationDto, manager?:EntityManager) {
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
      const territories = await em!.find(Territory, { skip: (page - 1) * limit, take: limit });
      return territories;
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

  async searchTerritories(search:string, manager?:EntityManager): Promise<string[]> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const territories = await em!.find(Territory, { where: { name: Like(`%${search}%`) } });
      return territories.map(territory => territory.name);
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