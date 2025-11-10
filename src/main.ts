import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { CustomExceptionFilter } from './common/filters/global-exception.filter';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Sales Representative API')
    .setDescription(
      'API documentation for authentication and sales representative operations.',
    )
    .setVersion('1.0.0')
    .addCookieAuth('sr_access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'sr_access_token',
      description: 'Session cookie returned after login',
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token returned after login',
      },
      'bearer',
    )
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig, {
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup('docs', app, swaggerDocument, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Sales Rep API Docs',
  });

  console.log('hot reload Testing-----------------');
  console.log(`📘 Swagger docs available at http://${HOST}:${PORT}/docs`);

  await app.listen(PORT, HOST, () => {
    console.log(`${APP_NAME} is running on ${HOST}:${PORT}`);
  });
}
void bootstrap();
