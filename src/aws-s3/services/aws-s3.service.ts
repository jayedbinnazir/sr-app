// src/aws/aws-s3.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DataSource, DeepPartial, EntityManager } from 'typeorm';
import { BucketFiles } from '../entities/aws-s3.entity';
import { CreateBucketFileDto } from '../dto/create-aws-s3.dto';
import * as fs from 'node:fs';

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

export interface UploadFileResponse {
  key: string;
  url: string;
  etag: string;
  versionId?: string;
}

@Injectable()
export class AwsS3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.s3Client = new S3Client({
      region: configService.get<string>('s3.region')!,
      credentials: {
        accessKeyId: configService.get<string>('s3.access_key')!,
        secretAccessKey: configService.get<string>('s3.secret_key')!,
      },
    });

    this.bucketName = configService.get<string>('s3.bucket_name')!;
  }

  /**
   * Upload file to S3
   */
  async uploadBucketFile(
    file: Express.Multer.File,
    userId?: string,
    manager?: EntityManager,
  ): Promise<BucketFiles> {
    console.log('service received file -->', file);

    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      const key = file.path;

      console.log({
        's3-key': key,
      });

      const fileStream = fs.createReadStream(file.path);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer ?? fileStream,
        ContentType: file.mimetype,
        ContentLength: file.size,
        Metadata: {
          originalName: file.originalname,
          uploadedBy: userId || 'anonymous', // You can add user ID here
        },
      });

      const result = await this.s3Client.send(command);
      const url = await this.getSignedUrl(key, 3600);

      const s3fileDto: CreateBucketFileDto = {
        originalName: file.originalname,
        path: file.path,
        url: url,
        mimetype: file.mimetype,
        size: file.size,
        userId: userId,
        s3Key: key,
        s3Etag: result.ETag,
        s3VersionId: result.VersionId,
        storageType: 's3',
      };

      const newS3File = em?.create(
        BucketFiles,
        s3fileDto as DeepPartial<BucketFiles>,
      );

      const newBucketFile = await em!.save(newS3File);

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      if (file.path) {
        await this.rmvLocalFile(file.path);
      }

      return newBucketFile!;
    } catch (error) {
      if (!manager) {
        await queryRunner?.rollbackTransaction();
      }
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadBucketFiles(
    files: Express.Multer.File[],
    userId?: string,
    manager?: EntityManager,
  ): Promise<BucketFiles[]> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
    }

    try {
      // Run uploads concurrently
      const uploadedFiles = await Promise.all(
        files.map(async (file) => {
          const key = file.path;

          console.log({ 's3-key': key });

          const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: file.buffer,
            ContentType: file.mimetype,
            ContentLength: file.size,
            Metadata: {
              originalName: file.originalname,
              uploadedBy: userId || 'anonymous',
            },
          });

          // Upload file to S3
          const result = await this.s3Client.send(command);

          // Build DTO
          const s3fileDto: CreateBucketFileDto = {
            originalName: file.originalname,
            path: file.path,
            url: undefined,
            mimetype: file.mimetype,
            size: file.size,
            userId,
            s3Key: key,
            s3Etag: result.ETag,
            s3VersionId: result.VersionId,
            storageType: 's3',
          };

          // Save to DB
          const newS3File = em!.create(
            BucketFiles,
            s3fileDto as DeepPartial<BucketFiles>,
          );
          const savedFile = await em!.save(newS3File);

          // Remove local temp file
          await this.rmvLocalFile(file.path);

          return savedFile;
        }),
      );

      return uploadedFiles;
    } catch (error) {
      console.error('Batch S3 upload failed:', error);
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  /**
   * Generate pre-signed URL for file upload
   */
  // async generatePresignedUploadUrl(
  //   fileName: string,
  //   contentType: string,
  //   folder?: string,
  //   expiresIn: number = 3600, // 1 hour
  // ): Promise<string> {
  //   try {
  //     const key =

  //     return await getSignedUrl(this.s3Client, command, { expiresIn });
  //   } catch (error) {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     console.log(`Failed to generate presigned URL: ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * Generate pre-signed URL for file download
   */
  // async generatePresignedDownloadUrl(
  //   key: string,
  //   expiresIn: number = 3600, // 1 hour
  // ): Promise<string> {
  //   try {
  //     const command = new GetObjectCommand({
  //       Bucket: this.bucketName,
  //       Key: key,
  //     });

  //     return await getSignedUrl(this.s3Client, command, { expiresIn });
  //   } catch (error) {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     console.log(`Failed to generate download URL: ${error.message}`);
  //     throw error;
  //   }
  // }

  /**
   * Download file from S3
   */
  // async downloadFile(key: string): Promise<Buffer> {
  //   try {
  //     const command = new GetObjectCommand({
  //       Bucket: this.bucketName,
  //       Key: key,
  //     });

  //     const response = await this.s3Client.send(command);
  //     return await this.streamToBuffer(response.Body);
  //   } catch (error) {
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     console.log(`Failed to download file from S3: ${error.message}`);
  //     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  //     throw new Error(`File download failed: ${error.message}`);
  //   }
  // }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`File deleted successfully: ${key}`);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`Failed to delete file from S3: ${error.message}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map((key) => this.deleteFile(key));
      await Promise.all(deletePromises);
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`Failed to delete files from S3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as S3ServiceException).$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(prefix?: string, maxKeys: number = 1000) {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys,
      });

      const response = await this.s3Client.send(command);
      return response.Contents || [];
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.log(`Failed to list files from S3: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      stream.on('error', reject);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private async getSignedUrl(
    key: string,
    expiresInSeconds = 0,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const signedUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
    return signedUrl; // valid for 1 hour
  }

  // Remove single file
  async rmvLocalFile(filePath: string): Promise<void> {
    try {
      console.log(`Deleting file from ${filePath}`);
      await fs.promises.unlink(filePath);
      console.log(`Successfully deleted file from ${filePath}`);
    } catch (error) {
      console.error(`Error deleting file from ${filePath}:`, error);
      // Don't throw error for file not found - it might already be deleted
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(
          `Error deleting file from ${filePath}: ${(error as Error).message}`,
        );
      }
    }
  }
}
