import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import {
  AuthenticatedUser,
  AuthJwtPayload,
} from '../types/auth-user.type';
import { AuthRole } from '../types/auth-role.enum';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SalesRep)
    private readonly salesRepRepository: Repository<SalesRep>,
  ) {
    const cookieName =
      configService.get<string>('app.cookie_name') ?? 'sr_access_token';

    const cookieExtractor = (request: Request): string | null => {
      if (!request || !request.cookies) {
        return null;
      }
      const token = request.cookies[cookieName];
      return token ?? null;
    };

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('app.jwt_secret') ?? 'change-me',
    });
  }

  async validate(payload: AuthJwtPayload): Promise<AuthenticatedUser> {
    if (payload.type === AuthRole.Admin) {
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException();
      }

      return {
        id: user.id,
        type: AuthRole.Admin,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        username: user.username ?? null,
        role: payload.role ?? AuthRole.Admin,
      };
    }

    if (payload.type === AuthRole.SalesRep) {
      const salesRep = await this.salesRepRepository.findOne({
        where: { user_id: payload.sub },
        relations: ['user'],
      });

      if (!salesRep || !salesRep.user) {
        throw new UnauthorizedException();
      }

      return {
        id: salesRep.id,
        user_id: salesRep.user.id || null,
        type: AuthRole.SalesRep,
        name: salesRep.user.name ?? salesRep.name,
        email: salesRep.user.email ?? null,
        phone: salesRep.user.phone ?? salesRep.phone ?? null,
        username: salesRep.username,
        role: payload.role ?? AuthRole.SalesRep,
      };
    }

    throw new UnauthorizedException();
  }
}

