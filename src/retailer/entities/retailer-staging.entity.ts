import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('retailer_staging')
@Index('IDX_RETAILER_STAGING_UID', ['uid'])
export class RetailerStaging {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  uid: string | null;

  @Column({ type: 'varchar', length: 180, nullable: true })
  name: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  region_id: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  area_id: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  distributor_id: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  territory_id: string | null;

  @Column({ type: 'integer', nullable: true })
  points: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  routes: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;
}


