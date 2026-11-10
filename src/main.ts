import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import {
  isSwaggerEnabled,
  setupSwagger,
} from './common/swagger/swagger.setup.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

export function configureApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  const trustProxyHopsRaw =
    configService.get<string>('TRUST_PROXY_HOPS') ??
    process.env.TRUST_PROXY_HOPS;
  const trustProxyHops = Number.parseInt(String(trustProxyHopsRaw ?? '0'), 10);
  if (Number.isInteger(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  app.useBodyParser('json', { limit: '2mb' });

  const corsOriginsEnv =
    configService.get<string>('CORS_ORIGINS') ?? process.env.CORS_ORIGINS;
  const allowedOrigins = corsOriginsEnv
    ? corsOriginsEnv
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ['http://localhost:3000'];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  configureApp(app);

  if (isSwaggerEnabled()) {
    setupSwagger(app);
  }

  const configService = app.get(ConfigService);
  const port = configService.get<string>('PORT') ?? process.env.PORT ?? 3002;
  await app.listen(port);
}

if (!process.env.VITEST) {
  await bootstrap();
}
