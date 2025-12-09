import {
  Injectable,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';

@Injectable()
export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) => {
        const formatted = errors.reduce<Record<string, string>>((acc, err) => {
          const constraint = err.constraints
            ? Object.values(err.constraints)[0]
            : undefined;
          acc[err.property] = constraint || 'Invalid value';
          return acc;
        }, {});
        return new BadRequestException({
          status: 400,
          message: 'Validation failed',
          errors: formatted,
        });
      },
    });
  }
}