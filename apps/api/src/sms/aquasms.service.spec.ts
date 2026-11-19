import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AquaSmsService } from './aquasms.service';

describe('AquaSmsService', () => {
  const configured = {
    username: 'user',
    apiKey: 'secret-key',
    senderName: 'AAHAA',
    smsType: 'TRANS',
    peid: 'PEID',
    templateId: 'TMPL',
    messageTemplate: 'Your Aahaa OTP is {otp}. Do not share it.',
    endpoint: 'https://login.aquasms.com/v2/sendSMS',
    configured: true,
  };

  function buildService(aqua = configured) {
    const configService = {
      get: jest.fn().mockReturnValue(aqua),
    } as unknown as ConfigService;
    return new AquaSmsService(configService);
  }

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.AQUASMS_HTTP_METHOD;
  });

  it('renders the DLT template with the OTP placeholder', () => {
    const service = buildService();
    expect(service.renderOtpMessage('4821')).toBe(
      'Your Aahaa OTP is 4821. Do not share it.',
    );
  });

  it('rejects templates without {otp}', () => {
    const service = buildService({
      ...configured,
      messageTemplate: 'OTP missing placeholder',
    });
    expect(() => service.renderOtpMessage('4821')).toThrow(
      ServiceUnavailableException,
    );
  });

  it('treats AquaSMS array error payloads as failure even on HTTP 200', () => {
    const service = buildService();
    expect(
      service.isProviderSuccess(
        200,
        JSON.stringify([{ msg: 'invalid apikey', cost: 0, msgid: '', status: 'error' }]),
      ),
    ).toBe(false);
  });

  it('accepts only explicit AquaSMS success payloads', () => {
    const service = buildService();
    expect(
      service.isProviderSuccess(
        200,
        JSON.stringify([{ msg: 'submitted', status: 'success', msgid: '1' }]),
      ),
    ).toBe(true);
    expect(service.isProviderSuccess(200, '{"hello":"world"}')).toBe(false);
    expect(service.isProviderSuccess(200, '')).toBe(false);
  });

  it('extracts msgid from sendSMS success payloads', () => {
    const service = buildService();
    expect(
      service.extractMessageId(
        JSON.stringify([
          { msg: 'successfully submitted', cost: 1, msgid: '91827364', status: 'success' },
        ]),
      ),
    ).toBe('91827364');
    expect(service.extractMessageId('{"no":"id"}')).toBeNull();
  });

  it('defaults to GET with query params, returns msgid, and remembers submission', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      text: async () =>
        JSON.stringify([
          { status: 'success', msg: 'successfully submitted', msgid: '91827364', cost: 1 },
        ]),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = buildService();
    const result = await service.sendTransactionalSms({
      phone10: '9876543210',
      message: 'Your Aahaa OTP is 4821. Do not share it.',
    });

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe('91827364');
    expect(service.listRecentSubmissions()[0]).toMatchObject({
      messageId: '91827364',
      phoneTail: '3210',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('GET');
    expect(url).toContain('https://login.aquasms.com/v2/sendSMS?');
    expect(url).toContain('username=user');
    expect(url).toContain('smstype=TRANS');
    expect(url).toContain('numbers=9876543210');
    expect(url).toContain('apikey=secret-key');
    expect(url).toContain('peid=PEID');
    expect(url).toContain('templateid=TMPL');
    expect(url).toContain('message=Your+Aahaa+OTP+is+4821.+Do+not+share+it.');
  });

  it('posts URL-encoded params when AQUASMS_HTTP_METHOD=POST', async () => {
    process.env.AQUASMS_HTTP_METHOD = 'POST';
    const fetchMock = jest.fn().mockResolvedValue({
      status: 200,
      text: async () =>
        JSON.stringify([{ status: 'success', msg: 'submitted', msgid: 'abc' }]),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const service = buildService();
    const result = await service.sendTransactionalSms({
      phone10: '9876543210',
      message: 'Your Aahaa OTP is 4821. Do not share it.',
    });

    expect(result.ok).toBe(true);
    expect(result.messageId).toBe('abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(String(headers['Content-Type'] ?? '')).toContain(
      'application/x-www-form-urlencoded',
    );
    const body = String(init.body);
    expect(body).toContain('username=user');
    expect(body).toContain('smstype=TRANS');
    expect(body).toContain('numbers=9876543210');
    expect(body).toContain('apikey=secret-key');
    expect(body).toContain('peid=PEID');
    expect(body).toContain('templateid=TMPL');
    expect(body).toContain('message=Your+Aahaa+OTP+is+4821.+Do+not+share+it.');
  });

  it('throws when the provider reports failure', async () => {
    process.env.AQUASMS_HTTP_METHOD = 'POST';
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      text: async () =>
        JSON.stringify([{ msg: 'invalid apikey', cost: 0, msgid: '', status: 'error' }]),
    }) as unknown as typeof fetch;

    const service = buildService();
    await expect(
      service.sendTransactionalSms({
        phone10: '9876543210',
        message: 'Your Aahaa OTP is 4821. Do not share it.',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  describe('getDeliveryReport', () => {
    it('classifies delivered responses without treating HTTP 200 alone as delivery', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () =>
          JSON.stringify([{ msgid: '91827364', status: 'DELIVRD', DLR: 'Delivered' }]),
      }) as unknown as typeof fetch;

      const service = buildService();
      const report = await service.getDeliveryReport('91827364');

      expect(report.deliveryStatus).toBe('delivered');
      expect(report.messageId).toBe('91827364');
      expect(report.httpStatus).toBe(200);
      const [url] = (global.fetch as jest.Mock).mock.calls[0] as [string];
      expect(url).toContain('https://login.aquasms.com/getDLR?');
      expect(url).not.toContain('/v2/getDLR');
      expect(url).toContain('username=user');
      expect(url).toContain('apikey=secret-key');
      expect(url).toContain('msgid=91827364');
    });

    it('classifies AquaSMS dlr_status UNDELIV as failed', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify([{ dlr_status: 'UNDELIV' }]),
      }) as unknown as typeof fetch;

      const service = buildService();
      const report = await service.getDeliveryReport('28148616');
      expect(report.deliveryStatus).toBe('failed');
      expect(report.providerHints.some((h) => h.includes('dlr_status=UNDELIV'))).toBe(
        true,
      );
    });

    it('does not treat v2 MESSAGES NOT FOUND as delivered', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () =>
          JSON.stringify({ error: 'MESSAGES NOT FOUND', status: 'ERROR' }),
      }) as unknown as typeof fetch;

      const service = buildService();
      const report = await service.getDeliveryReport('28148616');
      expect(report.deliveryStatus).toBe('unknown');
      expect(report.deliveryStatus).not.toBe('delivered');
    });

    it('classifies pending / submitted DLR payloads', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify([{ status: 'SUBMITTED', msg: 'Pending with operator' }]),
      }) as unknown as typeof fetch;

      const service = buildService();
      expect((await service.getDeliveryReport('1')).deliveryStatus).toBe('pending');
    });

    it('classifies failed and rejected DLR payloads', async () => {
      const service = buildService();

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify([{ status: 'UNDELIV', msg: 'Failed at operator' }]),
      }) as unknown as typeof fetch;
      expect((await service.getDeliveryReport('2')).deliveryStatus).toBe('failed');

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify([{ status: 'REJECTED', msg: 'Rejected by DND' }]),
      }) as unknown as typeof fetch;
      expect((await service.getDeliveryReport('3')).deliveryStatus).toBe('rejected');
    });

    it('classifies invalid msgid responses observed from AquaSMS', async () => {
      const service = buildService();

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () =>
          JSON.stringify({ error: 'INVALID MESSAGE ID', status: 'ERROR' }),
      }) as unknown as typeof fetch;
      expect((await service.getDeliveryReport('0')).deliveryStatus).toBe(
        'invalid_msgid',
      );

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () =>
          JSON.stringify([{ responseCode: 'INVALID MESSAGE ID' }]),
      }) as unknown as typeof fetch;
      expect((await service.getDeliveryReport('0')).deliveryStatus).toBe(
        'invalid_msgid',
      );
    });

    it('marks unexpected formats as unknown and does not invent delivery', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        text: async () => JSON.stringify({ hello: 'world' }),
      }) as unknown as typeof fetch;

      const service = buildService();
      const report = await service.getDeliveryReport('xyz');
      expect(report.deliveryStatus).toBe('unknown');
      expect(report.providerBodySanitized).toContain('hello');
    });

    it('throws when AquaSMS DLR is unreachable', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down')) as unknown as typeof fetch;
      const service = buildService();
      await expect(service.getDeliveryReport('91827364')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
