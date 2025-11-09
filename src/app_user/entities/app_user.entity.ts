import { User } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';
import { Entity, ManyToOne, JoinColumn, Index, Column } from 'typeorm';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity('app_users')
@Index('IDX_USER_ROLE_USER_ID', ['user_id'])
@Index('IDX_USER_ROLE_ROLE_ID', ['role_id'])
@Index('IDX_USER_ROLE_COMPOSITE', ['user_id', 'role_id'], { unique: true })
export class AppUser extends BaseEntity {
  @Column({ type: 'uuid', name: 'user_id' })
  user_id: string;

  @ManyToOne(() => User, (user) => user.appUsers, {
    onDelete: 'CASCADE',
    lazy: true,
  })
  @JoinColumn({ name: 'user_id', referencedColumnName: 'id' })
  user: Promise<User>;

  @Column({ type: 'uuid', name: 'role_id' })
  role_id: string;

  @ManyToOne(() => Role, (role) => role.appUsers, {
    onDelete: 'SET NULL',
    lazy: true,
  })
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role: Promise<Role>;
}
