import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getLoadedApiEnvPath, loadApiEnvFile } from './config/load-api-env';

loadApiEnvFile({ override: true });

async function bootstrap() {
  // rawBody is required so Cashfree webhook HMAC uses the exact request bytes.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const apiPrefix = configService.get<string>('apiPrefix') ?? 'api/v1';
  const port = configService.get<number>('port') ?? 3000;
  const corsOrigins = configService.get<string[]>('corsOrigins') ?? [
    'http://localhost:5173',
    'http://localhost:5174',
  ];

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`API listening on http://localhost:${port}/${apiPrefix}`);

  const appId = configService.get<string>('cashfree.appId')?.trim() ?? '';
  const secretKey = configService.get<string>('cashfree.secretKey')?.trim() ?? '';
  const cashfreeEnv = (
    configService.get<string>('cashfree.env') ?? 'SANDBOX'
  ).toUpperCase();
  logger.log(
    `Cashfree config: envFile=${getLoadedApiEnvPath() ?? 'none'} env=${cashfreeEnv} hasAppId=${Boolean(appId)} appIdLen=${appId.length} appIdStartsWithTEST=${appId.startsWith('TEST')} hasSecret=${Boolean(secretKey)} secretLen=${secretKey.length} secretStartsWithCfsk=${secretKey.startsWith('cfsk_')}`,
  );
}

void bootstrap();
