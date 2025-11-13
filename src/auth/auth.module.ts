import { Module } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { parseJwtExpires } from './utils/jwt-expiration.util';
import { SalesRep } from 'src/sales_rep/entities/sales_rep.entity';
import { AppUser } from 'src/app_user/entities/app_user.entity';
import { Role } from 'src/role/entities/role.entity';
import { RoleModule } from 'src/role/role.module';
import { AdminGuard } from './guards/admin.guard';
import { SalesRepGuard } from './guards/sales-rep.guard';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    RoleModule,
    NotificationModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresRaw = configService.get<string>('JWT_EXPIRES_IN');
        return {
          secret: configService.get<string>('JWT_SECRET') ?? 'change-me',
          signOptions: {
            expiresIn: parseJwtExpires(expiresRaw),
          },
        };
      },
    }),
    TypeOrmModule.forFeature([User, SalesRep, AppUser, Role]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    AdminGuard,
    SalesRepGuard,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, RolesGuard, AdminGuard, SalesRepGuard],
})
export class AuthModule {}
