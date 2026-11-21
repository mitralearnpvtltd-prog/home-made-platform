import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';
import { NotificationsService } from './notifications.service';

const notificationRow = {
  id: 'notif-1',
  user_id: 'user-1',
  category: 'order_updates' as const,
  title: 'Order confirmed',
  body: 'Your order is confirmed.',
  icon_type: null,
  action_url: null,
  metadata: {},
  is_read: false,
  read_at: null,
  dismissed_at: null,
  created_at: '2026-11-20T10:00:00.000Z',
};

const preferenceRow = {
  user_id: 'user-1',
  order_updates: true,
  offers_promotions: true,
  nearby_home_cooks: true,
  general_updates: true,
  updated_at: '2026-11-20T10:00:00.000Z',
};

function query(result: Record<string, unknown>) {
  const builder: Record<string, jest.Mock> = {};
  for (const method of [
    'select',
    'eq',
    'is',
    'order',
    'limit',
    'update',
    'insert',
    'upsert',
    'maybeSingle',
  ]) {
    builder[method] = jest.fn(() =>
      method === 'maybeSingle' ? Promise.resolve(result) : builder,
    );
  }
  builder.then = jest.fn(
    (resolve: (value: Record<string, unknown>) => unknown) => resolve(result),
  );
  return builder;
}

describe('NotificationsService', () => {
  async function createService(admin: unknown) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SUPABASE_ADMIN_CLIENT, useValue: admin },
      ],
    }).compile();
    return module.get(NotificationsService);
  }

  it('requires the service-role client for persistence', async () => {
    const service = await createService(null);
    await expect(service.list('user-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('scopes notification lists to the authenticated user and hides dismissed rows', async () => {
    const listQuery = query({ data: [notificationRow], error: null });
    const from = jest.fn(() => listQuery);
    const service = await createService({ from });

    await expect(service.list('user-1')).resolves.toMatchObject([
      {
        id: 'notif-1',
        category: 'order_updates',
        title: 'Order confirmed',
        isRead: false,
      },
    ]);

    expect(listQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(listQuery.is).toHaveBeenCalledWith('dismissed_at', null);
    expect(listQuery.limit).toHaveBeenCalledWith(100);
  });

  it('does not mark a notification belonging to another user as read', async () => {
    const updateQuery = query({ data: null, error: null });
    const from = jest.fn(() => updateQuery);
    const service = await createService({ from });

    await expect(service.markRead('user-2', 'notif-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'notif-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-2');
  });

  it('marks only the authenticated customer’s unread notifications as read', async () => {
    const updateQuery = query({ data: [{ id: 'notif-1' }], error: null });
    const from = jest.fn(() => updateQuery);
    const service = await createService({ from });

    await expect(service.markAllRead('user-1')).resolves.toEqual({
      updatedCount: 1,
    });
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(updateQuery.eq).toHaveBeenCalledWith('is_read', false);
    expect(updateQuery.is).toHaveBeenCalledWith('dismissed_at', null);
  });

  it('dismisses only an owned notification', async () => {
    const dismissQuery = query({ data: { id: 'notif-1' }, error: null });
    const from = jest.fn(() => dismissQuery);
    const service = await createService({ from });

    await expect(service.dismiss('user-1', 'notif-1')).resolves.toEqual({
      dismissed: true,
      notificationId: 'notif-1',
    });
    expect(dismissQuery.eq).toHaveBeenCalledWith('id', 'notif-1');
    expect(dismissQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('uses database defaults when initializing preferences for an existing customer', async () => {
    const upsertQuery = query({ data: null, error: null });
    const selectQuery = query({ data: preferenceRow, error: null });
    const from = jest
      .fn()
      .mockReturnValueOnce(upsertQuery)
      .mockReturnValueOnce(selectQuery);
    const service = await createService({ from });

    await expect(service.getPreferences('user-1')).resolves.toMatchObject({
      order_updates: true,
      offers_promotions: true,
      nearby_home_cooks: true,
      general_updates: true,
    });
    expect(upsertQuery.upsert).toHaveBeenCalledWith(
      { user_id: 'user-1' },
      { onConflict: 'user_id', ignoreDuplicates: true },
    );
    expect(selectQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('updates preferences only for the authenticated customer', async () => {
    const upsertQuery = query({ data: null, error: null });
    const updateQuery = query({
      data: { ...preferenceRow, order_updates: false },
      error: null,
    });
    const from = jest
      .fn()
      .mockReturnValueOnce(upsertQuery)
      .mockReturnValueOnce(updateQuery);
    const service = await createService({ from });

    await expect(
      service.updatePreferences('user-1', { order_updates: false }),
    ).resolves.toMatchObject({ order_updates: false });
    expect(updateQuery.update).toHaveBeenCalledWith({ order_updates: false });
    expect(updateQuery.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('does not create notifications for disabled categories', async () => {
    const upsertQuery = query({ data: null, error: null });
    const selectQuery = query({
      data: { ...preferenceRow, offers_promotions: false },
      error: null,
    });
    const from = jest
      .fn()
      .mockReturnValueOnce(upsertQuery)
      .mockReturnValueOnce(selectQuery);
    const service = await createService({ from });

    await expect(
      service.createNotification('user-1', {
        category: 'offers_promotions',
        title: 'Offer',
        body: 'A new offer',
      }),
    ).resolves.toBeNull();
    expect(from).toHaveBeenCalledTimes(2);
  });

  it('creates enabled-category notifications for the specified recipient', async () => {
    const upsertQuery = query({ data: null, error: null });
    const selectPreferences = query({ data: preferenceRow, error: null });
    const insertQuery = query({ data: notificationRow, error: null });
    const from = jest
      .fn()
      .mockReturnValueOnce(upsertQuery)
      .mockReturnValueOnce(selectPreferences)
      .mockReturnValueOnce(insertQuery);
    const service = await createService({ from });

    await expect(
      service.createNotification('user-1', {
        category: 'order_updates',
        title: 'Order confirmed',
        body: 'Your order is confirmed.',
      }),
    ).resolves.toMatchObject({ id: 'notif-1', category: 'order_updates' });

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        category: 'order_updates',
      }),
    );
  });

  it('returns the existing notification when an outbox event is retried', async () => {
    const eventKey = 'payment_confirmed:order-1';
    const initializePreferences = query({ data: null, error: null });
    const selectPreferences = query({ data: preferenceRow, error: null });
    const insertNotification = query({ data: null, error: null });
    const existingNotification = query({
      data: { ...notificationRow, source_event_key: eventKey },
      error: null,
    });
    const from = jest
      .fn()
      .mockReturnValueOnce(initializePreferences)
      .mockReturnValueOnce(selectPreferences)
      .mockReturnValueOnce(insertNotification)
      .mockReturnValueOnce(existingNotification);
    const service = await createService({ from });

    await expect(
      service.createNotification(
        'user-1',
        {
          category: 'order_updates',
          title: 'Payment received — order placed',
          body: 'Payment for order A-1001 is confirmed.',
        },
        eventKey,
      ),
    ).resolves.toMatchObject({ id: 'notif-1', category: 'order_updates' });

    expect(insertNotification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        source_event_key: eventKey,
      }),
      { onConflict: 'source_event_key', ignoreDuplicates: true },
    );
    expect(existingNotification.eq).toHaveBeenCalledWith(
      'source_event_key',
      eventKey,
    );
  });

  it('does not suppress an already-inserted event when the preference is later disabled', async () => {
    const eventKey = 'payment_confirmed:order-1';
    const initializePreferences = query({ data: null, error: null });
    const selectPreferences = query({
      data: { ...preferenceRow, order_updates: false },
      error: null,
    });
    const existingNotification = query({
      data: { ...notificationRow, source_event_key: eventKey },
      error: null,
    });
    const from = jest
      .fn()
      .mockReturnValueOnce(initializePreferences)
      .mockReturnValueOnce(selectPreferences)
      .mockReturnValueOnce(existingNotification);
    const service = await createService({ from });

    await expect(
      service.createNotification(
        'user-1',
        {
          category: 'order_updates',
          title: 'Payment received — order placed',
          body: 'Payment for order A-1001 is confirmed.',
        },
        eventKey,
      ),
    ).resolves.toMatchObject({ id: 'notif-1' });
    expect(from).toHaveBeenCalledTimes(3);
    expect(existingNotification.upsert).not.toHaveBeenCalled();
  });

  it('fails explicitly when an event key is already associated with another customer', async () => {
    const eventKey = 'payment_confirmed:order-1';
    const initializePreferences = query({ data: null, error: null });
    const selectPreferences = query({ data: preferenceRow, error: null });
    const insertNotification = query({ data: null, error: null });
    const existingNotification = query({
      data: { ...notificationRow, user_id: 'user-2', source_event_key: eventKey },
      error: null,
    });
    const from = jest
      .fn()
      .mockReturnValueOnce(initializePreferences)
      .mockReturnValueOnce(selectPreferences)
      .mockReturnValueOnce(insertNotification)
      .mockReturnValueOnce(existingNotification);
    const service = await createService({ from });

    await expect(
      service.createNotification(
        'user-1',
        {
          category: 'order_updates',
          title: 'Payment received — order placed',
          body: 'Payment for order A-1001 is confirmed.',
        },
        eventKey,
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
