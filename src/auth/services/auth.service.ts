import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateAuthDto } from '../dto/create-auth.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { AppUser } from 'src/app_user/entities/app_user.entity';
import { Role } from 'src/role/entities/role.entity';
import { RoleService } from 'src/role/services/role.service';
import {
  AuthenticatedUser,
  AuthJwtPayload,
} from '../types/auth-user.type';
import { AuthRole } from '../types/auth-role.enum';
import { RegisterAdminDto } from '../dto/register-admin.dto';
import { RegisterSalesRepDto } from '../dto/register-sales-rep.dto';
import { parseJwtExpires } from '../utils/jwt-expiration.util';
import { NotificationService } from 'src/notification/notification.service';

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtExpiresInSeconds: number;
  private readonly cookieName: string;
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SalesRep)
    private readonly salesRepRepository: Repository<SalesRep>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly roleService: RoleService,
    private readonly notificationService: NotificationService,
  ) {
    const expires = this.configService.get<string>('app.jwt_expires_in');
    this.jwtExpiresInSeconds = parseJwtExpires(expires);
    this.cookieName =
      this.configService.get<string>('app.cookie_name') ?? 'sr_access_token';
    this.saltRounds = Number(
      this.configService.get<string>('AUTH_SALT_ROUNDS') ?? 10,
    );
  }

  async login(dto: CreateAuthDto): Promise<AuthResult> {
    try {
      switch (dto.type) {
        case AuthRole.Admin:
          return await this.loginAdmin(dto);
        case AuthRole.SalesRep:
          return await this.loginSalesRep(dto);
        default:
          throw new UnauthorizedException('Unsupported auth type');
      }
    } catch (error) {
      console.error('Login failed:', error);
      this.logger.error('Login failed', error?.stack ?? String(error));
      throw error;
    }
  }

  async registerAdmin(
    dto: RegisterAdminDto,
    manager?: EntityManager,
  ): Promise<AuthResult> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;
      const normalizedUsernameInput = dto.username?.trim().toLowerCase() ?? null;

      if (!normalizedEmail && !normalizedUsernameInput) {
        throw new BadRequestException('Email or username is required');
      }

      if (normalizedEmail) {
        const existingEmailUser = await em!
          .createQueryBuilder(User, 'user')
          .select(['user.id'])
          .where('LOWER(user.email) = :email', { email: normalizedEmail })
          .getOne();
        if (existingEmailUser) {
          throw new ConflictException(
            `Admin with email '${dto.email}' already exists`,
          );
        }
      }

      if (normalizedUsernameInput) {
        const usernameTaken = await this.isUsernameTaken(
          normalizedUsernameInput,
          em!,
        );
        if (usernameTaken) {
          throw new ConflictException(
            `Username '${dto.username}' is already in use`,
          );
        }
      }

      const role = await this.ensureRole(
        em!,
        AuthRole.Admin,
        'Administrator',
      );

      const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

      const generatedUsername =
        normalizedUsernameInput ??
        (normalizedEmail
          ? await this.generateUniqueUsername(
              normalizedEmail.split('@')[0],
              em!,
            )
          : await this.generateUniqueUsername(dto.name, em!));

      const adminUser = em!.create(User, {
        name: dto.name.trim(),
        email: normalizedEmail,
        username: generatedUsername,
        phone: dto.phone ?? null,
        password: hashedPassword,
      });
      const savedUser = await em!.save(adminUser);

      const appUser = em!.create(AppUser, {
        user_id: savedUser.id,
        role_id: role.id,
      });
      await em!.save(appUser);

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      this.logger.log(`Admin ${savedUser.email} registered successfully`);
      this.emitNotification(() =>
        this.notificationService.broadcast(
          'notifications.admin.registered',
          {
            userId: savedUser.id,
            name: savedUser.name,
            email: savedUser.email,
            timestamp: new Date().toISOString(),
          },
        ),
      );

      return this.buildAdminAuthResult(savedUser);
    } catch (error) {
      this.logger.error('Admin registration failed', error?.stack ?? String(error));
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

  async registerSalesRep(
    dto: RegisterSalesRepDto,
    manager?: EntityManager,
  ): Promise<AuthResult> {
    const queryRunner = manager
      ? undefined
      : this.dataSource.createQueryRunner();
    const em = manager ?? queryRunner?.manager;

    if (!manager) {
      await queryRunner?.connect();
      await queryRunner?.startTransaction();
    }

    try {
      const normalizedUsernameInput = dto.username?.trim().toLowerCase() ?? null;
      const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

      if (!normalizedUsernameInput && !normalizedEmail) {
        throw new BadRequestException('Email or username is required');
      }

      if (normalizedEmail) {
        const existingUserWithEmail = await em!
          .createQueryBuilder(User, 'user')
          .select(['user.id'])
          .where('LOWER(user.email) = :email', { email: normalizedEmail })
          .getOne();

        if (existingUserWithEmail) {
          throw new ConflictException(
            `User with email '${dto.email}' already exists`,
          );
        }
      }

      if (normalizedUsernameInput) {
        const usernameTaken = await this.isUsernameTaken(
          normalizedUsernameInput,
          em!,
        );
        if (usernameTaken) {
          throw new ConflictException(
            `Username '${dto.username}' is already in use`,
          );
        }
      }

      const role = await this.ensureRole(
        em!,
        AuthRole.SalesRep,
        'Sales representative',
      );

      const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

      const username =
        normalizedUsernameInput ??
        (normalizedEmail
          ? await this.generateUniqueUsername(
              normalizedEmail.split('@')[0],
              em!,
            )
          : await this.generateUniqueUsername(dto.name, em!));

      const user = em!.create(User, {
        name: dto.name.trim(),
        email: normalizedEmail,
        username,
        phone: dto.phone ?? null,
        password: hashedPassword,
      });
      const savedUser = await em!.save(user);

      const appUser = em!.create(AppUser, {
        user_id: savedUser.id,
        role_id: role.id,
      });
      await em!.save(appUser);

      const salesRep = em!.create(SalesRep, {
        user_id: savedUser.id,
        username,
        name: dto.name.trim(),
        phone: dto.phone ?? null,
        isActive: true,
      });
      const savedSalesRep = await em!.save(salesRep);
      savedSalesRep.user = savedUser;

      if (!manager) {
        await queryRunner?.commitTransaction();
      }

      this.logger.log(`Sales rep ${savedSalesRep.username} registered`);
      this.emitNotification(() =>
        this.notificationService.broadcast(
          'notifications.sales-rep.registered',
          {
            userId: savedUser.id,
            name: savedSalesRep.name,
            username: savedSalesRep.username,
            timestamp: new Date().toISOString(),
          },
        ),
      );

      return this.buildSalesRepAuthResult(savedSalesRep, savedUser);
    } catch (error) {
      this.logger.error('Sales rep registration failed', error?.stack ?? String(error));
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

  attachAuthCookie(response: Response, token: string): void {
    response.cookie(this.cookieName, token, this.getCookieOptions());
  }

  attachAuthHeader(response: Response, token: string): void {
    response.setHeader('Authorization', `Bearer ${token}`);
  }

  clearAuthCookie(response: Response): void {
    response.cookie(this.cookieName, '', {
      ...this.getCookieOptions(),
      maxAge: 0,
    });
    response.removeHeader('Authorization');
  }

  private async loginAdmin(dto: CreateAuthDto): Promise<AuthResult> {
    const identifier = dto.identifier.trim().toLowerCase();

    const adminUser = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.appUsers', 'appUser')
      .leftJoinAndSelect('appUser.role', 'role')
      .where('role.name = :roleName', { roleName: AuthRole.Admin })
      .andWhere(
        '(LOWER(user.email) = :identifier OR LOWER(user.username) = :identifier)',
        { identifier },
      )
      .addSelect('user.password')
      .getOne();

    if (!adminUser || !adminUser.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      adminUser.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(
      `Admin ${adminUser.username ?? adminUser.email ?? adminUser.id} logged in successfully`,
    );
    this.emitNotification(() =>
      this.notificationService.notifyUser(adminUser.id, 'notifications.login', {
        userId: adminUser.id,
        type: AuthRole.Admin,
        timestamp: new Date().toISOString(),
      }),
    );

    return this.buildAdminAuthResult(adminUser);
  }

  private async loginSalesRep(dto: CreateAuthDto): Promise<AuthResult> {
    const identifier = dto.identifier.trim().toLowerCase();
    console.log(identifier);

    try {
      const salesRep = await this.salesRepRepository
        .createQueryBuilder('salesRep')
        .leftJoinAndSelect('salesRep.user', 'user')
        .where('LOWER(salesRep.username) = :identifier', { identifier })
        .orWhere('LOWER(user.email) = :identifier', { identifier })
        .orWhere('LOWER(user.username) = :identifier', { identifier })
        .getOne();

      if (!salesRep || !salesRep.user || !salesRep.user.password) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const passwordMatches = await bcrypt.compare(
        dto.password,
        salesRep.user.password,
      );
      if (!passwordMatches) {
        throw new UnauthorizedException('Invalid credentials');
      }

      salesRep.lastLoginAt = new Date();
      await this.salesRepRepository.save(salesRep);

      this.logger.log(`Sales rep ${salesRep.username} logged in successfully`);
      const userId = salesRep.user.id;
      this.emitNotification(() =>
        this.notificationService.notifyUser(
          userId,
          'notifications.login',
          {
            userId,
            type: AuthRole.SalesRep,
            username: salesRep.username,
            timestamp: new Date().toISOString(),
          },
        ),
      );

      return this.buildSalesRepAuthResult(salesRep, salesRep.user);
    } catch (error) {
      this.logger.error('Sales rep login failed', error?.stack ?? String(error));
      throw error;
    }
  }

  private getJwtSecret(): string {
    return this.configService.get<string>('JWT_SECRET') ?? 'change-me';
  }

  private getJwtExpiresIn(): number {
    const expires = this.configService.get<string>('app.jwt_expires_in');
    return parseJwtExpires(expires);
  }

  private async ensureRole(
    em: EntityManager,
    roleName: AuthRole,
    description: string,
  ): Promise<Role> {
    let role = await em.findOne(Role, { where: { name: roleName } });
    if (!role) {
      role = await this.roleService.createRole(roleName, description, em);
    }
    return role;
  }

  private async generateAccessToken(payload: AuthJwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.getJwtExpiresIn(),
    });
  }

  private async buildAdminAuthResult(admin: User): Promise<AuthResult> {
    const accessToken = await this.generateAccessToken({
      sub: admin.id,
      type: AuthRole.Admin,
      role: AuthRole.Admin,
    });

    return {
      accessToken,
      expiresIn: this.jwtExpiresInSeconds,
      tokenType: 'Bearer',
      user: {
        id: admin.id,
        type: AuthRole.Admin,
        name: admin.name,
        email: admin.email ?? null,
        phone: admin.phone ?? null,
        username: admin.username ?? null,
        role: AuthRole.Admin,
      },
    };
  }

  private async buildSalesRepAuthResult(
    salesRep: SalesRep,
    user?: User,
  ): Promise<AuthResult> {
    const profileUser = user ?? salesRep.user;

    if (!profileUser) {
      const loaded = await this.userRepository.findOne({
        where: { id: salesRep.user_id },
      });
      if (!loaded) {
        throw new UnauthorizedException('Sales rep user not found');
      }
      return this.buildSalesRepAuthResult(salesRep, loaded);
    }

    const accessToken = await this.generateAccessToken({
      sub: profileUser.id,
      type: AuthRole.SalesRep,
      role: AuthRole.SalesRep,
    });

    return {
      accessToken,
      expiresIn: this.jwtExpiresInSeconds,
      tokenType: 'Bearer',
      user: {
        id: salesRep.id,
        user_id: profileUser.id,
        type: AuthRole.SalesRep,
        name: profileUser.name ?? salesRep.name,
        email: profileUser.email ?? null,
        phone: profileUser.phone ?? salesRep.phone ?? null,
        username: salesRep.username,
        role: AuthRole.SalesRep,
      },
    };
  }

  private sanitizeUsername(base: string): string {
    const cleaned = base
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 40);
    return cleaned.length ? cleaned : 'user';
  }

  private async isUsernameTaken(
    username: string,
    manager: EntityManager,
  ): Promise<boolean> {
    const existingUser = await manager.count(User, {
      where: { username },
    });
    if (existingUser > 0) {
      return true;
    }
    const existingSalesRep = await manager.count(SalesRep, {
      where: { username },
    });
    return existingSalesRep > 0;
  }

  private async generateUniqueUsername(
    base: string,
    manager: EntityManager,
  ): Promise<string> {
    const sanitized = this.sanitizeUsername(base);
    let candidate = sanitized;
    let suffix = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const taken = await this.isUsernameTaken(candidate, manager);
      if (!taken) {
        return candidate;
      }
      suffix += 1;
      candidate = `${sanitized}${suffix}`.slice(0, 60);
    }
  }

  private getCookieOptions(): CookieOptions {
    const sameSiteConfig =
      this.configService.get<string>('app.auth_cookie_samesite') ?? 'lax';
    const sameSite = this.normalizeSameSite(sameSiteConfig);

    const secureConfig = this.configService.get<string>('app.auth_cookie_secure');
    const secure =
      secureConfig !== undefined
        ? secureConfig === 'true'
        : (this.configService.get<string>('NODE_ENV') ?? '').toLowerCase() ===
          'production';

    const domain = this.configService.get<string>('app.auth_cookie_domain') ?? undefined;
    const path =
      this.configService.get<string>('app.auth_cookie_path') ??
      '/';

    return {
      httpOnly: true,
      secure,
      sameSite,
      domain,
      path,
      maxAge: this.jwtExpiresInSeconds * 1000,
    };
  }

  private normalizeSameSite(
    value: string,
  ): CookieOptions['sameSite'] {
    const normalized = value?.toLowerCase();
    if (normalized === 'none' || normalized === 'strict' || normalized === 'lax') {
      return normalized;
    }
    return 'lax';
  }
  private emitNotification(callback: () => void): void {
    try {
      callback();
    } catch (error) {
      this.logger.warn(
        `Notification dispatch failed: ${(error as Error)?.message ?? error}`,
      );
    }
  }
}
