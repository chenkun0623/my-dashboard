import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5174';
  app.enableCors({ origin: corsOrigin, credentials: false });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`my-dashboard-api listening on http://localhost:${port}`);
}

bootstrap();
