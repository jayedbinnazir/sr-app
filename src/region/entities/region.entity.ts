import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Area } from 'src/area/entities/area.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

@Entity('regions')
@Unique('UQ_REGION_NAME', ['name'])
@Index('IDX_REGION_NAME', ['name'])
export class Region extends BaseEntity {
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @OneToMany(() => Area, (area) => area.region, { cascade: false })
  areas: Area[];

  @OneToMany(() => Retailer, (retailer) => retailer.region, {
    cascade: false,
    orphanedRowAction: 'nullify',
  })
  retailers: Retailer[];
}

