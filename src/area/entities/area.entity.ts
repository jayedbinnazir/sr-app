import {
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
import { Territory } from 'src/territory/entities/territory.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

@Entity('areas')
@Unique('UQ_AREA_REGION_NAME', ['name', 'region_id'])
@Index('IDX_AREA_NAME', ['name'])
@Index('IDX_AREA_REGION', ['region_id'])
export class Area extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'uuid' })
  region_id: string;

  @ManyToOne(() => Region, (region) => region.areas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @OneToMany(() => Territory, (territory) => territory.area, { cascade: false })
  territories: Territory[];

  @OneToMany(() => Retailer, (retailer) => retailer.area, { cascade: false })
  retailers: Retailer[];
}

