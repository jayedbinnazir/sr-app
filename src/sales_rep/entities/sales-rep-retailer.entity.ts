import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { SalesRep } from './sales_rep.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

@Entity('sales_rep_retailers')
@Unique('UQ_SALES_REP_RETAILER', ['sales_rep_id', 'retailer_id'])
@Index('IDX_SRR_SALES_REP', ['sales_rep_id'])
@Index('IDX_SRR_RETAILER', ['retailer_id'])
export class SalesRepRetailer extends BaseEntity {
  @Column({ type: 'uuid', name: 'sales_rep_id' })
  sales_rep_id: string;

  @Column({ type: 'uuid', name: 'retailer_id' })
  retailer_id: string;

  @Column({ type: 'timestamptz', name: 'assigned_at', default: () => 'NOW()' })
  assignedAt: Date;

  @Column({ type: 'uuid', name: 'assigned_by', nullable: true })
  assignedBy: string | null;

  @ManyToOne(() => SalesRep, (salesRep) => salesRep.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sales_rep_id' })
  salesRep: SalesRep;

  @ManyToOne(() => Retailer, (retailer) => retailer.salesRepAssignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'retailer_id' })
  retailer: Retailer;
}

