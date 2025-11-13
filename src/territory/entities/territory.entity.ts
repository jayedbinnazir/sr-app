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
import { Area } from 'src/area/entities/area.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

@Entity('territories')
@Unique('UQ_TERRITORY_AREA_NAME', ['name', 'area_id'])
@Index('IDX_TERRITORY_NAME', ['name'])
@Index('IDX_TERRITORY_AREA', ['area_id'])
export class Territory extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'uuid' })
  area_id: string;

  @ManyToOne(() => Area, (area) => area.territories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @OneToMany(() => Retailer, (retailer) => retailer.territory, {
    cascade: false,
  })
  retailers: Retailer[];
}

