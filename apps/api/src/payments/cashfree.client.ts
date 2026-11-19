import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { CashfreeEnvironmentName } from './payments.types';

export type CashfreeCreateOrderInput = {
  orderId: string;
  amount: number;
  currency: string;
  customerId: string;
  customerPhone: string;
  customerName: string;
  returnUrl: string;
  orderNote?: string;
};

export type CashfreeCreatedOrder = {
  orderId: string;
  cfOrderId: string | null;
  paymentSessionId: string;
  orderStatus: string | null;
  orderAmount: number | null;
  orderCurrency: string | null;
};

export type CashfreeFetchedOrder = {
  orderId: string;
  cfOrderId: string | null;
  paymentSessionId: string | null;
  orderStatus: string | null;
  orderAmount: number | null;
  orderCurrency: string | null;
};

type CashfreeApiErrorBody = {
  message?: string | string[];
  code?: string;
  type?: string;
};

/** Match scripts/check-cashfree-auth.mjs — verified working against sandbox. */
const CASHFREE_API_VERSION = '2025-01-01';

@Injectable()
export class CashfreeClient {
  private readonly logger = new Logger(CashfreeClient.name);

  constructor(private readonly configService: ConfigService) {}

  getEnvironmentName(): CashfreeEnvironmentName {
    const env = (
      this.configService.get<string>('cashfree.env') ?? 'SANDBOX'
    ).toUpperCase();
    return env === 'PRODUCTION' ? 'PRODUCTION' : 'SANDBOX';
  }

  getFrontendMode(): 'sandbox' | 'production' {
    return this.getEnvironmentName() === 'PRODUCTION' ? 'production' : 'sandbox';
  }

  private getCredentials(): { appId: string; secretKey: string } {
    const appId = this.configService.get<string>('cashfree.appId')?.trim() ?? '';
    const secretKey =
      this.configService.get<string>('cashfree.secretKey')?.trim() ?? '';

    if (!appId || !secretKey) {
      throw new ServiceUnavailableException(
        'Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY on the API server.',
      );
    }

    if (this.getEnvironmentName() === 'PRODUCTION') {
      throw new ServiceUnavailableException(
        'Cashfree PRODUCTION mode is disabled for this integration. Use CASHFREE_ENV=SANDBOX.',
      );
    }

    return { appId, secretKey };
  }

  private getBaseUrl(): string {
    return 'https://sandbox.cashfree.com/pg';
  }

  private buildHeaders(appId: string, secretKey: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-client-id': appId,
      'x-client-secret': secretKey,
      'x-api-version': CASHFREE_API_VERSION,
    };
  }

  /**
   * Cashfree/CloudFront WAF returns HTTP 403 HTML for loopback return_url values
   * (http://localhost, 127.0.0.1). The auth script succeeds because it omits return_url.
   */
  private isLoopbackReturnUrl(returnUrl: string): boolean {
    try {
      const host = new URL(returnUrl).hostname.toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '::1';
    } catch {
      return false;
    }
  }

  async createOrder(
    input: CashfreeCreateOrderInput,
  ): Promise<CashfreeCreatedOrder> {
    const { appId, secretKey } = this.getCredentials();
    try {
      const body: Record<string, unknown> = {
        order_id: input.orderId,
        order_amount: input.amount,
        order_currency: input.currency,
        customer_details: {
          customer_id: input.customerId,
          customer_phone: input.customerPhone,
          customer_name: input.customerName,
        },
        order_note: input.orderNote,
        order_tags: {
          aahaa_checkout: 'bus_food_delivery',
        },
      };

      if (input.returnUrl && !this.isLoopbackReturnUrl(input.returnUrl)) {
        body.order_meta = { return_url: input.returnUrl };
      } else if (input.returnUrl) {
        this.logger.warn(
          'Omitting Cashfree order_meta.return_url because loopback hosts are blocked by Cashfree WAF (use a public https frontend URL for redirect-after-pay).',
        );
      }

      const response = await fetch(`${this.getBaseUrl()}/orders`, {
        method: 'POST',
        headers: this.buildHeaders(appId, secretKey),
        body: JSON.stringify(body),
      });

      const payload = await this.readJson(response);
      if (!response.ok) {
        throw this.toFetchError(response.status, payload);
      }

      const data = (payload ?? {}) as Record<string, unknown>;
      const paymentSessionId =
        typeof data.payment_session_id === 'string'
          ? data.payment_session_id.trim()
          : '';
      if (!paymentSessionId) {
        throw new ServiceUnavailableException(
          'Cashfree did not return a payment session id.',
        );
      }

      return {
        orderId:
          typeof data.order_id === 'string' ? data.order_id : input.orderId,
        cfOrderId:
          data.cf_order_id != null ? String(data.cf_order_id) : null,
        paymentSessionId,
        orderStatus:
          typeof data.order_status === 'string' ? data.order_status : null,
        orderAmount:
          typeof data.order_amount === 'number' ? data.order_amount : null,
        orderCurrency:
          typeof data.order_currency === 'string' ? data.order_currency : null,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logCashfreeFailure('create order', input.orderId, error);
      throw this.toHttpException(error, 'Unable to create Cashfree payment session');
    }
  }

  async fetchOrder(cashfreeOrderId: string): Promise<CashfreeFetchedOrder> {
    const { appId, secretKey } = this.getCredentials();
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/orders/${encodeURIComponent(cashfreeOrderId)}`,
        {
          method: 'GET',
          headers: this.buildHeaders(appId, secretKey),
        },
      );

      const payload = await this.readJson(response);
      if (!response.ok) {
        throw this.toFetchError(response.status, payload);
      }

      const data = (payload ?? {}) as Record<string, unknown>;
      return {
        orderId:
          typeof data.order_id === 'string' ? data.order_id : cashfreeOrderId,
        cfOrderId:
          data.cf_order_id != null ? String(data.cf_order_id) : null,
        paymentSessionId:
          typeof data.payment_session_id === 'string'
            ? data.payment_session_id
            : null,
        orderStatus:
          typeof data.order_status === 'string' ? data.order_status : null,
        orderAmount:
          typeof data.order_amount === 'number' ? data.order_amount : null,
        orderCurrency:
          typeof data.order_currency === 'string' ? data.order_currency : null,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logCashfreeFailure('fetch order', cashfreeOrderId, error);
      throw this.toHttpException(error, 'Unable to fetch Cashfree payment status');
    }
  }

  async fetchLatestPaymentId(cashfreeOrderId: string): Promise<string | null> {
    const { appId, secretKey } = this.getCredentials();
    try {
      const response = await fetch(
        `${this.getBaseUrl()}/orders/${encodeURIComponent(cashfreeOrderId)}/payments`,
        {
          method: 'GET',
          headers: this.buildHeaders(appId, secretKey),
        },
      );
      const payload = await this.readJson(response);
      if (!response.ok) {
        return null;
      }

      const payments = Array.isArray(payload) ? payload : [];
      const success = payments.find(
        (payment) =>
          payment &&
          typeof payment === 'object' &&
          String(
            (payment as { payment_status?: string }).payment_status ?? '',
          ).toUpperCase() === 'SUCCESS',
      ) as { cf_payment_id?: string | number } | undefined;
      const chosen =
        success ??
        (payments[0] as { cf_payment_id?: string | number } | undefined);
      if (!chosen?.cf_payment_id) return null;
      return String(chosen.cf_payment_id);
    } catch {
      return null;
    }
  }

  /**
   * Verify Cashfree webhook HMAC using the original raw body.
   * signedPayload = timestamp + rawBody; signature = Base64(HMAC-SHA256(signedPayload, secret))
   */
  verifyWebhookSignature(
    signature: string,
    rawBody: string,
    timestamp: string,
  ): unknown {
    const webhookSecret =
      this.configService.get<string>('cashfree.webhookSecret')?.trim() ?? '';
    const apiSecret =
      this.configService.get<string>('cashfree.secretKey')?.trim() ?? '';
    const secret = webhookSecret || apiSecret;

    if (!secret) {
      throw new ServiceUnavailableException(
        'Cashfree webhook secret is not configured. Set CASHFREE_WEBHOOK_SECRET or CASHFREE_SECRET_KEY.',
      );
    }

    const expected = createHmac('sha256', secret)
      .update(timestamp + rawBody)
      .digest('base64');

    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signature);
    if (
      expectedBuf.length !== receivedBuf.length ||
      !timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      throw new UnauthorizedException('Invalid Cashfree webhook signature.');
    }

    try {
      return JSON.parse(rawBody) as unknown;
    } catch {
      throw new UnauthorizedException('Cashfree webhook body is not valid JSON.');
    }
  }

  private async readJson(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      const trimmed = text.trimStart();
      if (trimmed.startsWith('<!') || trimmed.toLowerCase().includes('<html')) {
        return {
          code: 'waf_or_edge_block',
          type: 'html_error',
          message:
            'Cashfree edge returned an HTML error page (often loopback return_url or rate limiting).',
        };
      }
      return { message: text.slice(0, 200) };
    }
  }

  private toFetchError(status: number, payload: unknown): Error & {
    response: { status: number; data: CashfreeApiErrorBody };
  } {
    const data = (payload ?? {}) as CashfreeApiErrorBody;
    const message = this.formatApiMessage(data) || `Cashfree HTTP ${status}`;
    const error = new Error(message) as Error & {
      response: { status: number; data: CashfreeApiErrorBody };
    };
    error.response = { status, data };
    return error;
  }

  private toHttpException(error: unknown, fallback: string): never {
    const details = this.extractErrorDetails(error);
    const message = details.message;
    const normalized = message.toLowerCase();
    if (
      normalized.includes('authentication failed') ||
      normalized.includes('invalid client') ||
      normalized.includes('unauthorized')
    ) {
      throw new ServiceUnavailableException(
        'Cashfree authentication failed. Check CASHFREE_APP_ID and CASHFREE_SECRET_KEY in apps/api/.env are your TEST/SANDBOX credentials, then restart the API.',
      );
    }
    if (
      details.httpStatus === 403 ||
      normalized.includes('html') ||
      normalized.includes('could not be satisfied')
    ) {
      throw new ServiceUnavailableException(
        'Cashfree blocked the payment session request (HTTP 403). For local/dev, loopback return URLs are omitted automatically; retry after a short wait if you were rate-limited.',
      );
    }
    throw new ServiceUnavailableException(message || fallback);
  }

  /** Safe diagnostics only — never log App ID, secret, auth headers, or session IDs. */
  private logCashfreeFailure(
    action: string,
    merchantOrderId: string,
    error: unknown,
  ): void {
    const details = this.extractErrorDetails(error);
    const appId = this.configService.get<string>('cashfree.appId')?.trim() ?? '';
    const secretKey =
      this.configService.get<string>('cashfree.secretKey')?.trim() ?? '';
    this.logger.warn(
      `Cashfree ${action} failed for merchant order ${merchantOrderId} httpStatus=${details.httpStatus ?? 'n/a'} code=${details.code ?? 'n/a'} type=${details.type ?? 'n/a'} message=${details.message || 'n/a'} env=${this.getEnvironmentName()} apiVersion=${CASHFREE_API_VERSION} baseUrl=${this.getBaseUrl()} hasAppId=${Boolean(appId)} appIdLen=${appId.length} appIdStartsWithTEST=${appId.startsWith('TEST')} hasSecret=${Boolean(secretKey)} secretLen=${secretKey.length} secretStartsWithCfsk=${secretKey.startsWith('cfsk_')}`,
    );
  }

  private formatApiMessage(data: CashfreeApiErrorBody): string {
    if (Array.isArray(data.message)) {
      return data.message
        .filter((part) => typeof part === 'string')
        .join(', ')
        .trim();
    }
    if (typeof data.message === 'string') {
      return data.message.trim();
    }
    return '';
  }

  private extractErrorDetails(error: unknown): {
    httpStatus: number | null;
    code: string | null;
    type: string | null;
    message: string;
  } {
    if (!error || typeof error !== 'object') {
      return { httpStatus: null, code: null, type: null, message: '' };
    }
    const maybe = error as {
      response?: {
        status?: number;
        data?: CashfreeApiErrorBody;
      };
      message?: string;
    };
    const data = maybe.response?.data;
    const message =
      (data ? this.formatApiMessage(data) : '') ||
      (typeof maybe.message === 'string' ? maybe.message : '');
    return {
      httpStatus:
        typeof maybe.response?.status === 'number'
          ? maybe.response.status
          : null,
      code: typeof data?.code === 'string' ? data.code : null,
      type: typeof data?.type === 'string' ? data.type : null,
      message: message.slice(0, 200),
    };
  }

  private extractMessage(error: unknown): string {
    return this.extractErrorDetails(error).message;
  }
}
