import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthService } from '../auth/auth.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
  it('protects customer routes with AuthGuard', () => {
    const guards = Reflect.getMetadata('__guards__', NotificationsController);
    expect(guards).toContain(AuthGuard);
  });

  it('passes only the authenticated customer id into notification operations', async () => {
    const service = {
      list: jest.fn().mockResolvedValue([]),
      getUnreadCount: jest.fn().mockResolvedValue({ unreadCount: 0 }),
      markRead: jest.fn(),
      markAllRead: jest.fn(),
      dismiss: jest.fn(),
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };
    const controller = new NotificationsController(
      service as unknown as NotificationsService,
    );
    const request = { authUser: { id: 'customer-1' } } as never;

    await controller.list(request);
    await controller.markRead(request, 'notification-1');
    await controller.dismiss(request, 'notification-2');

    expect(service.list).toHaveBeenCalledWith('customer-1');
    expect(service.markRead).toHaveBeenCalledWith(
      'customer-1',
      'notification-1',
    );
    expect(service.dismiss).toHaveBeenCalledWith(
      'customer-1',
      'notification-2',
    );
  });

  it('rejects missing bearer credentials in the shared authentication guard', async () => {
    const authService = {
      requireUserFromToken: jest.fn(),
    } as unknown as AuthService;
    const guard = new AuthGuard(authService);
    const request = { headers: {} };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.requireUserFromToken).not.toHaveBeenCalled();
  });

  it('derives the customer identity from the validated bearer token', async () => {
    const authService = {
      requireUserFromToken: jest.fn().mockResolvedValue({
        id: 'validated-customer',
        email: 'customer@example.com',
      }),
    } as unknown as AuthService;
    const guard = new AuthGuard(authService);
    const request = { headers: { authorization: 'Bearer access-token' } };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authService.requireUserFromToken).toHaveBeenCalledWith(
      'access-token',
    );
    expect(request).toHaveProperty('authUser.id', 'validated-customer');
  });
});
