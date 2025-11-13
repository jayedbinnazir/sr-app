## Backend Scaling Approach (Simplified)

### Containerization & Load Balancing
- The backend API runs in multiple containers behind a single Nginx server.
- Using Docker Compose, we can quickly add more containers for the API.
- This setup allows the system to handle more traffic by distributing requests across multiple containers.

### Asynchronous Workflows
- Heavy tasks, like importing large CSV files or sending notifications, run in the background using queues (BullMQ + Redis).
- This keeps the API fast for users while still handling heavy workloads.
- Workers can be scaled separately if more processing power is needed.

### Database Strategy
- PostgreSQL stores all the data with proper validation and transactional safety.
- Important columns (region, area, territory, distributor) are indexed for fast lookups.
- The system can later be extended to use read replicas or partitioning to handle more data efficiently.

### Caching Layer
- Redis caches frequently read data to reduce database load and improve response times.
- Cached data is updated whenever relevant information changes, keeping it accurate.

### Streaming Imports
- Large CSV files are processed using streams and pushed directly into PostgreSQL.
- This keeps memory usage low and allows the system to handle millions of records.
- The pipeline can be split across multiple workers if needed for higher throughput.
# SR App - Local Development Setup

## Key Features

- Bulk ETL importer handles up to ~1 million retailer rows via [`http://localhost:8080/static/import.html`](http://localhost:8080/static/import.html); upload the generated CSV and the pipeline (streams + `fast-csv` + `pg-copy-streams`) finishes in ~3–4 minutes. Ready-made datasets live in `./csv_zip/retailers_1million.rar` and `./csv_zip/retailers_100.rar`, or regenerate them anytime from the project root with `npm run million` and `npm run hundred`.
- Hierarchical bulk operations: assign ≤70 retailers to a sales rep per request and perform area→region or territory→area assignments with conflict checks, indexing, and consistent search/filter support.
- Data performance layer: reusable transactional query helpers, strategic indexing, Redis caching on hot endpoints, BullMQ job queues on Redis, and socket-based notifications using the Redis adapter.
- Container-first runtime: `docker-compose` manages Postgres, Redis, Kafka, and Nginx; the API runs as three replicas behind the bundled Nginx load balancer for local HA testing.
- Hardened auth: JWT cookies + Bearer headers with optional refresh-token extension, giving both browser and API clients flexibility.

This guide explains how to start the **SR App** project locally with all dependencies, including Docker services, Kafka, PostgreSQL, and Redis.

**Database model reference:** [https://app.eraser.io/workspace/6FoRUT8hsNqWraJpHwno?origin=share](https://app.eraser.io/workspace/6FoRUT8hsNqWraJpHwno?origin=share)

---

## Setup (Desktop)

> **Note:** The project was last verified with `npm` version **11.6.1**.

1. **Clone the repository**
   ```bash
   git clone https://github.com/jayedbinnazir/sr-app.git
   cd sr-app
   ```

2. **Start Dockerized dependencies**
   - Ensure Docker Desktop is running.
   - In one terminal:
     ```bash
     npm run docker:service
     ```
     This launches PostgreSQL, pgAdmin, Redis, and RedisInsight.
   - In a second terminal:
     ```bash
     npm run docker:kafka
     ```
     This brings up the Kafka brokers. Give the containers a moment and verify they’re all healthy.

3. **Build and run the API stack**
   ```bash
   npm run docker:build
   ```
   This spins up nginx as a load balancer plus three replicas of the NestJS application.

4. **Access points**
   - API base URL (via reverse proxy): `http://localhost:8080/api/v1`
   - Swagger UI: `http://localhost:8080/docs`
   - Direct container port (if you need it): `http://localhost:5000`
   - pgAdmin: `http://localhost:5050`  
      Credentials: `admin@local.dev / admin` (see `.env.dev` for overrides)  
      Database connection: host `db` (container name), port `5432`, database `my_app_dev`, user `postgres`, password `postgres`
   - RedisInsight: `http://localhost:5540`

   Look-up reference of docker files:
   - `docker-compose.dev.yml` → app (API + Nginx)
   - `docker-compose.service.yml` → all database services
   - `docker-compose.kafka.yml` → Kafka stack
   - `Dockerfile.dev` → builds the application environment
   - `.env.dev` → primary environment configuration

5. **Seed demo data**
   ```bash
   npm run seed:docker
   ```
   The seeder provisions:
   - 5 regions
   - 10 areas per region (50 total)
   - 10 territories per area (500 total)
   - 3 distributors per area (150 total)
   - 3 retailers per territory (1,500 total) linked to their area/region/distributor
   - 30 sales representatives

   Bulk retailer uploads (up to ~1 million rows) are supported via the importer interface at `http://localhost:8080/static/import.html`.

7. **Run region unit tests**
   ```bash
   npm run test:region
   ```

6. **Operational tips**
   - Keep the `docker:service` and `docker:kafka` terminals running while you work.
   - If Docker restarts, rerun those scripts before rebuilding.
   - Use the Swagger UI for endpoint exploration and example payloads.

---

## API Reference

Swagger UI (with auth-aware examples) is available at [`http://localhost:8080/docs`](http://localhost:8080/docs). The backend is versioned under the `/api/v1` prefix unless explicitly stated.

### Region Management (admin)
- `POST /v1/admin/regions`
- `GET /v1/admin/regions`
- `GET /v1/admin/regions/search`
- `GET /v1/admin/regions/count`
- `GET /v1/admin/regions/:id/areas`
- `GET /v1/admin/regions/:id/areas/count`
- `POST /v1/admin/regions/:id/areas/assign`
- `POST /v1/admin/regions/:id/areas/unassign`
- `POST /v1/admin/sales-reps/:salesRepId/retailers`
- `POST /v1/admin/sales-reps/:salesRepId/retailers/bulk`
- `POST /v1/admin/sales-reps/:salesRepId/retailers/unassign`
- `PATCH /v1/admin/regions/:id`
- `DELETE /v1/admin/regions/:id`

### Area Management (admin)
- `POST /v1/admin/areas`
- `GET /v1/admin/areas`
- `GET /v1/admin/areas/search`
- `GET /v1/admin/areas/total-count`
- `GET /v1/admin/areas/:id/territories`
- `GET /v1/admin/areas/:id/territories/total-count`
- `POST /v1/admin/areas/:id/territories/assign`
- `POST /v1/admin/areas/:id/territories/unassign`
- `PATCH /v1/admin/areas/:id`
- `DELETE /v1/admin/areas/:id`

### Territory Management (admin)
- `POST /v1/admin/territories`
- `GET /v1/admin/territories`
- `GET /v1/admin/territories/search`
- `GET /v1/admin/territories/total-count`
- `PATCH /v1/admin/territories/:id`
- `DELETE /v1/admin/territories/:id`

### Distributor Management (admin)
- `POST /v1/admin/distributors`
- `GET /v1/admin/distributors`
- `GET /v1/admin/distributors/search`
- `GET /v1/admin/distributors/count`
- `GET /v1/admin/distributors/:id`
- `PATCH /v1/admin/distributors/:id`
- `DELETE /v1/admin/distributors/:id`

### Distributor Lookup (sales rep)
- `GET /v1/sales-reps/distributors/search`
- `GET /v1/sales-reps/distributors/count`

### Sales Rep Self-Service (requires sales_rep role)
- `GET /v1/sales-reps/retailers`
- `GET /v1/sales-reps/retailers/search`
- `GET /v1/sales-reps/retailers/filter`
- `GET /v1/sales-reps/retailers/count`
- `GET /v1/sales-reps/retailers/:retailerId`
- `PATCH /v1/sales-reps/retailers/:retailerId`

### Sales Rep Administration (admin)
- `GET /v1/admin/sales-reps/:salesRepId/retailers`
- `GET /v1/admin/sales-reps/:salesRepId/retailers/filter`
- `GET /v1/admin/sales-reps/:salesRepId/retailers/count`
- `GET /v1/admin/sales-reps/retailers/unassigned`
- `GET /v1/admin/sales-reps/retailers/search`
- `GET /v1/admin/sales-reps/retailers/filter`
- `GET /v1/admin/sales-reps/retailers/total-count`
- `GET /v1/admin/sales-reps/retailers/:retailerId`
- `POST /v1/admin/sales-reps/:salesRepId/retailers`
- `POST /v1/admin/sales-reps/:salesRepId/retailers/bulk`
- `POST /v1/admin/sales-reps/:salesRepId/retailers/unassign`

### Retailer Management (admin)
- `GET /v1/admin/retailers`
- `GET /v1/admin/retailers/search`
- `GET /v1/admin/retailers/count/total`
- `GET /v1/admin/retailers/:id`
- `POST /v1/admin/retailers`
- `PATCH /v1/admin/retailers/:id`
- `DELETE /v1/admin/retailers/:id`

### Utility
- `GET /caching` – Redis connectivity & caching test endpoint (non-versioned; dev-only)