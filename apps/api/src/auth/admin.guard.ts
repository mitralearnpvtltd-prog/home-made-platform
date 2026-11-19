import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';
import type { AuthedRequest } from './auth.guard';

function shortId(id: string): string {
  return id.length <= 8 ? id : `${id.slice(0, 8)}…`;
}

/**
 * Requires AuthGuard first. Allows only profiles with the seeded `admin` role.
 * Never grants admin privileges — only reads existing user_roles assignments.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly adminClient: SupabaseClient | null,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const userId = request.authUser?.id;
    if (!userId) {
      throw new UnauthorizedException('Missing authenticated user.');
    }

    if (!this.adminClient) {
      this.logger.warn(
        `Admin role check unavailable (no service-role client) userId=${shortId(userId)}`,
      );
      throw new ForbiddenException('Admin access is unavailable.');
    }

    const { data: role, error: roleError } = await this.adminClient
      .from('roles')
      .select('id')
      .eq('code', 'admin')
      .maybeSingle();

    if (roleError) {
      this.logger.error(
        `Admin role catalogue lookup failed userId=${shortId(userId)} code=${roleError.code ?? 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Unable to verify administrator access. Role catalogue is not readable by the API.',
      );
    }

    if (!role?.id) {
      this.logger.warn(
        `Admin role code missing in roles table userId=${shortId(userId)}`,
      );
      throw new ForbiddenException('Administrator access required.');
    }

    const { data: assignment, error: assignError } = await this.adminClient
      .from('user_roles')
      .select('profile_id')
      .eq('profile_id', userId)
      .eq('role_id', role.id)
      .maybeSingle();

    if (assignError) {
      this.logger.error(
        `Admin user_roles lookup failed userId=${shortId(userId)} code=${assignError.code ?? 'unknown'}`,
      );
      throw new ServiceUnavailableException(
        'Unable to verify administrator access. Role assignments are not readable by the API.',
      );
    }

    if (!assignment) {
      this.logger.warn(
        `Admin role check denied (no assignment) userId=${shortId(userId)}`,
      );
      throw new ForbiddenException('Administrator access required.');
    }

    this.logger.log(
      `Admin role check passed userId=${shortId(userId)}`,
    );
    return true;
  }
}
