import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // 生产环境必须先配置 JWT_SECRET，缺失时直接启动失败（防止默认密钥被利用伪造 token）
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('[security] JWT_SECRET 未设置，生产环境拒绝启动');
  }

  const app = await NestFactory.create(AppModule);
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5174';
  app.enableCors({ origin: corsOrigin, credentials: false });

  const port = Number(process.env.PORT || 3000);
  await app.listen(port);
  console.log(`my-dashboard-api listening on http://localhost:${port}`);
}

bootstrap();
