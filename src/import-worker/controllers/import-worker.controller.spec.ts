import { Test, TestingModule } from '@nestjs/testing';
import { ImportWorkerController } from './import-worker.controller';
import { ImportWorkerService } from '../services/import-worker.service';


describe('ImportWorkerController', () => {
  let controller: ImportWorkerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportWorkerController],
      providers: [ImportWorkerService],
    }).compile();

    controller = module.get<ImportWorkerController>(ImportWorkerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
