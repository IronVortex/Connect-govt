import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import helmet from 'helmet';
import compression from 'compression';
import { noSqlInjectionSanitizer, xssSanitizer } from './config/security.middleware';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();
  const loggerContext = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') || 3001);
  const normalizeOrigin = (origin: string) => origin.trim().replace(/\/$/, '');
  const configuredFrontendUrls = [
    configService.get<string>('FRONTEND_URL'),
    configService.get<string>('CLIENT_URL'),
    configService.get<string>('CORS_ORIGIN'),
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map(normalizeOrigin)
    .filter(Boolean);

  const allowedOrigins = new Set([
    normalizeOrigin('http://localhost:3000'),
    normalizeOrigin('http://localhost:3001'),
    normalizeOrigin('http://localhost:3333'),
    normalizeOrigin('http://localhost:4200'),
    normalizeOrigin('https://connect-govt-vert.vercel.app'),
    normalizeOrigin('https://connect-govt-project.vercel.app'),
    ...configuredFrontendUrls,
  ]);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.use(noSqlInjectionSanitizer);
  app.use(xssSanitizer);
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      quietReqLogger: false,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const mongoConnection = app.get<Connection>(getConnectionToken());
  if (mongoConnection.readyState === 1) {
    loggerContext.log('Connected to MongoDB');
  } else {
    loggerContext.warn(`MongoDB connection state: ${mongoConnection.readyState}`);
  }

  await app.listen(port, '0.0.0.0');
  loggerContext.log(`API running on port ${port}`);
}

bootstrap();
