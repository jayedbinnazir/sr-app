import { Injectable } from '@nestjs/common';
import {
  MulterModuleOptions,
  MulterOptionsFactory,
} from '@nestjs/platform-express';
import multer from 'multer';
import path from 'node:path';
import { Request } from 'express';
import * as fs from 'node:fs';
import { ConfigService } from '@nestjs/config';

interface AuthRequest extends Request {
  user?: {
    id: string | number;
    // add more fields if needed, e.g. email, roles, etc.
  };
}

const dest = path.resolve(process.cwd() + '/uploads');

const storage = multer.diskStorage({
  destination: (req: AuthRequest, file, cb) => {
    try {
      const id = req.user?.id ?? 'temp';
      const uploadPath = path.resolve(`${dest}/${id}/${file.fieldname}`);
      console.log({
        dest,
        uploadPath,
      });
      // ✅ Try to create directory
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('directry created');

      // ✅ No errors → pass folder path
      cb(null, uploadPath);
    } catch (err) {
      // ❌ If any error occurs, Multer must receive it
      cb(
        new Error(
          `Failed to create upload directory: ${(err as Error).message}`,
        ),
        '',
      );
    }
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now();
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});

@Injectable()
export class MulterConfigService implements MulterOptionsFactory {
  constructor(private configService: ConfigService) {}

  createMulterOptions(): Promise<MulterModuleOptions> | MulterModuleOptions {
    return {
      storage: storage,
      fileFilter: (req, file, cb) => {
        cb(null, true);
      },
      limits: {
        fileSize: 2 * 1024 * 1024 * 1024, // 2GB in bytes
      },
    };
  }

  // Remove single file
  async rmvFile(filePath: string): Promise<void> {
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

  // Remove multiple files
  async rmvFiles(filePaths: string[]): Promise<void> {
    try {
      console.log(`Deleting ${filePaths.length} files`);

      const deletePromises = filePaths.map((filePath) =>
        this.rmvFile(filePath),
      );
      await Promise.all(deletePromises);

      console.log(`Successfully deleted ${filePaths.length} files`);
    } catch (error) {
      console.error(`Error deleting files:`, error);
      throw new Error(`Error deleting files: ${(error as Error).message}`);
    }
  }
}
