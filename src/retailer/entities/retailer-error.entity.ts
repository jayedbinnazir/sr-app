import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity('retailer_errors')
export class RetailerError extends BaseEntity {
  @Column({ type: 'varchar', length: 50, nullable: true })
  uid: string | null;

  @Column({ type: 'varchar', length: 64, name: 'job_id', nullable: true })
  jobId: string | null;

  @Column({ type: 'jsonb', name: 'row_data' })
  rowData: Record<string, unknown>;

  @Column({ type: 'text' })
  error: string;
}


