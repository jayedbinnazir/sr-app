import { Test, TestingModule } from '@nestjs/testing';
import { AppUserController } from './app_user.controller';
import { AppUserService } from './app_user.service';

describe('AppUserController', () => {
  let controller: AppUserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppUserController],
      providers: [AppUserService],
    }).compile();

    controller = module.get<AppUserController>(AppUserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
