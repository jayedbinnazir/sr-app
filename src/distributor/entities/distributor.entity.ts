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
import { Retailer } from 'src/retailer/entities/retailer.entity';
import { Area } from 'src/area/entities/area.entity';

@Entity('distributors')
@Unique('UQ_DISTRIBUTOR_NAME', ['name'])
@Index('IDX_DISTRIBUTOR_NAME', ['name'])
@Index('IDX_DISTRIBUTOR_AREA', ['area_id'])
export class Distributor extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'uuid', nullable: true })
  area_id: string | null;

  @ManyToOne(() => Area, (area) => area.distributors, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'area_id' })
  area: Area | null;

  @OneToMany(() => Retailer, (retailer) => retailer.distributor, {
    cascade: false,
  })
  retailers: Retailer[];
}

