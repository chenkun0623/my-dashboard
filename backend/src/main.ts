import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5174';
  app.enableCors({ origin: corsOrigin, credentials: false });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`my-dashboard-api listening on http://localhost:${port}`);
}

bootstrap();
