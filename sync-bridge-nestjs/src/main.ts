import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strip away properties that do not have any decorators
    transform: true, // Automatically transform payloads to be objects typed according to their DTO classes
  }));
  app.setGlobalPrefix('api/v1');

  // Setup Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Sync Bridge API')
    .setDescription('NestJS API for syncing data to a SQLite database')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-auth-token',
        in: 'header',
        description: 'Authentication token for API requests',
      },
      'x-auth-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Keep the API key saved across page reloads
    },
  });

  await app.listen(process.env.PORT || 3000);
}

bootstrap();
