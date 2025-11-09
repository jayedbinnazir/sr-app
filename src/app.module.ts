import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from 'Config/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppDataSource } from './database/typeorm.datasource';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RoleModule } from './role/role.module';
import { KafkaModule } from './kafka/kafka.module';
import { CachingModule } from './caching/caching.module';
import { FileSystemModule } from './file-system/file-system.module';
import { AwsS3Module } from './aws-s3/aws-s3.module';
import { ChatGatewayModule } from './chat-gateway/chat-gateway.module';
import { AppUserModule } from './app_user/app_user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: (() => {
        const env = process.env.NODE_ENV;
        switch (env) {
          case 'production':
          case 'prod':
            console.log('NODE_ENV is in production mode, loading .env');
            return '.env.prod';
          case 'test':
            console.log(`NODE_ENV is in ${env} mode, loading  .env.${env}`);
            return '.env.test';
          case 'development':
          case 'dev':
            console.log('NODE_ENV is in development mode, loading .env.dev');
            return '.env.dev';
          default:
            console.log('NODE_ENV is not set, defaulting to .env');
            return '.env.dev';
        }
      })(),
      load: [configuration],
    }),

    TypeOrmModule.forRoot(AppDataSource.options),

    UserModule,

    AuthModule,

    RoleModule,

    KafkaModule,

    CachingModule,

    FileSystemModule,

    AwsS3Module,

    ChatGatewayModule,

    AppUserModule,
  ],
  providers: [AppService],
  controllers: [AppController],
  exports: [AppService],
})
export class AppModule {}
