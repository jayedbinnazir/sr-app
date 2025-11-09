import { Module } from '@nestjs/common';
import { AppUserService } from './app_user.service';
import { AppUserController } from './app_user.controller';

@Module({
  controllers: [AppUserController],
  providers: [AppUserService],
})
export class AppUserModule {}
