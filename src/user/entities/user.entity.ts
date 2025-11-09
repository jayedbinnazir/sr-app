import { Entity, Column, Unique, Index, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from 'src/common/entities/base.entity';
import { AppUser } from 'src/app_user/entities/app_user.entity';
import { FileSystem } from 'src/file-system/entities/file-system.entity';

@Entity('users')
@Index(['email']) // Index for email lookups
@Unique(['email']) // Ensure email uniqueness
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 30, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 30, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Exclude() // Exclude password from responses
  password?: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address?: string | null;

  //Google OAuth specific fields

  @Column({ type: 'varchar', length: 50, nullable: true })
  google_picture?: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null; // 'local', 'google', etc.

  @Column({ type: 'varchar', length: 50, nullable: true })
  providerId: string | null; // Google ID, etc.

  @Column({ type: 'boolean', default: false, nullable: true })
  emailVerified?: boolean | null;

  //Relations
  @OneToMany(() => AppUser, (appUser) => appUser.user, {
    cascade: ['soft-remove', 'insert', 'recover', 'remove'],
  })
  appUsers: AppUser[];

  // Multiple files relationship (replaces the single profile_picture)
  @OneToMany(() => FileSystem, (file) => file.user, {
    cascade: ['insert', 'update', 'remove', 'soft-remove', 'recover'],
    nullable: true,
  })
  profile_pictures?: FileSystem[];
}
