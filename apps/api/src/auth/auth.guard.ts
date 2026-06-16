import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;
    // EventSource (SSE) cannot send headers — accept token via query param as fallback
    const token = header?.startsWith('Bearer ')
      ? header.slice(7)
      : (req.query['token'] as string | undefined);
    if (!token || !this.auth.verify(token)) throw new UnauthorizedException();
    return true;
  }
}
