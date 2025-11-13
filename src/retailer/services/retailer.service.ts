import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  DataSource,
  FindOptionsWhere,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';

import { Region } from 'src/region/entities/region.entity';
import { Area } from 'src/area/entities/area.entity';
import { Territory } from 'src/territory/entities/territory.entity';
import { Distributor } from 'src/distributor/entities/distributor.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Readable } from 'stream';
import { parse } from '@fast-csv/parse';
import { Retailer } from '../entities/retailer.entity';
import { SalesRepRetailer } from 'src/sales_rep/entities/sales-rep-retailer.entity';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import { ListRetailerDto } from '../dto/list-retailer.dto';
import { UpdateRetailerDto } from '../dto/update-retailer.dto';
import { CreateRetailerAdminDto } from '../dto/create-retailer-admin.dto';
import { AdminUpdateRetailerDto } from '../dto/admin-update-retailer.dto';
import { BulkAssignDto } from '../dto/bulk-assign.dto';
import { BulkUnassignDto } from '../dto/bulk-unassign.dto';

type RetailerListing = {
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
  data: Retailer[];
};

type CsvRetailerRow = {
  uid: string;
  name: string;
  phone?: string;
  region?: string;
  area?: string;
  distributor?: string;
  territory?: string;
  points?: string;
  routes?: string;
  notes?: string;
};

@Injectable()
export class RetailerService {
  private readonly logger = new Logger(RetailerService.name);
  private readonly cacheKeyRegistry = new Map<string, Set<string>>();
  private readonly retailerCacheTtl =
    Number(process.env.RETAILER_CACHE_TTL ?? 60);

    //Todo-->
    //-->1. listAssignedRetailers {id , name}
    //-->2. getRetailerDetailForSalesRep{whole}
    //-->3. updateRetailerBySalesRep {points, routes, notes}
    //-->4. adminListAllRetailers {id , name}

  constructor(
    @InjectRepository(Retailer)
    private readonly retailerRepository: Repository<Retailer>,
    @InjectRepository(SalesRepRetailer)
    private readonly assignmentRepository: Repository<SalesRepRetailer>,
    @InjectRepository(SalesRep)
    private readonly salesRepRepository: Repository<SalesRep>,
    @InjectRepository(Region)
    private readonly regionRepository: Repository<Region>,
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
    @InjectRepository(Distributor)
    private readonly distributorRepository: Repository<Distributor>,
    @InjectRepository(Territory)
    private readonly territoryRepository: Repository<Territory>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async listAssignedRetailers(
    salesRepId: string,
    query: ListRetailerDto,
  ): Promise<RetailerListing> {
    await this.ensureSalesRepExists(salesRepId);
    const cacheKey = this.buildCacheKey(salesRepId, query);

    const cached = await this.cacheManager.get<RetailerListing>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ${cacheKey}`);
      return cached;
    }

    const qb = this.retailerRepository
      .createQueryBuilder('retailer')
      .innerJoin(
        SalesRepRetailer,
        'assignment',
        'assignment.retailer_id = retailer.id AND assignment.sales_rep_id = :salesRepId',
        { salesRepId },
      );

    this.applyFilters(qb, query);

    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'ASC';
    qb.orderBy(`retailer.${sortBy}`, sortOrder);

    qb.offset((query.page - 1) * query.limit).limit(query.limit);

    const [data, total] = await qb.getManyAndCount();

    const response: RetailerListing = {
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        hasNext: query.page * query.limit < total,
      },
      data,
    };

    await this.cacheManager.set(cacheKey, response, this.retailerCacheTtl);
    this.registerCacheKey(salesRepId, cacheKey);

    return response;
  }

  async getRetailerDetailForSalesRep(
    salesRepId: string,
    retailerUid: string,
  ): Promise<Retailer> {
    const retailer = await this.retailerRepository
      .createQueryBuilder('retailer')
      .innerJoin(
        SalesRepRetailer,
        'assignment',
        'assignment.retailer_id = retailer.id AND assignment.sales_rep_id = :salesRepId',
        { salesRepId },
      )
      .where('retailer.uid = :retailerUid', { retailerUid })
      .getOne();

    if (!retailer) {
      throw new NotFoundException('Retailer not found or not assigned');
    }

    return retailer;
  }

  async updateRetailerBySalesRep(
    salesRepId: string,
    retailerUid: string,
    dto: UpdateRetailerDto,
  ): Promise<Retailer> {
    const retailer = await this.getRetailerDetailForSalesRep(
      salesRepId,
      retailerUid,
    );

    retailer.points = dto.points ?? retailer.points;
    retailer.routes = dto.routes ?? retailer.routes;
    retailer.notes = dto.notes ?? retailer.notes;

    const updated = await this.retailerRepository.save(retailer);
    await this.invalidateSalesRepCache(salesRepId);
    return updated;
  }

  async adminListAllRetailers(
    query: ListRetailerDto,
  ): Promise<RetailerListing> {
    const qb = this.retailerRepository.createQueryBuilder('retailer');
    this.applyFilters(qb, query);

    const sortBy = query.sortBy ?? 'name';
    const sortOrder = query.sortOrder ?? 'ASC';
    qb.orderBy(`retailer.${sortBy}`, sortOrder);

    qb.offset((query.page - 1) * query.limit).limit(query.limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        hasNext: query.page * query.limit < total,
      },
      data,
    };
  }

  async adminCreate(dto: CreateRetailerAdminDto): Promise<Retailer> {
    await this.ensureOptionalRelationsExist(dto);

    const existing = await this.retailerRepository.findOne({
      where: { uid: dto.uid },
    });
    if (existing) {
      throw new ConflictException('Retailer UID already exists');
    }

    const retailer = this.retailerRepository.create(dto);
    return this.retailerRepository.save(retailer);
  }

  async adminUpdate(
    retailerId: string,
    dto: AdminUpdateRetailerDto,
  ): Promise<Retailer> {
    await this.ensureOptionalRelationsExist(dto);

    const retailer = await this.retailerRepository.findOne({
      where: { id: retailerId },
    });
    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }

    Object.assign(retailer, dto);
    const updated = await this.retailerRepository.save(retailer);

    const assignments = await this.assignmentRepository.find({
      where: { retailer_id: retailerId },
    });

    await Promise.all(
      assignments.map((assignment) =>
        this.invalidateSalesRepCache(assignment.sales_rep_id),
      ),
    );

    return updated;
  }

  async adminGetDetail(retailerId: string): Promise<Retailer> {
    const retailer = await this.retailerRepository.findOne({
      where: { id: retailerId },
    });
    if (!retailer) {
      throw new NotFoundException('Retailer not found');
    }
    return retailer;
  }

  async adminDelete(retailerId: string): Promise<void> {
    const retailer = await this.adminGetDetail(retailerId);
    await this.retailerRepository.remove(retailer);
    const assignments = await this.assignmentRepository.find({
      where: { retailer_id: retailerId },
    });
    await Promise.all(
      assignments.map((assignment) =>
        this.invalidateSalesRepCache(assignment.sales_rep_id),
      ),
    );
  }

  async bulkAssign(dto: BulkAssignDto, assignedBy?: string): Promise<void> {
    await this.ensureSalesRepExists(dto.salesRepId);

    const retailers = await this.retailerRepository.find({
      where: { id: In(dto.retailerIds) },
    });

    if (retailers.length !== dto.retailerIds.length) {
      throw new NotFoundException('One or more retailers not found');
    }

    const currentCount = await this.assignmentRepository.count({
      where: { sales_rep_id: dto.salesRepId },
    });
    const maxAssignments =
      Number(process.env.SALES_REP_ASSIGNMENT_LIMIT ?? 200) || 200;

    if (currentCount + dto.retailerIds.length > maxAssignments) {
      throw new ConflictException(
        `Assignment exceeds allowed limit of ${maxAssignments} retailers per sales rep`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const existingAssignments = await manager.find(SalesRepRetailer, {
        where: {
          sales_rep_id: dto.salesRepId,
          retailer_id: In(dto.retailerIds),
          isActive: true,
        },
      });

      const existingIds = new Set(
        existingAssignments.map((item) => item.retailer_id),
      );

      const newAssignments = dto.retailerIds
        .filter((id) => !existingIds.has(id))
        .map((retailerId) =>
          manager.create(SalesRepRetailer, {
            sales_rep_id: dto.salesRepId,
            retailer_id: retailerId,
            assignedBy: assignedBy ?? null,
          }),
        );

      if (newAssignments.length) {
        await manager.save(newAssignments);
        await manager
          .createQueryBuilder()
          .update(Retailer)
          .set({ isAssigned: true })
          .whereInIds(newAssignments.map((item) => item.retailer_id))
          .execute();
      }
    });

    await this.invalidateSalesRepCache(dto.salesRepId);
  }

  async bulkUnassign(dto: BulkUnassignDto): Promise<void> {
    await this.ensureSalesRepExists(dto.salesRepId);

    await this.dataSource.transaction(async (manager) => {
      const assignments = await manager.find(SalesRepRetailer, {
        where: {
          sales_rep_id: dto.salesRepId,
          retailer_id: In(dto.retailerIds),
        },
      });

      if (!assignments.length) {
        return;
      }

      const retailerIds = assignments.map((assignment) => assignment.retailer_id);

      await manager.delete(SalesRepRetailer, {
        sales_rep_id: dto.salesRepId,
        retailer_id: In(retailerIds),
      });

      const stillAssigned = await manager
        .createQueryBuilder(SalesRepRetailer, 'assignment')
        .select('assignment.retailer_id', 'retailer_id')
        .where('assignment.retailer_id IN (:...ids)', { ids: retailerIds })
        .andWhere('assignment.is_active = TRUE')
        .getRawMany();

      const stillAssignedSet = new Set(
        stillAssigned.map((row: { retailer_id: string }) => row.retailer_id),
      );

      const toMarkUnassigned = retailerIds.filter(
        (id) => !stillAssignedSet.has(id),
      );

      if (toMarkUnassigned.length) {
        await manager
          .createQueryBuilder()
          .update(Retailer)
          .set({ isAssigned: false })
          .whereInIds(toMarkUnassigned)
          .execute();
      }
    });

    await this.invalidateSalesRepCache(dto.salesRepId);
  }

  async importRetailersFromCsv(
    buffer: Buffer,
    options?: { dryRun?: boolean; assignedBy?: string },
  ): Promise<{ processed: number; created: number; skipped: number }> {
    const rows = await this.parseCsv(buffer);

    let processed = 0;
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      processed += 1;
      try {
        const dto: CreateRetailerAdminDto = {
          uid: row.uid,
          name: row.name,
          phone: row.phone,
          routes: row.routes,
          notes: row.notes,
        };

        await this.resolveLookupReferences(dto, row);

        await this.adminCreate(dto);
        created += 1;
      } catch (error) {
        skipped += 1;
        this.logger.warn(
          `Skipping retailer import for UID ${row.uid}: ${error?.message ?? error}`,
        );
      }
    }

    return { processed, created, skipped };
  }

  private async ensureOptionalRelationsExist(
    dto: Partial<CreateRetailerAdminDto>,
  ): Promise<void> {
    const checks: Array<Promise<void>> = [];

    if (dto.region_id) {
      checks.push(this.ensureExists(this.regionRepository, dto.region_id));
    }
    if (dto.area_id) {
      checks.push(this.ensureExists(this.areaRepository, dto.area_id));
    }
    if (dto.distributor_id) {
      checks.push(
        this.ensureExists(this.distributorRepository, dto.distributor_id),
      );
    }
    if (dto.territory_id) {
      checks.push(this.ensureExists(this.territoryRepository, dto.territory_id));
    }

    await Promise.all(checks);
  }

  private async ensureExists<T extends { id: string }>(
    repository: Repository<T>,
    id: string,
  ): Promise<void> {
    const record = await repository.findOne({ where: { id } as FindOptionsWhere<T> });
    if (!record) {
      throw new NotFoundException('Referenced entity not found');
    }
  }

  private async ensureSalesRepExists(salesRepId: string): Promise<SalesRep> {
    const salesRep = await this.salesRepRepository.findOne({
      where: { id: salesRepId },
    });
    if (!salesRep) {
      throw new NotFoundException('Sales representative not found');
    }
    return salesRep;
  }

  private applyFilters(
    qb: SelectQueryBuilder<Retailer>,
    query: ListRetailerDto,
  ) {
    if (query.search) {
      const keyword = `%${query.search.trim()}%`;
      qb.andWhere(
        '(retailer.name ILIKE :keyword OR retailer.uid ILIKE :keyword OR retailer.phone ILIKE :keyword)',
        { keyword },
      );
    }

    if (query.regionId) {
      qb.andWhere('retailer.region_id = :regionId', {
        regionId: query.regionId,
      });
    }

    if (query.areaId) {
      qb.andWhere('retailer.area_id = :areaId', { areaId: query.areaId });
    }

    if (query.distributorId) {
      qb.andWhere('retailer.distributor_id = :distributorId', {
        distributorId: query.distributorId,
      });
    }

    if (query.territoryId) {
      qb.andWhere('retailer.territory_id = :territoryId', {
        territoryId: query.territoryId,
      });
    }
  }

  private buildCacheKey(salesRepId: string, query: ListRetailerDto): string {
    const key = `sales-rep:${salesRepId}:retailers:${JSON.stringify(query)}`;
    return key;
  }

  private registerCacheKey(salesRepId: string, key: string) {
    const set = this.cacheKeyRegistry.get(salesRepId) ?? new Set<string>();
    set.add(key);
    this.cacheKeyRegistry.set(salesRepId, set);
  }

  private async invalidateSalesRepCache(salesRepId: string): Promise<void> {
    const keys = this.cacheKeyRegistry.get(salesRepId);
    if (!keys) {
      return;
    }

    await Promise.all([...keys].map((key) => this.cacheManager.del(key)));
    this.cacheKeyRegistry.delete(salesRepId);
  }

  private async parseCsv(buffer: Buffer): Promise<CsvRetailerRow[]> {
    return new Promise((resolve, reject) => {
      const rows: CsvRetailerRow[] = [];
      const stream = Readable.from(buffer);

      stream
        .pipe(
          parse<CsvRetailerRow, CsvRetailerRow>({
            headers: true,
            ignoreEmpty: true,
            trim: true,
          }),
        )
        .on('error', reject)
        .on('data', (row) => rows.push(row))
        .on('end', () => resolve(rows));
    });
  }

  private async resolveLookupReferences(
    dto: CreateRetailerAdminDto,
    row: CsvRetailerRow,
  ) {
    if (row.region) {
      const region = await this.regionRepository
        .createQueryBuilder('region')
        .where('LOWER(region.name) = LOWER(:name)', {
          name: row.region.trim(),
        })
        .getOne();
      dto.region_id = region?.id ?? null;
    }

    if (row.area) {
      const area = await this.areaRepository
        .createQueryBuilder('area')
        .where('LOWER(area.name) = LOWER(:name)', {
          name: row.area.trim(),
        })
        .getOne();
      dto.area_id = area?.id ?? null;
    }

    if (row.distributor) {
      const distributor = await this.distributorRepository
        .createQueryBuilder('distributor')
        .where('LOWER(distributor.name) = LOWER(:name)', {
          name: row.distributor.trim(),
        })
        .getOne();
      dto.distributor_id = distributor?.id ?? null;
    }

    if (row.territory) {
      const territory = await this.territoryRepository
        .createQueryBuilder('territory')
        .where('LOWER(territory.name) = LOWER(:name)', {
          name: row.territory.trim(),
        })
        .getOne();
      dto.territory_id = territory?.id ?? null;
    }

    if (row.points) {
      const parsedPoints = Number(row.points);
      if (!Number.isNaN(parsedPoints)) {
        dto.points = parsedPoints;
      }
    }
  }
}

