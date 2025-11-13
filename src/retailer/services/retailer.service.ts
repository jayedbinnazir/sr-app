import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Retailer } from '../entities/retailer.entity';
import { CreateRetailerAdminDto } from '../dto/create-retailer-admin.dto';
import { AdminUpdateRetailerDto } from '../dto/admin-update-retailer.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { Region } from 'src/region/entities/region.entity';
import { Area } from 'src/area/entities/area.entity';
import { Distributor } from 'src/distributor/entities/distributor.entity';
import { Territory } from 'src/territory/entities/territory.entity';

type PaginatedRetailers = {
  data: Retailer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

@Injectable()
export class RetailerService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Retailer)
    private readonly retailerRepository: Repository<Retailer>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Distributor)
    private readonly distributorRepository: Repository<Distributor>,
    @InjectRepository(Territory)
    private readonly territoryRepository: Repository<Territory>,
  ) {}

  async createRetailer(
    createRetailerDto: CreateRetailerAdminDto,
    manager?: EntityManager,
  ): Promise<Retailer> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      await this.ensureUidIsUnique(createRetailerDto.uid, em!);
      await this.ensureOptionalRelationsExist(createRetailerDto, em!);

      const retailer = em!.create(Retailer, { ...createRetailerDto });
      const saved = await em!.save(retailer);

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

  async getRetailers(
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedRetailers> {
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

      const qb = em!
        .createQueryBuilder(Retailer, 'retailer')
        .orderBy('retailer.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      if (!manager) {
        await queryRunner?.commitTransaction();
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
    }
    finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async searchRetailers(
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<PaginatedRetailers> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const trimmed = (search ?? '').trim();
      const { page, limit } = PaginationDto.resolve(options, {
        defaultLimit: 20,
        maxLimit: 100,
      });

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
        .createQueryBuilder(Retailer, 'retailer')
        .where(
          'retailer.name ILIKE :pattern OR retailer.uid ILIKE :pattern OR retailer.phone ILIKE :pattern',
          { pattern },
        )
        .orderBy('retailer.name', 'ASC')
        .skip((page - 1) * limit)
        .take(limit);

      const [data, total] = await qb.getManyAndCount();
      if (!manager) {
        await queryRunner?.commitTransaction();
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

  async getRetailerDetail(id: string, manager?: EntityManager): Promise<Retailer> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      const retailer = await em!.findOne(Retailer, { where: { id } });
      if (!retailer) {
        throw new NotFoundException('Retailer not found');
      }
      return retailer;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async updateRetailer(
    id: string,
    dto: AdminUpdateRetailerDto,
    manager?: EntityManager,
  ): Promise<Retailer> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const retailer = await em!.findOne(Retailer, { where: { id } });
      if (!retailer) {
        throw new NotFoundException('Retailer not found');
      }

      if (dto.uid && dto.uid !== retailer.uid) {
        await this.ensureUidIsUnique(dto.uid, em!);
      }

      await this.ensureOptionalRelationsExist(dto, em!);

      Object.assign(retailer, dto);
      const updated = await em!.save(retailer);

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

  async deleteRetailer(id: string, manager?: EntityManager): Promise<void> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const retailer = await em!.findOne(Retailer, { where: { id } });
      if (!retailer) {
        throw new NotFoundException('Retailer not found');
      }

      await em!.remove(retailer);

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

  async retailerCount(manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      return await em!.count(Retailer);
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  private async ensureUidIsUnique(
    uid: string,
    manager: EntityManager,
  ): Promise<void> {
    const existing = await manager.findOne(Retailer, { where: { uid } });
    if (existing) {
      throw new ConflictException('Retailer UID already exists');
    }
  }

  private async ensureOptionalRelationsExist(
    dto: Partial<CreateRetailerAdminDto>,
    manager: EntityManager,
  ): Promise<void> {
    const checks: Array<Promise<void>> = [];

    if (dto.region_id) {
      checks.push(this.ensureRelationExists(manager, Region, dto.region_id, 'Region'));
    }
    if (dto.area_id) {
      checks.push(this.ensureRelationExists(manager, Area, dto.area_id, 'Area'));
    }
    if (dto.distributor_id) {
      checks.push(
        this.ensureRelationExists(manager, Distributor, dto.distributor_id, 'Distributor'),
      );
    }
    if (dto.territory_id) {
      checks.push(
        this.ensureRelationExists(manager, Territory, dto.territory_id, 'Territory'),
      );
    }

    await Promise.all(checks);
  }

  private async ensureRelationExists<T>(
    manager: EntityManager,
    entity: { new (): T },
    id: string,
    label: string,
  ): Promise<void> {
    const exists = await manager.findOne(entity, { where: { id } as any });
    if (!exists) {
      throw new NotFoundException(`${label} not found`);
    }
  }
}

