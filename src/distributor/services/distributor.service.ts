import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CreateDistributorDto } from '../dto/create-distributor.dto';
import { UpdateDistributorDto } from '../dto/update-distributor.dto';
import { Distributor } from '../entities/distributor.entity';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Region } from 'src/region/entities/region.entity';

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
  constructor(private readonly dataSource: DataSource) {}

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
      await this.ensureRegionExists(createDistributorDto.region_id, em);

      const existing = await em!.findOne(Distributor, {
        where: { name: createDistributorDto.name },
      });

      if (existing) {
        throw new ConflictException(
          `Distributor with name '${createDistributorDto.name}' already exists`,
        );
      }

      const distributor = em!.create(Distributor, {
        ...createDistributorDto,
        region_id: createDistributorDto.region_id ?? null,
      });

      const saved = await em!.save(distributor);

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

      const qb = em!
        .createQueryBuilder(Distributor, 'distributor')
        .leftJoinAndSelect('distributor.region', 'region')
        .orderBy('distributor.name', 'ASC')
        .addOrderBy('distributor.id', 'ASC')
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
      const distributor = await em!
        .createQueryBuilder(Distributor, 'distributor')
        .leftJoinAndSelect('distributor.region', 'region')
        .where('distributor.id = :id', { id })
        .getOne();

      if (!distributor) {
        throw new NotFoundException(`Distributor with ID ${id} not found`);
      }

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

      if (updateDistributorDto.region_id !== undefined) {
        await this.ensureRegionExists(updateDistributorDto.region_id, em);
        distributor.region_id = updateDistributorDto.region_id ?? null;
      }

      if (updateDistributorDto.name) {
        distributor.name = updateDistributorDto.name;
      }

      const updated = await em!.save(distributor);

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

      const qb = em!
        .createQueryBuilder(Distributor, 'distributor')
        .leftJoinAndSelect('distributor.region', 'region')
        .where('distributor.name ILIKE :pattern', { pattern })
        .orderBy('distributor.name', 'ASC')
        .addOrderBy('distributor.id', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [entities, total] = await qb.getManyAndCount();

      const data = entities.map<DistributorSearchItem>((entity) => ({
        id: entity.id,
        name: entity.name,
        regionId: entity.region_id ?? null,
        regionName: entity.region?.name ?? null,
      }));

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

  private async ensureRegionExists(
    regionId: string | null | undefined,
    manager?: EntityManager,
  ): Promise<void> {
    if (!regionId) {
      return;
    }

    const exists = await manager!.findOne(Region, { where: { id: regionId } });

    if (!exists) {
      throw new BadRequestException(`Region with ID ${regionId} not found`);
    }
  }
}

