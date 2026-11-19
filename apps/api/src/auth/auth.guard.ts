import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.constants';

export type AuthedRequest = Request & { authUser?: AuthenticatedUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token. Please log in.');
    }

    const accessToken = header.slice('Bearer '.length).trim();
    if (!accessToken) {
      throw new UnauthorizedException('Missing bearer token. Please log in.');
    }

    const user = await this.authService.requireUserFromToken(accessToken);
    request.authUser = {
      id: user.id,
      email: user.email ?? null,
      accessToken,
    };
    return true;
  }
}
