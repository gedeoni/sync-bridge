import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
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

    const request = this.getRequest(context);
    const token = request?.headers?.['x-auth-token'];
    const expected = this.configService.get<string>('APP_AUTH_TOKEN');

    if (!expected || token !== expected) {
      throw new UnauthorizedException({
        status: 401,
        message: 'Access Denied',
      });
    }

    return true;
  }

  private getRequest(context: ExecutionContext):
    | (Request & { headers: Record<string, string> })
    | undefined {
    if (context.getType().toString() === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext<{ req?: Request; headers?: Record<string, string>; connectionParams?: Record<string, string> }>();
      return ctx?.req || (ctx as any)?.request || ({ headers: ctx?.headers ?? (ctx as any)?.connectionParams } as any);
    }

    return context.switchToHttp().getRequest();
  }
}
