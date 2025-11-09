import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Like } from 'typeorm';
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

@Injectable()
export class RegionService {
  constructor(private readonly dataSource: DataSource) { }

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

  async getRegions(options?: PaginationDto, manager?: EntityManager): Promise<Region[]> {
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

      return em!.find(Region, {
        skip: (page - 1) * limit,
        take: limit,
      });
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

  async searchRegions(search:string,manager?:EntityManager): Promise<string[]> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const regions = await em!.find(Region, { where: { name: Like(`%${search}%`) } });
      return regions.map(region => region.name);
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

  async regionCount(manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
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

  async getAreasByRegionId(
    regionId: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedAreas> {

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

      const areas = em!
        .createQueryBuilder(Area, 'area')
        .leftJoinAndSelect('area.region', 'region')
        .where('area.region_id = :regionId', { regionId })
        .orderBy('area.name', 'ASC')
        .addOrderBy('area.id', 'ASC');

      const [data, total] = await areas
        .take(limit)
        .skip((page - 1) * limit)
        .getManyAndCount();

      if (total === 0) {
        throw new NotFoundException(`No areas found for region ID ${regionId}`);
      }

      if (!manager) {
        await queryRunner?.commitTransaction();
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

  async getAreasCountByRegionId(regionId: string, manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
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


}