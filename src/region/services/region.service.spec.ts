import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { CreateRegionDto } from '../dto/create-region.dto';
import { UpdateRegionDto } from '../dto/update-region.dto';
import { Region } from '../entities/region.entity';
import { RegionService } from './region.service';

type MockedQueryRunner = Pick<
  QueryRunner,
  | 'manager'
  | 'connect'
  | 'startTransaction'
  | 'commitTransaction'
  | 'rollbackTransaction'
  | 'release'
>;

const createQueryRunnerMock = () => {
  const manager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const queryRunner: MockedQueryRunner = {
    manager: manager as any,
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  return { queryRunner, manager };
};

describe('RegionService (CRUD)', () => {
  let service: RegionService;
  let dataSource: { createQueryRunner: jest.Mock };
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let queryRunner: MockedQueryRunner;
  let manager: ReturnType<typeof createQueryRunnerMock>['manager'];

  beforeEach(() => {
    ({ queryRunner, manager } = createQueryRunnerMock());
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
    };

    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
    };

    service = new RegionService(dataSource as unknown as DataSource, cacheManager as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a region and invalidates cache', async () => {
    const dto: CreateRegionDto = { name: 'Dhaka' };
    const createdRegion: Region = { id: 'region-1', name: dto.name } as Region;

    manager.findOne.mockResolvedValue(null);
    manager.create.mockReturnValue(createdRegion);
    manager.save.mockResolvedValue(createdRegion);

    // simulate cached entry to ensure invalidation runs
    service['cacheKeys'].add('regions:cache');

    const result = await service.createRegion(dto);

    expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(manager.findOne).toHaveBeenCalledWith(Region, {
      where: { name: dto.name },
    });
    expect(manager.save).toHaveBeenCalledWith(createdRegion);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(cacheManager.del).toHaveBeenCalledWith('regions:cache');
    expect(service['cacheKeys'].size).toBe(0);
    expect(result).toEqual(createdRegion);
  });

  it('throws conflict when region name already exists', async () => {
    const dto: CreateRegionDto = { name: 'Dhaka' };

    manager.findOne.mockResolvedValue({ id: 'existing', name: dto.name });

    await expect(service.createRegion(dto)).rejects.toBeInstanceOf(ConflictException);
    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('updates an existing region and clears cache keys', async () => {
    const regionId = 'region-1';
    const dto: UpdateRegionDto = { name: 'New Dhaka' };
    const existingRegion: Region = { id: regionId, name: 'Old Dhaka' } as Region;
    const savedRegion: Region = { id: regionId, name: dto.name } as Region;

    manager.findOne.mockResolvedValue(existingRegion);
    manager.save.mockResolvedValue(savedRegion);

    service['cacheKeys'].add('regions:cache');

    const result = await service.updateRegion(regionId, dto);

    expect(manager.findOne).toHaveBeenCalledWith(Region, { where: { id: regionId } });
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ name: dto.name }));
    expect(result).toEqual(savedRegion);
    expect(cacheManager.del).toHaveBeenCalledWith('regions:cache');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('throws not found when updating missing region', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(
      service.updateRegion('missing', { name: 'Test' }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(manager.save).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });

  it('deletes an existing region and invalidates cache', async () => {
    const existingRegion: Region = { id: 'region-1', name: 'Dhaka' } as Region;

    manager.findOne.mockResolvedValue(existingRegion);
    manager.remove.mockResolvedValue(undefined);

    service['cacheKeys'].add('regions:cache');

    await service.deleteRegion(existingRegion.id);

    expect(manager.findOne).toHaveBeenCalledWith(Region, { where: { id: existingRegion.id } });
    expect(manager.remove).toHaveBeenCalledWith(existingRegion);
    expect(cacheManager.del).toHaveBeenCalledWith('regions:cache');
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('throws not found when deleting missing region', async () => {
    manager.findOne.mockResolvedValue(null);

    await expect(service.deleteRegion('missing')).rejects.toBeInstanceOf(NotFoundException);

    expect(manager.remove).not.toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
  });
});


