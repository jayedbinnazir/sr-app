import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Region } from 'src/region/entities/region.entity';
import { Area } from 'src/area/entities/area.entity';
import { Distributor } from 'src/distributor/entities/distributor.entity';
import { Territory } from 'src/territory/entities/territory.entity';
import { SalesRepRetailer } from 'src/sales_rep/entities/sales-rep-retailer.entity';

@Entity('retailers')
@Unique('UQ_RETAILER_UID', ['uid'])
@Index('IDX_RETAILER_UID', ['uid'])
@Index('IDX_RETAILER_NAME', ['name'])
@Index('IDX_RETAILER_PHONE', ['phone'])
@Index('IDX_RETAILER_REGION', ['region_id'])
@Index('IDX_RETAILER_AREA', ['area_id'])
@Index('IDX_RETAILER_DISTRIBUTOR', ['distributor_id'])
@Index('IDX_RETAILER_TERRITORY', ['territory_id'])
@Check(`"points" >= 0`)
export class Retailer extends BaseEntity {
  @Column({ type: 'varchar', length: 50 })
  uid: string;

  @Column({ type: 'varchar', length: 180 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'uuid', nullable: true })
  region_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  distributor_id: string | null;

  @Column({ type: 'uuid', nullable: true })
  territory_id: string | null;

  @Column({ type: 'integer', default: 0 })
  points: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  routes: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;


  // Relations
  // ondeletion of retailor we will not delete the region, area, distributor, territory
  // so onDelete will be SET NULL
  @ManyToOne(() => Region, (region) => region.retailers, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @ManyToOne(() => Area, (area) => area.retailers, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @ManyToOne(() => Distributor, (distributor) => distributor.retailers, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'distributor_id' })
  distributor: Distributor;

  @ManyToOne(() => Territory, (territory) => territory.retailers, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'territory_id' })
  territory: Territory;

  @OneToMany(
    () => SalesRepRetailer,
    (salesRepRetailer) => salesRepRetailer.retailer,
    {
      cascade: ['remove'],
    },
  )
  salesRepAssignments: SalesRepRetailer[];
}

