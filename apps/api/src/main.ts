import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') || 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const allowedOrigins = frontendUrl
    ? frontendUrl.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://localhost:4200'];

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const mongoConnection = app.get<Connection>(getConnectionToken());
  if (mongoConnection.readyState === 1) {
    logger.log('Connected to MongoDB');
  } else {
    logger.warn(`MongoDB connection state: ${mongoConnection.readyState}`);
  }

  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
}

bootstrap();
