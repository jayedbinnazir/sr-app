import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, QueueEvents } from 'bullmq';
import { RETAILER_IMPORT_QUEUE_NAME } from 'src/import/import.constants';
import { RetailerImportJob } from 'src/import/types/retailer-import-job.interface';
import { createReadStream, promises as fs } from 'fs';
import { pipeline as pipelinePromise } from 'stream/promises';
import { Pool, PoolClient } from 'pg';
import copyStream from 'pg-copy-streams';


const copyFrom = copyStream.from;

@Injectable()
export class ImportWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ImportWorkerService.name);
  private worker?: Worker<RetailerImportJob>;
  private queueEvents?: QueueEvents;
  private pool: Pool;

  constructor(private readonly configService: ConfigService) {
    const db = this.configService.get('db') as Record<string, unknown>;
    this.pool = new Pool({
      host: (db?.host as string) ?? 'localhost',
      port: Number(db?.port ?? 5432),
      user: (db?.username as string) ?? 'postgres',
      password: (db?.password as string) ?? undefined,
      database: (db?.name as string) ?? 'postgres',
    });
  }

  async onModuleInit() {
    const dbConfig = this.configService.get('db') as Record<string, unknown>;
    const connection = {
      host: dbConfig?.redis_host as string,
      port: Number(dbConfig?.redis_port ?? 6379),
      password: (dbConfig?.redis_password as string) || undefined,
      tls:
        dbConfig?.redis_tls && dbConfig.redis_tls === 'true'
          ? {}
          : undefined,
    };

    this.queueEvents = new QueueEvents(RETAILER_IMPORT_QUEUE_NAME, {
      connection,
    });

    this.worker = new Worker<RetailerImportJob>(
      RETAILER_IMPORT_QUEUE_NAME,
      (job) => this.handleRetailerImport(job),
      {
        concurrency: 1,
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
      await client.query('BEGIN');
      await client.query('TRUNCATE TABLE retailer_staging');

      const copyQuery =
        'COPY retailer_staging (uid, name, phone, region_id, area_id, distributor_id, territory_id, points, routes, notes) FROM STDIN WITH (FORMAT csv, HEADER true, NULL \'\')';
      const dbStream = client.query(copyFrom(copyQuery));
      const fileStream = createReadStream(filePath);

      await pipelinePromise(fileStream, dbStream);

      await client.query('ANALYZE retailer_staging');

      const updateResult = await client.query(
        `
          UPDATE retailers r
          SET
            name = s.name,
            phone = s.phone,
            region_id = NULLIF(s.region_id::text, '')::uuid,
            area_id = NULLIF(s.area_id::text, '')::uuid,
            distributor_id = NULLIF(s.distributor_id::text, '')::uuid,
            territory_id = NULLIF(s.territory_id::text, '')::uuid,
            points = COALESCE(s.points, 0),
            routes = s.routes,
            notes = s.notes,
            updated_at = NOW()
          FROM retailer_staging s
          WHERE r.uid = s.uid
            AND s.uid IS NOT NULL
            AND s.uid <> ''
        `,
      );

      const insertResult = await client.query(
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
          SELECT
            uid,
            name,
            phone,
            NULLIF(region_id::text, '')::uuid,
            NULLIF(area_id::text, '')::uuid,
            NULLIF(distributor_id::text, '')::uuid,
            NULLIF(territory_id::text, '')::uuid,
            COALESCE(points, 0),
            routes,
            notes
          FROM retailer_staging s
          WHERE uid IS NOT NULL
            AND uid <> ''
            AND NOT EXISTS (
              SELECT 1 FROM retailers r WHERE r.uid = s.uid
            )
        `,
      );

      await client.query('TRUNCATE TABLE retailer_staging');
      await client.query('COMMIT');

      this.logger.log(
        `Retailer import job ${job.id} updated ${updateResult.rowCount} rows and inserted ${insertResult.rowCount} rows`,
      );
    } catch (error) {
      if (client) {
        await client.query('ROLLBACK');
      }
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
}
