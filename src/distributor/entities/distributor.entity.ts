import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

@Entity('distributors')
@Unique('UQ_DISTRIBUTOR_NAME', ['name'])
@Index('IDX_DISTRIBUTOR_NAME', ['name'])
export class Distributor extends BaseEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @OneToMany(() => Retailer, (retailer) => retailer.distributor, {
    cascade: false,
  })
  retailers: Retailer[];
}

