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
  app.enableCors({
    origin: '*',
    credentials: true,
  });
  
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  await app.listen(process.env.PORT ?? 3005);
}
bootstrap();
