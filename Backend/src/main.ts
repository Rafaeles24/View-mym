import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
const cookieParser = require('cookie-parser');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('/system/api');
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true
    })
  );

  const allowedOrigins = [
    process.env.VISOR_ORIGIN,
    process.env.DASHBOARD_ORIGIN,
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: [
      "GET", 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'
    ],
    allowedHeaders: [
      "Content-Type", "Authorization"
    ]
  });
  
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
