import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { RoleService } from 'src/role/services/role.service';
import { AuthRole } from '../types/auth-role.enum';
import { NotificationService } from 'src/notification/notification.service';

type MockedRepository<T> = Partial<
  Record<keyof Repository<T>, jest.Mock>
> & {
  createQueryBuilder?: jest.Mock;
};

const createUserQueryBuilderMock = () => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  return qb;
};

const createSalesRepQueryBuilderMock = () => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  return qb;
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: MockedRepository<User>;
  let salesRepRepository: MockedRepository<SalesRep>;
  let jwtService: JwtService;

  const configGetMock = jest.fn((key: string) => {
    switch (key) {
      case 'JWT_EXPIRES_IN':
        return '3600';
      case 'JWT_SECRET':
        return 'test-secret';
      case 'AUTH_COOKIE_NAME':
        return 'sr_access_token';
      case 'AUTH_SALT_ROUNDS':
        return '10';
      case 'AUTH_COOKIE_SAMESITE':
      case 'AUTH_COOKIE_SECURE':
      case 'AUTH_COOKIE_DOMAIN':
      case 'AUTH_COOKIE_PATH':
        return undefined;
      case 'NODE_ENV':
        return 'test';
      default:
        return undefined;
    }
  });

  const dataSourceMock = {
    createQueryRunner: jest.fn().mockReturnValue({
      manager: {},
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    }),
  } as Partial<DataSource>;

  beforeEach(async () => {
    userRepository = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
    };

    salesRepRepository = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepository,
        },
        {
          provide: getRepositoryToken(SalesRep),
          useValue: salesRepRepository,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
        {
          provide: RoleService,
          useValue: {
            createRole: jest.fn(),
          },
        },
        {
          provide: NotificationService,
          useValue: {
            notifyUser: jest.fn(),
            broadcast: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should authenticate admin user with valid credentials', async () => {
    const qb = createUserQueryBuilderMock();
    userRepository.createQueryBuilder!.mockReturnValue(qb);

    const adminUser: Partial<User> = {
      id: 'admin-user-id',
      name: 'Admin User',
      email: 'admin@example.com',
      phone: '01700000000',
      password: 'hashed-password',
    };

    qb.getOne.mockResolvedValue(adminUser);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const result = await service.login({
      type: AuthRole.Admin,
      identifier: 'admin@example.com',
      password: 'Admin123!',
    });

    expect(result.accessToken).toEqual('mock-jwt-token');
    expect(result.user.id).toEqual('admin-user-id');
    expect(result.user.type).toEqual(AuthRole.Admin);
    expect(jwtService.signAsync).toHaveBeenCalled();
  });

  it('should authenticate sales rep with valid credentials', async () => {
    const qb = createSalesRepQueryBuilderMock();
    salesRepRepository.createQueryBuilder!.mockReturnValue(qb);

    const salesRep: Partial<SalesRep> = {
      id: 'sales-rep-profile-id',
      user_id: 'sales-rep-user-id',
      username: 'sr001',
      name: 'Sales Rep',
      phone: '01700000000',
      user: {
        id: 'sales-rep-user-id',
        name: 'Sales Rep',
        email: 'sr@example.com',
        phone: '01700000000',
        password: 'hashed-password',
      } as User,
    };

    qb.getOne.mockResolvedValue(salesRep);
    salesRepRepository.save!.mockResolvedValue(salesRep);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

    const result = await service.login({
      type: AuthRole.SalesRep,
      identifier: 'sr001',
      password: 'SrUser123!',
    });

    expect(result.user.id).toEqual('sales-rep-user-id');
    expect(result.user.type).toEqual(AuthRole.SalesRep);
    expect(result.accessToken).toEqual('mock-jwt-token');
    expect(salesRepRepository.save).toHaveBeenCalled();
  });

  it('should throw when admin credentials are invalid', async () => {
    const qb = createUserQueryBuilderMock();
    userRepository.createQueryBuilder!.mockReturnValue(qb);
    qb.getOne.mockResolvedValue(null);

    await expect(
      service.login({
        type: AuthRole.Admin,
        identifier: 'missing@example.com',
        password: 'wrong',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should throw when sales rep password invalid', async () => {
    const qb = createSalesRepQueryBuilderMock();
    salesRepRepository.createQueryBuilder!.mockReturnValue(qb);

    const salesRep: Partial<SalesRep> = {
      id: 'sales-rep-profile-id',
      user_id: 'sales-rep-user-id',
      username: 'sr001',
      name: 'Sales Rep',
      user: {
        id: 'sales-rep-user-id',
        name: 'Sales Rep',
        password: 'hashed-password',
      } as User,
    };

    qb.getOne.mockResolvedValue(salesRep);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

    await expect(
      service.login({
        type: AuthRole.SalesRep,
        identifier: 'sr001',
        password: 'bad-pass',
      }),
    ).rejects.toThrow('Invalid credentials');
  });
});
