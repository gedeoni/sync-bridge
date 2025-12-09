import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip away properties that do not have any decorators
    transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
  }));
  app.setGlobalPrefix('api/v1');

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
