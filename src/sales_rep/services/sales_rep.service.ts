import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateRetailerDto } from 'src/retailer/dto/update-retailer.dto';
import { Brackets, DataSource, EntityManager, IsNull } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { SalesRepRetailer } from '../entities/sales-rep-retailer.entity';
import { SalesRep } from '../entities/sales_rep.entity';

type AssignmentSummary = {
  salesRepId: string;
  requested: number;
  assigned: number;
  skipped: number;
  missing: string[];
};
type UnassignmentSummary = {
  salesRepId: string;
  requested: number;
  unassigned: number;
  skipped: number;
  missing: string[];
};
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

type RetailerFilter = {
  regionId?: string;
  areaId?: string;
  distributorId?: string;
  territoryId?: string;
}

type UnassignedRetailerList = AssignedRetailerList;

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



  //admin, sales rep view assigned retailers
  // List Paginated Assigned Retailers for an active sales rep

  // role- admin, sales_rep view assigned retailers
  async listPaginatedAssignedRetailers(
    rep_id: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<AssignedRetailerList> {
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
      const qb = em!.createQueryBuilder(Retailer, 'retailer')
        .innerJoin(
          SalesRepRetailer,
          'assignment',
          `assignment.retailer_id = retailer.id
           AND assignment.sales_rep_id = :salesRepId
           AND assignment.is_active = TRUE`,
          { salesRepId: rep_id },
        )
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.isAssigned',
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


  //Not Required for now
  //By Admin Only
  // check the sales_re_retailer table is active or not

  // role- admin  view unassigned retailers
  async listAllPaginatedUnassignedRetailers(
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<UnassignedRetailerList> {
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
      const qb = em!.createQueryBuilder(Retailer, 'retailer')
        .where('retailer.deleted_at IS NULL')
        .andWhere('retailer.isAssigned = FALSE')
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.isAssigned',
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


  //view retailer details
  //admin and sales rep view retailer details
  async getRetailerDetail(
    retailerId: string,
    manager?: EntityManager,
  ): Promise<Retailer> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const retailer = await em!.createQueryBuilder(Retailer, 'retailer')
        .leftJoinAndSelect('retailer.region', 'region')
        .leftJoinAndSelect('retailer.area', 'area')
        .leftJoinAndSelect('retailer.distributor', 'distributor')
        .leftJoinAndSelect('retailer.territory', 'territory')
        .select(['retailer.id', 'retailer.uid', 'retailer.name', 'retailer.phone', 'retailer.isAssigned', 'region.name', 'area.name', 'distributor.name', 'territory.name'])
        .where('retailer.id = :retailerId', { retailerId })
        .getOne();
      if (!retailer) {
        throw new NotFoundException('Retailer not found');
      }
      return retailer;
    } catch (error) {
      throw error;
    }
  }


  //sales rep update assigned retailer points, routes, notes only
  // role- sales_rep update assigned retailer points, routes, notes only
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
      const retailer = await em!.createQueryBuilder(Retailer, 'retailer')
        .select(['retailer.id', 'retailer.uid', 'retailer.name', 'retailer.points', 'retailer.routes', 'retailer.notes', 'retailer.isAssigned'])
        .where('retailer.id = :retailerId', { retailerId: identifier.id })
        .getOne();
      if (!retailer) {
        throw new NotFoundException('Retailer not found');
      }
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

  //helper function to normalize retailer filter
  private normalizeRetailerFilter(filter?: RetailerFilter | string): RetailerFilter {
    if (!filter) {
      return {};
    }

    if (typeof filter === 'string') {
      try {
        const parsed = JSON.parse(filter);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as RetailerFilter;
        }
      } catch {
        return {};
      }
      return {};
    }

    if (typeof filter === 'object') {
      return JSON.parse(JSON.stringify(filter)) as RetailerFilter;
    }

    return {};
  }

  //Search & Filter: Search by name/code/phone;  sales rep view assigned retailers
  // role-sales_rep search assigned retailers by name, phone, uid
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
      await queryRunner?.startTransaction();
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
          `assignment.retailer_id = retailer.id
           AND assignment.sales_rep_id = :salesRepId
           AND assignment.is_active = TRUE`,
          { salesRepId },
        )
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.isAssigned',

        ])
        .where(
          new Brackets((qbWhere) => {
            qbWhere
              .where('retailer.name ILIKE :pattern')
              .orWhere('retailer.phone ILIKE :pattern')
              .orWhere('retailer.uid ILIKE :pattern')
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



  //admin search by name , phone ,uid 
  async searchRetailers(
    search: string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<AssignedRetailerList> {
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
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.isAssigned',
        ])
        .where(
          new Brackets((qbWhere) => {
            qbWhere
              .where('retailer.name ILIKE :pattern')
              .orWhere('retailer.phone ILIKE :pattern')
              .orWhere('retailer.uid ILIKE :pattern')
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



  //admin filter by region, area, distributor, territory
  async filterRetailers(
    filter?: RetailerFilter | string,
    options?: PaginationDto,
    manager?: EntityManager,
  ): Promise<AssignedRetailerList> {
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

      const filterOption = this.normalizeRetailerFilter(filter);
      const qb = em!.createQueryBuilder(Retailer, 'retailer')
        .leftJoinAndSelect('retailer.region', 'region')
        .leftJoinAndSelect('retailer.area', 'area')
        .leftJoinAndSelect('retailer.distributor', 'distributor')
        .leftJoinAndSelect('retailer.territory', 'territory')
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.isAssigned',
          'region.name',
          'area.name',
          'distributor.name',
          'territory.name',
        ])
        .where('retailer.deleted_at IS NULL'); // always filter out deleted

      if (filterOption.regionId) qb.andWhere('retailer.region_id = :regionId', { regionId: filterOption.regionId });
      if (filterOption.areaId) qb.andWhere('retailer.area_id = :areaId', { areaId: filterOption.areaId });
      if (filterOption.distributorId) qb.andWhere('retailer.distributor_id = :distributorId', { distributorId: filterOption.distributorId });
      if (filterOption.territoryId) qb.andWhere('retailer.territory_id = :territoryId', { territoryId: filterOption.territoryId });

      qb.orderBy('retailer.name', 'ASC')
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



  //filter assigned retailers by region, area, distributor, territory (sales rep view, admin view)
  async filterAssignedRetailers(
    salesRepId: string,
    options?: PaginationDto,
    filter?: RetailerFilter | string,
    manager?: EntityManager,
  ): Promise<AssignedRetailerList> {
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

      const filterOption = this.normalizeRetailerFilter(filter);
      const qb = em!.createQueryBuilder(Retailer, 'retailer')
        .innerJoin(
          SalesRepRetailer,
          'assignment',
          `assignment.retailer_id = retailer.id
           AND assignment.sales_rep_id = :salesRepId
           AND assignment.is_active = TRUE`,
          { salesRepId },
        )
        .leftJoinAndSelect('retailer.region', 'region')
        .leftJoinAndSelect('retailer.area', 'area')
        .leftJoinAndSelect('retailer.distributor', 'distributor')
        .leftJoinAndSelect('retailer.territory', 'territory')
        .select([
          'retailer.id',
          'retailer.uid',
          'retailer.name',
          'retailer.phone',
          'retailer.isAssigned',
          'region.name',
          'area.name',
          'distributor.name',
          'territory.name',
        ])
        .where('retailer.deleted_at IS NULL'); // always filter out deleted

      if (filterOption.regionId) qb.andWhere('retailer.region_id = :regionId', { regionId: filterOption.regionId });
      if (filterOption.areaId) qb.andWhere('retailer.area_id = :areaId', { areaId: filterOption.areaId });
      if (filterOption.distributorId) qb.andWhere('retailer.distributor_id = :distributorId', { distributorId: filterOption.distributorId });
      if (filterOption.territoryId) qb.andWhere('retailer.territory_id = :territoryId', { territoryId: filterOption.territoryId });

      qb.orderBy('retailer.name', 'ASC')
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


  //admin or sales rep view assigned retailer count
  async assignedRetailerCount(
    salesRepId: string,
    manager?: EntityManager,
  ): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const count = await em!.count(SalesRepRetailer, {
        where: { sales_rep_id: salesRepId, isActive: true },
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


  //admin view total retailers count
  async totalRetailersCount(manager?: EntityManager): Promise<number> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
    }
    try {
      const count = await em!.count(Retailer, {
        where: { deleted_at: IsNull() },
      });
      return count;
    } catch (error) {
      throw error;
    }
  }


  async assignRetailerToSalesRep(
    salesRepId: string,
    retailerId: string,
    assignedBy?: string | null,
    manager?: EntityManager,
  ): Promise<{ summary: AssignmentSummary }> {
    const result = await this.assignRetailersToSalesRep(
      salesRepId,
      [retailerId],
      assignedBy ?? null,
      manager,
    );

    return { summary: result };
  }

  
  async assignRetailersToSalesRep(
    salesRepId: string,
    retailerIds: string[],
    assignedBy: string | null,
    manager?: EntityManager,
  ): Promise<AssignmentSummary> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      await this.ensureSalesRepExists(salesRepId, em!);

      const uniqueRetailerIds = Array.from(
        new Set(
          retailerIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      );

      if (!uniqueRetailerIds.length) {
        if (!manager) {
          await queryRunner?.commitTransaction();
        }
        return {
          salesRepId,
          requested: 0,
          assigned: 0,
          skipped: 0,
          missing: [],
        };
      }

      if (uniqueRetailerIds.length > 70) {
        throw new BadRequestException(
          'Bulk assignment is limited to a maximum of 70 retailers at once',
        );
      }

      const retailers = await em!
        .createQueryBuilder(Retailer, 'retailer')
        .select(['retailer.id'])
        .where('retailer.deleted_at IS NULL')
        .andWhere('retailer.id IN (:...ids)', { ids: uniqueRetailerIds })
        .getMany();

      const foundIds = new Set(retailers.map((retailer) => retailer.id));
      const missing = uniqueRetailerIds.filter((id) => !foundIds.has(id));
      const assignable = retailers.map((retailer) => retailer.id);

      const activeAssignments = assignable.length
        ? await em!
          .createQueryBuilder(SalesRepRetailer, 'assignment')
          .where('assignment.retailer_id IN (:...ids)', { ids: assignable })
          .andWhere('assignment.is_active = TRUE')
          .getMany()
        : [];

      const alreadyAssigned = new Set(
        activeAssignments
          .filter((assignment) => assignment.sales_rep_id === salesRepId)
          .map((assignment) => assignment.retailer_id),
      );

      const assignmentsToDeactivate = activeAssignments.filter(
        (assignment) => assignment.sales_rep_id !== salesRepId,
      );

      if (assignmentsToDeactivate.length) {
        await em!
          .createQueryBuilder()
          .update(SalesRepRetailer)
          .set({
            isActive: false,
            unassignedAt: () => 'NOW()',
            unassignedBy: assignedBy ?? null,
          })
          .whereInIds(assignmentsToDeactivate.map((assignment) => assignment.id))
          .execute();
      }

      const targets = assignable.filter((id) => !alreadyAssigned.has(id));

      let totalInserted = 0;
      if (targets.length) {
        const chunks = this.chunkArray(targets, 1000);
        for (const chunk of chunks) {
          const result = await em!
            .createQueryBuilder()
            .insert()
            .into(SalesRepRetailer)
            .values(
              chunk.map((retailerId) => ({
                sales_rep_id: salesRepId,
                retailer_id: retailerId,
                assignedBy,
              })),
            )
            .returning('retailer_id')
            .execute();

          totalInserted += result.raw.length;
        }
      }

      if (assignable.length) {
        await em!
          .createQueryBuilder()
          .update(Retailer)
          .set({ isAssigned: true })
          .whereInIds(assignable)
          .execute();
      }

      const summary: AssignmentSummary = {
        salesRepId,
        requested: uniqueRetailerIds.length,
        assigned: totalInserted,
        skipped: uniqueRetailerIds.length - missing.length - totalInserted,
        missing,
      };

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

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

  async unassignRetailersFromSalesRep(
    salesRepId: string,
    retailerIds: string[],
    unassignedBy?: string | null,
    manager?: EntityManager,
  ): Promise<UnassignmentSummary> {
    const queryRunner = manager ? undefined : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;
    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      await this.ensureSalesRepExists(salesRepId, em!);

      const uniqueRetailerIds = Array.from(
        new Set(
          retailerIds.filter(
            (id): id is string => typeof id === 'string' && id.trim().length > 0,
          ),
        ),
      );

      if (!uniqueRetailerIds.length) {
        if (!manager) {
          await queryRunner?.commitTransaction();
        }
        return {
          salesRepId,
          requested: 0,
          unassigned: 0,
          skipped: 0,
          missing: [],
        };
      }

      if (uniqueRetailerIds.length > 70) {
        throw new BadRequestException(
          'Bulk unassignment is limited to a maximum of 70 retailers at once',
        );
      }

      const activeAssignments = await em!
        .createQueryBuilder(SalesRepRetailer, 'assignment')
        .where('assignment.sales_rep_id = :salesRepId', { salesRepId })
        .andWhere('assignment.retailer_id IN (:...ids)', {
          ids: uniqueRetailerIds,
        })
        .andWhere('assignment.is_active = TRUE')
        .getMany();

      const activeIds = new Set(
        activeAssignments.map((assignment) => assignment.retailer_id),
      );

      const missing = uniqueRetailerIds.filter((id) => !activeIds.has(id));

      if (activeAssignments.length) {
        await em!
          .createQueryBuilder()
          .update(SalesRepRetailer)
          .set({
            isActive: false,
            unassignedAt: () => 'NOW()',
            unassignedBy: unassignedBy ?? null,
          })
          .where('sales_rep_id = :salesRepId', { salesRepId })
          .andWhere('retailer_id IN (:...ids)', {
            ids: Array.from(activeIds),
          })
          .andWhere('is_active = TRUE')
          .execute();

        const stillAssigned = await em!
          .createQueryBuilder(SalesRepRetailer, 'assignment')
          .select('assignment.retailer_id', 'retailer_id')
          .where('assignment.retailer_id IN (:...ids)', {
            ids: Array.from(activeIds),
          })
          .andWhere('assignment.is_active = TRUE')
          .getRawMany();

        const stillAssignedSet = new Set(
          stillAssigned.map((row: { retailer_id: string }) => row.retailer_id),
        );

        const toMarkUnassigned = Array.from(activeIds).filter(
          (id) => !stillAssignedSet.has(id),
        );

        if (toMarkUnassigned.length) {
          await em!
            .createQueryBuilder()
            .update(Retailer)
            .set({ isAssigned: false })
            .whereInIds(toMarkUnassigned)
            .execute();
        }
      }

      const summary: UnassignmentSummary = {
        salesRepId,
        requested: uniqueRetailerIds.length,
        unassigned: activeAssignments.length,
        skipped: 0,
        missing,
      };

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

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

  private async ensureSalesRepExists(
    salesRepId: string,
    manager: EntityManager,
  ): Promise<void> {
    const exists = await manager
      .createQueryBuilder(SalesRep, 'salesRep')
      .select('1')
      .where('salesRep.id = :salesRepId', { salesRepId })
      .getRawOne();

    if (!exists) {
      throw new NotFoundException('Sales representative not found');
    }
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  }
}
