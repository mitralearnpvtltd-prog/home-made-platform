import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * Protects SMS diagnostic routes with AQUASMS_DIAGNOSTIC_KEY.
 * If the key is unset, routes appear as 404 (disabled) — never public.
 */
@Injectable()
export class SmsDiagnosticGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = (process.env.AQUASMS_DIAGNOSTIC_KEY ?? '').trim();
    if (!expected) {
      throw new NotFoundException();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = String(
      request.headers['x-aahaa-sms-diagnostic-key'] ?? '',
    ).trim();

    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid diagnostic key.');
    }

    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
