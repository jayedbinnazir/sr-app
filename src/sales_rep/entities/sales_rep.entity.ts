import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';
import { SalesRepRetailer } from './sales-rep-retailer.entity';
import { User } from 'src/user/entities/user.entity';


@Entity('sales_reps')
@Unique('UQ_SALES_REP_USERNAME', ['username'])
@Unique('UQ_SALES_REP_USER_ID', ['user_id'])
@Index('IDX_SALES_REP_USERNAME', ['username'])
@Index('IDX_SALES_REP_PHONE', ['phone'])
export class SalesRep extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  user_id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 60 })
  username: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'timestamptz', name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @OneToMany(() => SalesRepRetailer, (assignment) => assignment.salesRep, {
    cascade: ['remove'],
  })
  assignments: SalesRepRetailer[];

  @BeforeInsert()
  @BeforeUpdate()
  normalizeUsername(): void {
    if (this.username) {
      this.username = this.username.trim().toLowerCase();
    }
  }
}