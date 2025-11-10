import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { CustomExceptionFilter } from './common/filters/global-exception.filter';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new CustomExceptionFilter(httpAdapterHost));
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());

  const configservice = app.get(ConfigService);
  const PORT = configservice.get<number>('app.port') as number;
  const HOST = configservice.get<string>('app.host') as string;
  const APP_NAME = configservice.get<number>('app.name');
  const PREFIX = configservice.get<string>('app.globalPrefix') as string;

  app.setGlobalPrefix(PREFIX);

  console.log('hot reload Testing-----------------');

  await app.listen(PORT, HOST, () => {
    console.log(`${APP_NAME} is running on ${HOST}:${PORT}`);
  });
}
void bootstrap();
