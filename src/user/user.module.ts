import { Module } from '@nestjs/common';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { FileSystem } from 'src/file-system/entities/file-system.entity';
import { RoleModule } from 'src/role/role.module';
import { FileSystemModule } from 'src/file-system/file-system.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), RoleModule, FileSystemModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
