import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateRetailerDto } from 'src/retailer/dto/update-retailer.dto';
import { Brackets, DataSource, EntityManager } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SalesRepRetailer } from '../entities/sales-rep-retailer.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

type RetailerIdentifier = { id?: string; uid?: string };

type AssignedRetailerList = {
  data: Retailer[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
};

@Injectable()
export class SalesRepService {
  constructor(
    private readonly dataSource: DataSource,
  ) { }

  //Todo-->
  //-->1. getAllRetailers who are assigned to the sales rep
  //-->2.  updateAssignedRetailer  Note, Points, Routes
  //-->3.  Search assignedRetailer by name , phone , uid,
  //-->4.  view assignedRetailer  Details


  async listPaginatedAssignedRetailers(
    rep_id: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<AssignedRetailerList> {
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
      const qb = em!.createQueryBuilder(Retailer, 'retailer')
        .innerJoin(
          SalesRepRetailer,
          'assignment',
          'assignment.retailer_id = retailer.id AND assignment.sales_rep_id = :salesRepId',
          { salesRepId: rep_id },
        )
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.points',
        ])
        .orderBy('retailer.name', 'ASC')
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


  async updateRetailer(
    salesRepId: string,
    identifier: RetailerIdentifier,
    updateRetailerDto: UpdateRetailerDto,
    manager?: EntityManager,
  ): Promise<Retailer> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const retailer = await this.getAssignedRetailerDetail(
        salesRepId,
        identifier,
        em,
      );

      type UpdatableRetailerFields = 'points' | 'routes' | 'notes';
      const accessFields: UpdatableRetailerFields[] = ['points', 'routes', 'notes'];
      
      for (const field of accessFields) {
        const value = updateRetailerDto[field];
      
        if (value !== undefined) {
          (retailer as Record<UpdatableRetailerFields, any>)[field] = value;
        }
      }

      const updated = await em!.save(Retailer, retailer);

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



  //Search & Filter: Search by name/code/phone; filter by region/area/distributor/territory.
  async searchAssignedRetailers(
    salesRepId: string,
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<AssignedRetailerList> {
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
      const qb = em!.createQueryBuilder(Retailer, 'retailer')
        .innerJoin(
          SalesRepRetailer,
          'assignment',
          'assignment.retailer_id = retailer.id AND assignment.sales_rep_id = :salesRepId',
          { salesRepId },
        )
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.points',
          'retailer.routes',
          'retailer.notes',
        ])
        .where(
          new Brackets((qbWhere) => {
            qbWhere
              .where('retailer.name ILIKE :pattern')
              .orWhere('retailer.phone ILIKE :pattern')
              .orWhere('retailer.uid ILIKE :pattern')
              .orWhere('CAST(retailer.points AS TEXT) ILIKE :pattern')
              .orWhere('retailer.routes ILIKE :pattern')
              .orWhere('retailer.notes ILIKE :pattern');
          }),
        )
        .setParameter('pattern', pattern)
        .orderBy('retailer.name', 'ASC')
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

  async getAssignedRetailerDetail(
    salesRepId: string,
    identifier: RetailerIdentifier,
    manager?: EntityManager,
  ): Promise<Retailer> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      if (!identifier?.id && !identifier?.uid) {
        throw new BadRequestException('Retailer identifier is required');
      }

      const qb = em!
        .createQueryBuilder(Retailer, 'retailer')
        .innerJoin(
          SalesRepRetailer,
          'assignment',
          'assignment.retailer_id = retailer.id AND assignment.sales_rep_id = :salesRepId',
          { salesRepId },
        )
        .leftJoinAndSelect('retailer.region', 'region')
        .leftJoinAndSelect('retailer.area', 'area')
        .leftJoinAndSelect('retailer.distributor', 'distributor')
        .leftJoinAndSelect('retailer.territory', 'territory')
        .select([
          'retailer',
          'region.id',
          'region.name',
          'retailer.points',
          'retailer.routes',
          'retailer.notes',
          'area.id',
          'area.name',
          'distributor.id',
          'distributor.name',
          'territory.id',
          'territory.name',
        ]);

      if (identifier.id) {
        qb.andWhere('retailer.id = :retailerId', { retailerId: identifier.id });
      }
      if (identifier.uid) {
        qb.andWhere('retailer.uid = :retailerUid', {
          retailerUid: identifier.uid,
        });
      }

      const retailer = await qb.getOne();

      if (!retailer) {
        throw new NotFoundException('Retailer not found or not assigned');
      }

      return retailer;
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

  async assignedRetailerCount(
    salesRepId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const count = await em!.count(SalesRepRetailer, {
        where: { sales_rep_id: salesRepId },
      });
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
}
