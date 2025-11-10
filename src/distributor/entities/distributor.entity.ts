import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';
import { Region } from 'src/region/entities/region.entity';

@Entity('distributors')
@Unique('UQ_DISTRIBUTOR_NAME', ['name'])
@Index('IDX_DISTRIBUTOR_NAME', ['name'])
@Index('IDX_DISTRIBUTOR_REGION', ['region_id'])
export class Distributor extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;


  @Column({ type: 'uuid', nullable: true })
  region_id: string | null;


  @ManyToOne(() => Region, (region) => region.distributors, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'region_id' })
  region: Region;


  @OneToMany(() => Retailer, (retailer) => retailer.distributor, {
    cascade: false,
  })
  retailers: Retailer[];
}

