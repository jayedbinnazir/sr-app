import { BaseEntity } from 'src/common/entities/base.entity';
import { User } from 'src/user/entities/user.entity';
import { Entity, Column, ManyToOne, JoinColumn, RelationId } from 'typeorm';

@Entity('files')
export class FileSystem extends BaseEntity {
  @Column({ type: 'varchar' })
  originalName: string; // original file name

  @Column({ type: 'varchar' })
  fileName: string; // stored filename

  @Column({ type: 'varchar' })
  path: string; // file path on disk

  @Column({ type: 'varchar' })
  mimetype: string;

  @Column('bigint')
  size: number;

  @ManyToOne(() => User, (user) => user.profile_pictures, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({
    name: 'user_id',
    referencedColumnName: 'id',
  })
  user?: User;

  @RelationId((file: FileSystem) => file.user)
  user_id?: string;
}
