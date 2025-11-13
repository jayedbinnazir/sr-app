import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, QueueEvents } from 'bullmq';
import { RETAILER_IMPORT_QUEUE_NAME } from 'src/import/import.constants';
import { RetailerImportJob } from 'src/import/types/retailer-import-job.interface';
import { createReadStream, promises as fs } from 'fs';
import { pipeline as pipelinePromise } from 'stream/promises';
import { Pool, PoolClient } from 'pg';
import copyStream from 'pg-copy-streams';

type SanitizedRetailerRow = {
  uid: string;
  name: string | null;
  phone: string | null;
  regionId: string | null;
  areaId: string | null;
  distributorId: string | null;
  territoryId: string | null;
  points: number;
  routes: string | null;
  notes: string | null;
};

type InvalidRetailerRow = {
  uid: string | null;
  row: Record<string, unknown>;
  error: string;
};

type ReferenceIdSets = {
  regionIds: Set<string>;
  areaIds: Set<string>;
  distributorIds: Set<string>;
  territoryIds: Set<string>;
};

const copyFrom = copyStream.from;

@Injectable()
export class ImportWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportWorkerService.name);
  private worker?: Worker<RetailerImportJob>;
  private queueEvents?: QueueEvents;
  private pool: Pool;
  private static readonly UUID_REGEX =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  private static readonly BATCH_SIZE = Number(
    process.env.RETAILER_IMPORT_BATCH_SIZE ?? 5000,
  );
  private static readonly CONCURRENCY = Number(
    process.env.RETAILER_IMPORT_WORKER_CONCURRENCY ?? 4,
  );
  private static readonly CHUNK_SIZE = Number(
    process.env.RETAILER_IMPORT_UPSERT_CHUNK ?? 2000,
  );

  constructor(private readonly configService: ConfigService) {
    const db = this.configService.get('db') as Record<string, unknown>;
    this.pool = new Pool({
      host: this.configService.get('db.host') ?? 'db',
      port: Number(this.configService.get('db.port')) || 5432,
      user: this.configService.get('db.username') ?? 'postgres',
      password: this.configService.get('db.password') ?? 'postgres',
      database: this.configService.get('db.name') ?? 'my_app_dev',
    });
  }

  async onModuleInit() {
    const connection = {
      host: this.configService.get('db.redis_host') ?? 'redis',
      port: Number(this.configService.get('db.redis_port')) || 6379,
      password: this.configService.get('db.redis_password') || "myStrongPassword",
    };

    this.queueEvents = new QueueEvents(RETAILER_IMPORT_QUEUE_NAME, {
      connection,
    });

    this.worker = new Worker<RetailerImportJob>(
      RETAILER_IMPORT_QUEUE_NAME,
      (job) => this.handleRetailerImport(job),
      {
        concurrency: ImportWorkerService.CONCURRENCY,
        connection,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(
        `Retailer import job ${job.id} completed (${job.name})`,
      );
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `Retailer import job ${job?.id} failed: ${err.message}`,
        err.stack,
      );
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queueEvents?.close();
    await this.pool.end();
  }

  private async handleRetailerImport(job: Job<RetailerImportJob>) {
    const { filePath, originalName } = job.data;
    this.logger.log(
      `Processing retailer import job ${job.id} (${originalName})`,
    );

    let client: PoolClient | undefined;
    try {
      client = await this.pool.connect();
      await client.query('TRUNCATE TABLE retailer_staging');

      const copyQuery =
        'COPY retailer_staging (uid, name, phone, region_id, area_id, distributor_id, territory_id, points, routes, notes) FROM STDIN WITH (FORMAT csv, HEADER true, NULL \'\')';
      const dbStream = client.query(copyFrom(copyQuery));
      const fileStream = createReadStream(filePath);

      await pipelinePromise(fileStream, dbStream);

      await client.query('ANALYZE retailer_staging');

      const referenceIds = await this.loadReferenceSets(client);
      let insertedCount = 0;
      let updatedCount = 0;
      let rejectedCount = 0;

      while (true) {
        const { rows } = await client.query(
          `
            SELECT *
            FROM retailer_staging
            ORDER BY id
            LIMIT $1
          `,
          [ImportWorkerService.BATCH_SIZE],
        );

        if (!rows.length) {
          break;
        }

        const { validRows, invalidRows } = this.partitionRows(
          rows,
          referenceIds,
        );

        if (invalidRows.length) {
          await this.insertErrors(client, job.id?.toString() ?? null, invalidRows);
          rejectedCount += invalidRows.length;
        }

        if (validRows.length) {
          for (let i = 0; i < validRows.length; i += ImportWorkerService.CHUNK_SIZE) {
            const chunk = validRows.slice(
              i,
              i + ImportWorkerService.CHUNK_SIZE,
            );

            const { inserted, updated } = await this.upsertRetailers(client, chunk);
            insertedCount += inserted;
            updatedCount += updated;

            await this.clearResolvedErrors(
              client,
              chunk.map((row) => row.uid),
            );
          }
        }

        const processedIds = rows.map((row) => row.id);
        await client.query(
          'DELETE FROM retailer_staging WHERE id = ANY($1::uuid[])',
          [processedIds],
        );
      }

      this.logger.log(
        `Retailer import job ${job.id} summary -> inserted: ${insertedCount}, updated: ${updatedCount}, rejected: ${rejectedCount}`,
      );

      return {
        inserted: insertedCount,
        updated: updatedCount,
        rejected: rejectedCount,
      };
    } catch (error) {
      this.logger.error(
        `Retailer import job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error;
    } finally {
      await fs
        .unlink(filePath)
        .catch(() =>
          this.logger.warn(`Failed to remove temporary file ${filePath}`),
        );
      await client?.release();
    }
  }

  private async loadReferenceSets(client: PoolClient): Promise<ReferenceIdSets> {
    const [regions, areas, distributors, territories] = await Promise.all([
      client.query<{ id: string }>('SELECT id::text AS id FROM regions'),
      client.query<{ id: string }>('SELECT id::text AS id FROM areas'),
      client.query<{ id: string }>('SELECT id::text AS id FROM distributors'),
      client.query<{ id: string }>('SELECT id::text AS id FROM territories'),
    ]);

    return {
      regionIds: new Set(regions.rows.map((row) => row.id)),
      areaIds: new Set(areas.rows.map((row) => row.id)),
      distributorIds: new Set(distributors.rows.map((row) => row.id)),
      territoryIds: new Set(territories.rows.map((row) => row.id)),
    };
  }

  private partitionRows(
    rows: Record<string, unknown>[],
    referenceIds: ReferenceIdSets,
  ): {
    validRows: SanitizedRetailerRow[];
    invalidRows: InvalidRetailerRow[];
  } {
    const validRows: SanitizedRetailerRow[] = [];
    const invalidRows: InvalidRetailerRow[] = [];

    for (const row of rows) {
      const errors: string[] = [];

      const uid = this.normaliseString(row['uid']);
      if (!uid) {
        errors.push('uid is required');
      }

      const name = this.normaliseString(row['name']);
      const phone = this.normaliseString(row['phone']);
      const routes = this.normaliseString(row['routes']);
      const notes = this.normaliseString(row['notes']);

      const regionId = this.sanitiseForeignKey(
        row['region_id'],
        'region_id',
        referenceIds.regionIds,
        errors,
      );
      const areaId = this.sanitiseForeignKey(
        row['area_id'],
        'area_id',
        referenceIds.areaIds,
        errors,
      );
      const distributorId = this.sanitiseForeignKey(
        row['distributor_id'],
        'distributor_id',
        referenceIds.distributorIds,
        errors,
      );
      const territoryId = this.sanitiseForeignKey(
        row['territory_id'],
        'territory_id',
        referenceIds.territoryIds,
        errors,
      );

      const pointsValue = this.normaliseNumber(row['points']);
      if (pointsValue === null) {
        errors.push('points must be a numeric value');
      }

      if (errors.length) {
        invalidRows.push({
          uid,
          row: { ...row },
          error: errors.join('; '),
        });
        continue;
      }

      const ensuredPoints = pointsValue === null ? 0 : pointsValue;

      validRows.push({
        uid: uid!,
        name,
        phone,
        regionId,
        areaId,
        distributorId,
        territoryId,
        points: ensuredPoints,
        routes,
        notes,
      });
    }

    return { validRows, invalidRows };
  }

  private sanitiseForeignKey(
    value: unknown,
    label: string,
    validIds: Set<string>,
    errors: string[],
  ): string | null {
    const raw = this.normaliseString(value);
    if (!raw) {
      return null;
    }

    if (!ImportWorkerService.UUID_REGEX.test(raw)) {
      errors.push(`${label} must be a valid UUID`);
      return null;
    }

    if (!validIds.has(raw)) {
      errors.push(`${label} not found`);
      return null;
    }

    return raw;
  }

  private normaliseString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const normalised = String(value).trim();
    return normalised.length ? normalised : null;
  }

  private normaliseNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return 0;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }

    return numeric;
  }

  private async insertErrors(
    client: PoolClient,
    jobId: string | null,
    rows: InvalidRetailerRow[],
  ): Promise<void> {
    if (!rows.length) {
      return;
    }

    const uniqueUids = Array.from(
      new Set(
        rows
          .map((row) => row.uid)
          .filter(
            (uid): uid is string =>
              typeof uid === 'string' && uid.length > 0,
          ),
      ),
    );

    if (uniqueUids.length) {
      await client.query(
        'DELETE FROM retailer_errors WHERE uid IS NOT NULL AND uid = ANY($1::text[])',
        [uniqueUids],
      );
    }

    const params: unknown[] = [];
    const values = rows
      .map((row, index) => {
        const offset = index * 4;
        params.push(jobId, row.uid, JSON.stringify(row.row), row.error);
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}::jsonb, $${
          offset + 4
        })`;
      })
      .join(', ');

    await client.query(
      `INSERT INTO retailer_errors (job_id, uid, row_data, error) VALUES ${values}`,
      params,
    );
  }

  private async clearResolvedErrors(
    client: PoolClient,
    uids: string[],
  ): Promise<void> {
    if (!uids.length) {
      return;
    }

    await client.query(
      'DELETE FROM retailer_errors WHERE uid IS NOT NULL AND uid = ANY($1::text[])',
      [uids],
    );
  }

  private async upsertRetailers(
    client: PoolClient,
    rows: SanitizedRetailerRow[],
  ): Promise<{ inserted: number; updated: number }> {
    if (!rows.length) {
      return { inserted: 0, updated: 0 };
    }

    const params: unknown[] = [];
    const values = rows
      .map((row, index) => {
        const offset = index * 10;
        params.push(
          row.uid,
          row.name,
          row.phone,
          row.regionId,
          row.areaId,
          row.distributorId,
          row.territoryId,
          row.points,
          row.routes,
          row.notes,
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${
          offset + 4
        }, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${
          offset + 9
        }, $${offset + 10})`;
      })
      .join(', ');

    const result = await client.query(
      `
        INSERT INTO retailers (
          uid,
          name,
          phone,
          region_id,
          area_id,
          distributor_id,
          territory_id,
          points,
          routes,
          notes
        )
        VALUES ${values}
        ON CONFLICT (uid) DO UPDATE
        SET
          name = EXCLUDED.name,
          phone = EXCLUDED.phone,
          region_id = EXCLUDED.region_id,
          area_id = EXCLUDED.area_id,
          distributor_id = EXCLUDED.distributor_id,
          territory_id = EXCLUDED.territory_id,
          points = EXCLUDED.points,
          routes = EXCLUDED.routes,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
      `,
      params,
    );

    const inserted = result.rows.filter((row) => row.inserted).length;
    const totalRows = result.rowCount ?? 0;
    const updated = totalRows - inserted;

    return { inserted, updated };
  }
}
