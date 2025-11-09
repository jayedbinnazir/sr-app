import {
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
    switch (dto.type) {
      case AuthRole.Admin:
        return this.loginAdmin(dto);
      case AuthRole.SalesRep:
        return this.loginSalesRep(dto);
      default:
        throw new UnauthorizedException('Unsupported auth type');
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
      const normalizedEmail = dto.email.trim().toLowerCase();

      const existing = await em!
        .createQueryBuilder(User, 'user')
        .leftJoin('user.appUsers', 'appUser')
        .leftJoin('appUser.role', 'role')
        .where('LOWER(user.email) = :email', { email: normalizedEmail })
        .getOne();

      if (existing) {
        throw new ConflictException(
          `Admin with email '${dto.email}' already exists`,
        );
      }

      const role = await this.ensureRole(
        em!,
        AuthRole.Admin,
        'Administrator',
      );

      const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

      const adminUser = em!.create(User, {
        name: dto.name.trim(),
        email: normalizedEmail,
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

      return this.buildAdminAuthResult(savedUser);
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
      const normalizedUsername = dto.username.trim().toLowerCase();
      const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

      const existingSalesRep = await em!
        .createQueryBuilder(SalesRep, 'salesRep')
        .select(['salesRep.id'])
        .where('LOWER(salesRep.username) = :username', {
          username: normalizedUsername,
        })
        .getOne();

      if (existingSalesRep) {
        throw new ConflictException(
          `Sales rep with username '${dto.username}' already exists`,
        );
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

      const role = await this.ensureRole(
        em!,
        AuthRole.SalesRep,
        'Sales representative',
      );

      const hashedPassword = await bcrypt.hash(dto.password, this.saltRounds);

      const user = em!.create(User, {
        name: dto.name.trim(),
        email: normalizedEmail,
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
        username: normalizedUsername,
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

      return this.buildSalesRepAuthResult(savedSalesRep, savedUser);
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
      .where('LOWER(user.email) = :email', { email: identifier })
      .andWhere('role.name = :roleName', { roleName: AuthRole.Admin })
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

    this.logger.log(`Admin ${adminUser.email} logged in successfully`);

    return this.buildAdminAuthResult(adminUser);
  }

  private async loginSalesRep(dto: CreateAuthDto): Promise<AuthResult> {
    const identifier = dto.identifier.trim().toLowerCase();

    const salesRep = await this.salesRepRepository
      .createQueryBuilder('salesRep')
      .leftJoinAndSelect('salesRep.user', 'user')
      .where('LOWER(salesRep.username) = :username', { username: identifier })
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

    return this.buildSalesRepAuthResult(salesRep, salesRep.user);
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
        id: profileUser.id,
        type: AuthRole.SalesRep,
        name: profileUser.name ?? salesRep.name,
        email: profileUser.email ?? null,
        phone: profileUser.phone ?? salesRep.phone ?? null,
        username: salesRep.username,
        role: AuthRole.SalesRep,
      },
    };
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
}
