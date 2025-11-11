import { Test, TestingModule } from '@nestjs/testing';
import { ImportWorkerService } from './import-worker.service';

describe('ImportWorkerService', () => {
  let service: ImportWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportWorkerService],
    }).compile();

    service = module.get<ImportWorkerService>(ImportWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
