import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
// import { UpdateFileSystemDto } from '../dto/update-file-system.dto';
import { CreateFileDto } from '../dto/create-file-system.dto';
import { DataSource, DeepPartial, EntityManager, In } from 'typeorm';
import type { Express } from 'express';
import { FileSystem } from '../entities/file-system.entity';
import { MulterConfigService } from './multer.config.service';
import path from 'path';
import { promises as fs } from 'fs';

@Injectable()
export class FileSystemService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly multerService: MulterConfigService,
  ) {}

  async createFilesFromMulter(
    files: Express.Multer.File[],
    userId?: string,
    manager?: EntityManager,
  ): Promise<FileSystem[]> {
    const fileDtos: CreateFileDto[] = files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      userId: userId || undefined,
    }));

    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      // ✅ Cast DTO to DeepPartial<FileSystem>
      const newFiles: FileSystem[] = fileDtos.map((dto) =>
        em!.create(FileSystem, dto as DeepPartial<FileSystem>),
      );

      const savedFiles = await Promise.all(newFiles.map((f) => em!.save(f)));
      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return savedFiles;
    } catch (error) {
      if (!manager) {
        await queryRunner?.rollbackTransaction();
      }
      const filePaths = files.map((file) => file.path);
      await this.multerService.rmvFiles(filePaths);
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async createFileFromMulter(
    file: Express.Multer.File,
    userId?: string,
    manager?: EntityManager,
  ): Promise<FileSystem> {
    const fileDto: CreateFileDto = {
      originalName: file.originalname,
      fileName: file.filename,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
      userId: userId || undefined,
    };
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const newFile: FileSystem = em!.create(FileSystem, {
        ...fileDto,
        path: file.path,
        user: { id: userId },
      });

      const savedFiles = await em!.save(newFile);

      if (!manager) {
        await queryRunner?.commitTransaction();
      }
      return savedFiles;
    } catch (error) {
      if (!manager) {
        await queryRunner?.rollbackTransaction();
      }
      if (file.path) {
        await this.multerService.rmvFile(file.path);
      }
      throw error;
    } finally {
      if (!manager) {
        await queryRunner?.release();
      }
    }
  }

  async updateFilePath(
    filePath: string,
    userId: string,
    manager?: EntityManager,
  ) {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }
    try {
      await fs.access(filePath);
      const newPath = filePath.replace('temp', userId);

      // ✅ Ensure destination directory exists
      const dir = path.dirname(newPath);
      await fs.mkdir(dir, { recursive: true });

      await fs.rename(filePath, newPath);
      await fs.access(newPath);

      console.log('file path renamed as==> ', newPath);

      const updateUserFile = await em
        ?.createQueryBuilder()
        .update(FileSystem)
        .set({
          path: newPath,
        })
        .where('user_id= :id', { id: userId })
        .execute();

      if (!updateUserFile) {
        throw new HttpException(
          'File db path update failed after registration',
          400,
        );
      }

      console.log('file path renamed and Db path updated');

      if (!manager) {
        await queryRunner?.commitTransaction();
      }
    } catch (error) {
      const newPath = filePath.replace('temp', userId);
      console.log('their is a problem in updating File Path');
      await this.multerService.rmvFile(newPath);
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

  //delete file by id
  async deleteFileById(fileId: string, manager?: EntityManager): Promise<void> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const file = await em!.findOne(FileSystem, { where: { id: fileId } });
      if (!file) {
        throw new NotFoundException(`File with id ${fileId} not found`);
      }

      // Delete DB record first
      await em!.remove(file);

      // Delete physical file from storage
      if (file.path) {
        await this.multerService.rmvFile(file.path);
      }

      if (!manager) {
        await queryRunner?.commitTransaction();
      }
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

  //delete multiple files by id's
  async deleteFilesByIds(
    fileIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    if (!fileIds?.length) return;

    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const files = await em!.find(FileSystem, { where: { id: In(fileIds) } });
      if (!files.length) {
        throw new NotFoundException(`No files found for the given IDs`);
      }

      // Remove from DB first
      await em!.remove(files);

      // Remove actual files from disk
      const filePaths = files.map((f) => f.path).filter(Boolean);
      if (filePaths.length) {
        await this.multerService.rmvFiles(filePaths);
      }

      if (!manager) {
        await queryRunner?.commitTransaction();
      }
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
}
