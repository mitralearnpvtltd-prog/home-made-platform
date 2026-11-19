import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';
import type { PaymentStatus } from '../orders/orders.types';
import { CashfreeClient } from './cashfree.client';
import type {
  OrderPaymentRow,
  PaymentSessionResponse,
  PaymentStatusResponse,
  PaymentVerifyResponse,
} from './payments.types';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly cashfree: CashfreeClient,
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly admin: SupabaseClient | null,
  ) {}

  async createSession(
    userId: string,
    orderId: string,
  ): Promise<PaymentSessionResponse> {
    const client = this.requireAdmin();
    const order = await this.loadOwnedOrder(client, userId, orderId);

    if (order.payment_status === 'paid') {
      throw new ConflictException('This order is already paid.');
    }
    if (order.payment_status === 'refunded') {
      throw new ConflictException('This order was refunded and cannot be paid again.');
    }

    const amount = this.toNumber(order.total);
    const currency = (order.currency || 'INR').toUpperCase();
    if (currency !== 'INR') {
      throw new BadRequestException('Only INR payments are supported.');
    }
    if (!(amount > 0)) {
      throw new BadRequestException('Order total must be greater than zero.');
    }

    // Reuse an active Cashfree session when possible (idempotent retries).
    if (order.cashfree_order_id && order.cashfree_payment_session_id) {
      try {
        const existing = await this.cashfree.fetchOrder(order.cashfree_order_id);
        if (
          existing.orderStatus === 'ACTIVE' &&
          existing.paymentSessionId &&
          this.amountsMatch(existing.orderAmount, amount) &&
          (existing.orderCurrency ?? 'INR').toUpperCase() === currency
        ) {
          return {
            orderId: order.id,
            orderNumber: order.order_number,
            amount,
            currency,
            paymentSessionId: existing.paymentSessionId,
            cashfreeOrderId: existing.orderId,
            environment: this.cashfree.getFrontendMode(),
            paymentStatus: order.payment_status as PaymentStatus,
          };
        }
        if (existing.orderStatus === 'PAID') {
          await this.applyPaymentResult({
            orderId: order.id,
            paymentStatus: 'paid',
            cashfreeOrderId: existing.orderId,
            cashfreeCfOrderId: existing.cfOrderId,
            expectedTotal: amount,
            expectedCurrency: currency,
          });
          throw new ConflictException('This order is already paid.');
        }
      } catch (error) {
        if (error instanceof ConflictException) throw error;
        // Fall through and create a fresh Cashfree order for expired/failed sessions.
      }
    }

    const cashfreeOrderId = this.buildCashfreeOrderId(order.id);
    const returnUrl = this.buildReturnUrl(order.kitchen_id, order.id);
    const created = await this.cashfree.createOrder({
      orderId: cashfreeOrderId,
      amount,
      currency,
      customerId: this.toCustomerId(userId),
      customerPhone: this.toCustomerPhone(order.collector_phone),
      customerName: order.collector_name.trim() || 'Aahaa customer',
      returnUrl,
      orderNote: `Aahaa order ${order.order_number}`,
    });

    if (
      created.orderAmount != null &&
      !this.amountsMatch(created.orderAmount, amount)
    ) {
      throw new ServiceUnavailableException(
        'Cashfree order amount did not match the saved Aahaa order total.',
      );
    }

    const attached = await client.rpc('order_attach_cashfree_session', {
      p_user_id: userId,
      p_order_id: order.id,
      p_cashfree_order_id: created.orderId,
      p_payment_session_id: created.paymentSessionId,
      p_cashfree_cf_order_id: created.cfOrderId,
    });

    if (attached.error) {
      this.throwRpcError(attached.error.message, 'Unable to store payment session');
    }
    if (attached.data !== true) {
      throw new ConflictException(
        'Unable to attach a payment session. The order may already be paid.',
      );
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      amount,
      currency,
      paymentSessionId: created.paymentSessionId,
      cashfreeOrderId: created.orderId,
      environment: this.cashfree.getFrontendMode(),
      paymentStatus: order.payment_status as PaymentStatus,
    };
  }

  async verifyPayment(
    userId: string,
    orderId: string,
  ): Promise<PaymentVerifyResponse> {
    const client = this.requireAdmin();
    const order = await this.loadOwnedOrder(client, userId, orderId);

    if (order.payment_status === 'paid') {
      return {
        orderId: order.id,
        paymentStatus: 'paid',
        cashfreeOrderId: order.cashfree_order_id,
        cashfreeOrderStatus: 'PAID',
        alreadyPaid: true,
        verified: true,
      };
    }

    if (!order.cashfree_order_id) {
      return {
        orderId: order.id,
        paymentStatus: order.payment_status as PaymentStatus,
        cashfreeOrderId: null,
        cashfreeOrderStatus: null,
        alreadyPaid: false,
        verified: false,
      };
    }

    const fetched = await this.cashfree.fetchOrder(order.cashfree_order_id);
    const mapped = this.mapCashfreeOrderStatus(fetched.orderStatus);
    const paymentId = await this.cashfree.fetchLatestPaymentId(fetched.orderId);

    if (
      fetched.orderAmount != null &&
      !this.amountsMatch(fetched.orderAmount, this.toNumber(order.total))
    ) {
      throw new BadRequestException(
        'Cashfree order amount does not match the saved Aahaa order total.',
      );
    }

    const applied = await this.applyPaymentResult({
      orderId: order.id,
      paymentStatus: mapped,
      cashfreeOrderId: fetched.orderId,
      cashfreePaymentId: paymentId,
      cashfreeCfOrderId: fetched.cfOrderId,
      expectedTotal: this.toNumber(order.total),
      expectedCurrency: order.currency || 'INR',
    });

    return {
      orderId: order.id,
      paymentStatus: applied.paymentStatus,
      cashfreeOrderId: fetched.orderId,
      cashfreeOrderStatus: fetched.orderStatus,
      alreadyPaid: applied.alreadyPaid,
      verified: true,
    };
  }

  async getPaymentStatus(
    userId: string,
    orderId: string,
  ): Promise<PaymentStatusResponse> {
    const client = this.requireAdmin();
    const order = await this.loadOwnedOrder(client, userId, orderId);
    return {
      orderId: order.id,
      paymentStatus: order.payment_status as PaymentStatus,
      total: this.toNumber(order.total),
      currency: order.currency || 'INR',
      cashfreeOrderId: order.cashfree_order_id,
      verifiedAt: order.payment_verified_at,
    };
  }

  async handleWebhook(
    signature: string | undefined,
    timestamp: string | undefined,
    rawBody: Buffer | string | undefined,
  ): Promise<{ ok: true; duplicate?: boolean }> {
    if (!signature || !timestamp) {
      throw new UnauthorizedException('Missing Cashfree webhook signature headers.');
    }
    if (!rawBody) {
      throw new BadRequestException('Missing raw webhook body.');
    }

    const raw =
      typeof rawBody === 'string' ? rawBody : rawBody.toString('utf8');

    let verified: unknown;
    try {
      verified = this.cashfree.verifyWebhookSignature(signature, raw, timestamp);
    } catch {
      throw new UnauthorizedException('Invalid Cashfree webhook signature.');
    }

    const payload =
      verified && typeof verified === 'object' && 'object' in (verified as object)
        ? ((verified as { object?: unknown }).object ?? verified)
        : this.safeJsonParse(raw);

    const eventType = this.readString(
      payload,
      ['type', 'event_type'],
    );
    const data = this.readObject(payload, 'data') ?? payload;
    const orderObj = this.readObject(data, 'order') ?? {};
    const paymentObj = this.readObject(data, 'payment') ?? {};

    const cashfreeOrderId =
      this.readString(orderObj, ['order_id']) ||
      this.readString(data, ['order_id']);
    const cfPaymentId =
      this.readString(paymentObj, ['cf_payment_id', 'payment_id']) ||
      this.readString(data, ['cf_payment_id']);
    const orderAmount = this.readNumber(orderObj, ['order_amount', 'orderAmount']);
    const orderCurrency =
      this.readString(orderObj, ['order_currency', 'orderCurrency']) || 'INR';
    const paymentStatusRaw =
      this.readString(paymentObj, ['payment_status', 'paymentStatus']) ||
      this.readString(orderObj, ['order_status', 'orderStatus']);

    const eventId =
      this.readString(payload, ['event_id', 'eventId']) ||
      `${timestamp}:${createHash('sha256').update(raw).digest('hex').slice(0, 32)}`;
    const payloadHash = createHash('sha256').update(raw).digest('hex');

    const aahaaOrderId = cashfreeOrderId
      ? await this.findOrderIdByCashfreeOrderId(cashfreeOrderId)
      : null;

    const client = this.requireAdmin();
    const recorded = await client.rpc('payment_webhook_event_record', {
      p_provider: 'cashfree',
      p_event_id: eventId,
      p_event_type: eventType,
      p_order_id: aahaaOrderId,
      p_cashfree_order_id: cashfreeOrderId,
      p_payload_hash: payloadHash,
    });

    if (recorded.error) {
      this.throwRpcError(recorded.error.message, 'Unable to record webhook event');
    }
    if (recorded.data !== true) {
      return { ok: true, duplicate: true };
    }

    if (!aahaaOrderId || !cashfreeOrderId) {
      this.logger.warn('Cashfree webhook ignored: could not resolve Aahaa order');
      return { ok: true };
    }

    const mapped = this.mapWebhookPaymentStatus(eventType, paymentStatusRaw);
    if (!mapped) {
      return { ok: true };
    }

    const order = await this.loadOrderById(client, aahaaOrderId);
    if (
      orderAmount != null &&
      !this.amountsMatch(orderAmount, this.toNumber(order.total))
    ) {
      this.logger.warn(
        `Cashfree webhook amount mismatch for order ${aahaaOrderId}; ignored`,
      );
      return { ok: true };
    }

    await this.applyPaymentResult({
      orderId: aahaaOrderId,
      paymentStatus: mapped,
      cashfreeOrderId,
      cashfreePaymentId: cfPaymentId,
      expectedTotal: this.toNumber(order.total),
      expectedCurrency: orderCurrency || order.currency || 'INR',
    });

    return { ok: true };
  }

  private async applyPaymentResult(input: {
    orderId: string;
    paymentStatus: PaymentStatus;
    cashfreeOrderId?: string | null;
    cashfreePaymentId?: string | null;
    cashfreeCfOrderId?: string | null;
    expectedTotal: number;
    expectedCurrency: string;
  }): Promise<{ paymentStatus: PaymentStatus; alreadyPaid: boolean }> {
    const client = this.requireAdmin();
    const { data, error } = await client.rpc('order_apply_payment_result', {
      p_order_id: input.orderId,
      p_payment_status: input.paymentStatus,
      p_cashfree_order_id: input.cashfreeOrderId ?? null,
      p_cashfree_payment_id: input.cashfreePaymentId ?? null,
      p_cashfree_cf_order_id: input.cashfreeCfOrderId ?? null,
      p_expected_total: input.expectedTotal,
      p_expected_currency: input.expectedCurrency,
    });

    if (error) {
      this.throwRpcError(error.message, 'Unable to update payment status');
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      paymentStatus: (row?.payment_status as PaymentStatus) ?? input.paymentStatus,
      alreadyPaid: Boolean(row?.already_paid),
    };
  }

  private async loadOwnedOrder(
    client: SupabaseClient,
    userId: string,
    orderId: string,
  ): Promise<OrderPaymentRow> {
    const order = await this.loadOrderById(client, orderId);
    if (order.user_id !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }
    return order;
  }

  private async loadOrderById(
    client: SupabaseClient,
    orderId: string,
  ): Promise<OrderPaymentRow> {
    const { data, error } = await client
      .from('orders')
      .select(
        `
        id,
        user_id,
        order_number,
        kitchen_id,
        payment_status,
        collector_name,
        collector_phone,
        total,
        currency,
        cashfree_order_id,
        cashfree_cf_order_id,
        cashfree_payment_session_id,
        cashfree_payment_id,
        payment_session_created_at,
        payment_verified_at
      `,
      )
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      if (/cashfree_order_id|column .* does not exist/i.test(error.message)) {
        throw new ServiceUnavailableException(
          'Cashfree payment columns are missing. Apply migration 20261128000000_cashfree_payments.sql, then retry.',
        );
      }
      throw new ServiceUnavailableException('Unable to load order for payment');
    }
    if (!data) {
      throw new NotFoundException('Order not found');
    }
    return data as OrderPaymentRow;
  }

  private async findOrderIdByCashfreeOrderId(
    cashfreeOrderId: string,
  ): Promise<string | null> {
    const client = this.requireAdmin();
    const { data, error } = await client
      .from('orders')
      .select('id')
      .eq('cashfree_order_id', cashfreeOrderId)
      .maybeSingle();

    if (!error && data?.id) {
      return data.id as string;
    }

    const uuidMatch = cashfreeOrderId.match(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
    return uuidMatch?.[0] ?? null;
  }

  private buildCashfreeOrderId(orderId: string): string {
    // Cashfree order_id max length is 50. Keep the UUID (for lookup) + compact time.
    const compactTime = Date.now().toString(36);
    return `a_${orderId}_${compactTime}`.slice(0, 50);
  }

  private buildReturnUrl(kitchenId: string, orderId: string): string {
    const base =
      this.configService.get<string>('cashfree.frontendBaseUrl')?.replace(
        /\/$/,
        '',
      ) ?? 'http://localhost:5173';
    return `${base}/cooks/${kitchenId}/payment-return?orderId=${encodeURIComponent(orderId)}`;
  }

  private toCustomerId(userId: string): string {
    return `user_${userId.replace(/-/g, '')}`.slice(0, 50);
  }

  private toCustomerPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 10) {
      return digits.slice(-10);
    }
    return '9999999999';
  }

  private mapCashfreeOrderStatus(status: string | null | undefined): PaymentStatus {
    const normalized = String(status ?? '').toUpperCase();
    if (normalized === 'PAID') return 'paid';
    if (normalized === 'EXPIRED' || normalized === 'TERMINATED') return 'failed';
    return 'pending';
  }

  private mapWebhookPaymentStatus(
    eventType: string | null,
    paymentStatus: string | null,
  ): PaymentStatus | null {
    const type = String(eventType ?? '').toUpperCase();
    const status = String(paymentStatus ?? '').toUpperCase();

    if (
      type.includes('SUCCESS') ||
      status === 'SUCCESS' ||
      status === 'PAID'
    ) {
      return 'paid';
    }
    if (type.includes('REFUND') || status === 'REFUNDED' || status === 'REFUND') {
      return 'refunded';
    }
    if (
      type.includes('FAILED') ||
      type.includes('USER_DROPPED') ||
      status === 'FAILED' ||
      status === 'USER_DROPPED' ||
      status === 'CANCELLED' ||
      status === 'CANCELED'
    ) {
      return 'failed';
    }
    if (type.includes('PENDING') || status === 'PENDING' || status === 'ACTIVE') {
      return 'pending';
    }
    return null;
  }

  private amountsMatch(left: number | null | undefined, right: number): boolean {
    if (left == null || !Number.isFinite(left)) return false;
    return Math.round(left * 100) === Math.round(right * 100);
  }

  private toNumber(value: number | string): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private requireAdmin(): SupabaseClient {
    if (!this.admin) {
      throw new ServiceUnavailableException(
        'Payment persistence requires SUPABASE_SERVICE_ROLE_KEY on the API server only.',
      );
    }
    return this.admin;
  }

  private throwRpcError(message: string, fallback: string): never {
    if (
      /order_attach_cashfree_session|order_apply_payment_result|payment_webhook_event_record|does not exist/i.test(
        message,
      )
    ) {
      throw new ServiceUnavailableException(
        'Cashfree payment RPCs are missing. Apply migration 20261128000000_cashfree_payments.sql, then retry.',
      );
    }
    if (/amount mismatch|currency mismatch|cashfree_order_id does not belong/i.test(message)) {
      throw new BadRequestException(message);
    }
    throw new ServiceUnavailableException(fallback);
  }

  private safeJsonParse(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return {};
    }
  }

  private readObject(
    source: unknown,
    key: string,
  ): Record<string, unknown> | null {
    if (!source || typeof source !== 'object') return null;
    const value = (source as Record<string, unknown>)[key];
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
  }

  private readString(
    source: unknown,
    keys: string[],
  ): string | null {
    if (!source || typeof source !== 'object') return null;
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
    return null;
  }

  private readNumber(
    source: unknown,
    keys: string[],
  ): number | null {
    if (!source || typeof source !== 'object') return null;
    const record = source as Record<string, unknown>;
    for (const key of keys) {
      const value = record[key];
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim()) {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
      }
    }
    return null;
  }
}
