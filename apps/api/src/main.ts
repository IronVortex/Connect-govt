import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { logger } from './logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const loggerContext = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') || 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  const allowedOrigins = new Set([
    'https://connect-govt-project-5gyge2t3m-ajafshan17-6177s-projects.vercel.app',
    'http://localhost:3000',
    ...(frontendUrl
      ? frontendUrl
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean)
      : []),
  ]);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
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
