// src/entities/file-system.entity.ts
import { BaseEntity } from 'src/common/entities/base.entity';
import { Entity, Column } from 'typeorm';

@Entity('bucker-files')
export class BucketFiles extends BaseEntity {
  @Column()
  originalName: string;

  @Column()
  path: string; // S3 key or file path

  @Column({ nullable: true })
  url: string; // S3 URL or file URL

  @Column()
  mimetype: string;

  @Column('int')
  size: number;

  @Column({ nullable: true })
  userId: string;

  // S3 specific fields
  @Column({ nullable: true })
  s3Key: string; // The S3 object key

  @Column({ nullable: true })
  s3Etag: string; // S3 ETag

  @Column({ nullable: true })
  s3VersionId: string; // S3 version ID if versioning is enabled

  @Column({ default: 's3' }) // 's3' or 'local'
  storageType: string;
}
