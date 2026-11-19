import { ServiceUnavailableException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('fails closed without Supabase admin client', async () => {
    const service = new AdminService(null);
    await expect(service.getDashboard()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(
      service.getSession('user-1', 'token'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
