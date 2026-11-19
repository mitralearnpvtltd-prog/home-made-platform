import { Test, TestingModule } from '@nestjs/testing';
import { SUPABASE_CONFIG } from '../supabase/supabase.constants';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  async function createController(isConfigured: boolean) {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: SUPABASE_CONFIG,
          useValue: {
            url: isConfigured ? 'https://example.supabase.co' : '',
            anonKey: isConfigured ? 'test-anon-key' : '',
            serviceRoleKey: '',
            isConfigured,
            hasServiceRoleKey: false,
          },
        },
      ],
    }).compile();

    return module.get(HealthController);
  }

  it('reports supabaseConfigured false when Supabase env is missing', async () => {
    const controller = await createController(false);
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('aahaa-api');
    expect(result.supabaseConfigured).toBe(false);
    expect(typeof result.timestamp).toBe('string');
    expect(result).toEqual(
      expect.objectContaining({
        status: 'ok',
        service: 'aahaa-api',
        supabaseConfigured: false,
      }),
    );
    expect(Object.keys(result).sort()).toEqual(
      ['service', 'status', 'supabaseConfigured', 'timestamp'].sort(),
    );
  });

  it('reports supabaseConfigured true when URL and anon key are present', async () => {
    const controller = await createController(true);
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.supabaseConfigured).toBe(true);
    expect(Object.keys(result).sort()).toEqual(
      ['service', 'status', 'supabaseConfigured', 'timestamp'].sort(),
    );
  });
});
