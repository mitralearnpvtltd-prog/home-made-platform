import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import type { AuthedRequest } from './auth.guard';

function mockContext(userId: string | undefined): ExecutionContext {
  const request = {
    authUser: userId
      ? { id: userId, email: null, accessToken: 'test-token' }
      : undefined,
  } as AuthedRequest;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as ExecutionContext;
}

type QueryResult = { data: unknown; error: { code?: string; message?: string } | null };

function mockAdminClient(handlers: {
  roles: QueryResult;
  userRoles: QueryResult;
}) {
  return {
    from(table: string) {
      const result = table === 'roles' ? handlers.roles : handlers.userRoles;
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      builder.select = chain;
      builder.eq = chain;
      builder.maybeSingle = async () => result;
      return builder;
    },
  };
}

describe('AdminGuard', () => {
  const adminUserId = '11111111-1111-1111-1111-111111111111';
  const customerUserId = '22222222-2222-2222-2222-222222222222';
  const adminRoleId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  it('rejects unauthenticated requests', async () => {
    const guard = new AdminGuard(mockAdminClient({
      roles: { data: null, error: null },
      userRoles: { data: null, error: null },
    }) as never);

    await expect(guard.canActivate(mockContext(undefined))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('allows an authenticated user with the admin role assignment', async () => {
    const guard = new AdminGuard(
      mockAdminClient({
        roles: { data: { id: adminRoleId }, error: null },
        userRoles: { data: { profile_id: adminUserId }, error: null },
      }) as never,
    );

    await expect(guard.canActivate(mockContext(adminUserId))).resolves.toBe(true);
  });

  it('forbids an authenticated customer without the admin role', async () => {
    const guard = new AdminGuard(
      mockAdminClient({
        roles: { data: { id: adminRoleId }, error: null },
        userRoles: { data: null, error: null },
      }) as never,
    );

    await expect(guard.canActivate(mockContext(customerUserId))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('fails closed with ServiceUnavailable when roles table is unreadable', async () => {
    const guard = new AdminGuard(
      mockAdminClient({
        roles: {
          data: null,
          error: { code: '42501', message: 'permission denied for table roles' },
        },
        userRoles: { data: null, error: null },
      }) as never,
    );

    await expect(guard.canActivate(mockContext(adminUserId))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('fails closed with ServiceUnavailable when user_roles is unreadable', async () => {
    const guard = new AdminGuard(
      mockAdminClient({
        roles: { data: { id: adminRoleId }, error: null },
        userRoles: {
          data: null,
          error: { code: '42501', message: 'permission denied for table user_roles' },
        },
      }) as never,
    );

    await expect(guard.canActivate(mockContext(adminUserId))).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
