import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = Number(configService.get<string>('PORT') || 3001);
  const mongoUri = configService.get<string>('MONGODB_URI');
  const frontendUrl = configService.get<string>('FRONTEND_URL');

  if (!mongoUri) {
    throw new Error('MONGODB_URI is required to start the API.');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: frontendUrl || false,
    credentials: true,
  });

  const mongoConnection = app.get<Connection>(getConnectionToken());
  if (mongoConnection.readyState === 1) {
    console.log('✅ Connected to MongoDB');
  }

  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
}
bootstrap();
