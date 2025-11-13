import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { SalesRep } from './sales_rep.entity';
import { Retailer } from 'src/retailer/entities/retailer.entity';

@Entity('sales_rep_retailers')
@Index('IDX_SRR_SALES_REP', ['sales_rep_id'])
@Index('IDX_SRR_RETAILER', ['retailer_id'])
@Index('UQ_ACTIVE_RETAILER_ASSIGNMENT', ['retailer_id'], {
  unique: true,
  where: `"is_active" = true`,
})
@Index('UQ_ACTIVE_SALES_REP_RETAILER', ['sales_rep_id', 'retailer_id'], {
  unique: true,
  where: `"is_active" = true`,
})
export class SalesRepRetailer extends BaseEntity {
  @Column({ type: 'uuid', name: 'sales_rep_id' })
  sales_rep_id: string;

  @Column({ type: 'uuid', name: 'retailer_id' })
  retailer_id: string;

  @Column({ type: 'timestamptz', name: 'assigned_at', default: () => 'NOW()' })
  assignedAt: Date;

  @Column({ type: 'uuid', name: 'assigned_by', nullable: true })
  assignedBy: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', name: 'unassigned_at', nullable: true })
  unassignedAt: Date | null;

  @Column({ type: 'uuid', name: 'unassigned_by', nullable: true })
  unassignedBy: string | null;

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

