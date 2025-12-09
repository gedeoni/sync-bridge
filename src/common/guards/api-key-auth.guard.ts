import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { headers: Record<string, string> }>();
    const token = request.headers['x-auth-token'];
    const expected = this.configService.get<string>('APP_AUTH_TOKEN');

    if (!expected || token !== expected) {
      throw new UnauthorizedException({
        status: 401,
        message: 'Access Denied',
      });
    }

    return true;
  }
}
