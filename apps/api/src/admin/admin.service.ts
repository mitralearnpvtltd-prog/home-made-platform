import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN_CLIENT } from '../supabase/supabase.constants';

type OrderMetricRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number | string;
  created_at: string;
  kitchen_id: string;
  collector_name: string;
};

type ApplicationRow = {
  id: string;
  application_id: string;
  status: string;
  full_name: string;
  created_at: string;
};

export type AdminDashboardDto = {
  generatedAt: string;
  metrics: {
    totalOrders: number;
    todayOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalRevenue: number;
    listedKitchens: number;
    registeredCustomers: number;
    pendingCookApplications: number;
    pendingDeliveryApplications: number;
  };
  notes: {
    kitchens: string;
    customers: string;
    revenue: string;
  };
  salesOverview: Array<{
    date: string;
    orderCount: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    collectorName: string;
    createdAt: string;
  }>;
  recentApplications: Array<{
    id: string;
    applicationId: string;
    type: 'cook' | 'delivery_partner';
    fullName: string;
    status: string;
    createdAt: string;
  }>;
};

@Injectable()
export class AdminService {
  constructor(
    @Inject(SUPABASE_ADMIN_CLIENT)
    private readonly adminClient: SupabaseClient | null,
  ) {}

  async getSession(userId: string, accessToken: string) {
    const client = this.requireAdmin();
    const { data: profile, error } = await client
      .from('profiles')
      .select('id, full_name, phone, email, avatar_url')
      .eq('id', userId)
      .maybeSingle();

    if (error || !profile) {
      throw new ServiceUnavailableException('Unable to load admin profile.');
    }

    // Token is already verified by AuthGuard; include it only as presence flag.
    void accessToken;

    return {
      role: 'admin' as const,
      profile: {
        id: profile.id as string,
        fullName: (profile.full_name as string | null) ?? null,
        phone: (profile.phone as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
        avatarUrl: (profile.avatar_url as string | null) ?? null,
      },
    };
  }

  async getDashboard(): Promise<AdminDashboardDto> {
    const client = this.requireAdmin();
    const todayStart = this.startOfTodayIstIso();
    const overviewStart = this.daysAgoIstIso(13);

    const [
      totalOrders,
      todayOrders,
      pendingOrders,
      completedOrders,
      listedKitchens,
      registeredCustomers,
      pendingCookApplications,
      pendingDeliveryApplications,
      recentOrderRows,
      recentCookApps,
      recentDeliveryApps,
      overviewOrders,
      paidOrdersForRevenue,
    ] = await Promise.all([
      this.count(client, 'orders'),
      this.count(client, 'orders', (q) => q.gte('created_at', todayStart)),
      this.count(client, 'orders', (q) =>
        q.not('status', 'in', '(completed,cancelled)'),
      ),
      this.count(client, 'orders', (q) => q.eq('status', 'completed')),
      this.count(client, 'kitchens'),
      this.countCustomerProfiles(client),
      this.count(client, 'cook_applications', (q) => q.eq('status', 'pending')),
      this.count(client, 'delivery_partner_applications', (q) =>
        q.eq('status', 'pending'),
      ),
      client
        .from('orders')
        .select(
          'id, order_number, status, payment_status, total, created_at, kitchen_id, collector_name',
        )
        .order('created_at', { ascending: false })
        .limit(8),
      client
        .from('cook_applications')
        .select('id, application_id, status, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      client
        .from('delivery_partner_applications')
        .select('id, application_id, status, full_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      client
        .from('orders')
        .select('created_at, total, payment_status')
        .gte('created_at', overviewStart),
      client.from('orders').select('total').eq('payment_status', 'paid'),
    ]);

    if (recentOrderRows.error) {
      throw new ServiceUnavailableException('Unable to load recent orders.');
    }
    if (recentCookApps.error || recentDeliveryApps.error) {
      throw new ServiceUnavailableException(
        'Unable to load recent applications.',
      );
    }
    if (overviewOrders.error || paidOrdersForRevenue.error) {
      throw new ServiceUnavailableException('Unable to load sales metrics.');
    }

    const totalRevenue = (paidOrdersForRevenue.data ?? []).reduce(
      (sum, row) => sum + Number(row.total ?? 0),
      0,
    );

    const recentApplications = [
      ...((recentCookApps.data ?? []) as ApplicationRow[]).map((row) => ({
        id: row.id,
        applicationId: row.application_id,
        type: 'cook' as const,
        fullName: row.full_name,
        status: row.status,
        createdAt: row.created_at,
      })),
      ...((recentDeliveryApps.data ?? []) as ApplicationRow[]).map((row) => ({
        id: row.id,
        applicationId: row.application_id,
        type: 'delivery_partner' as const,
        fullName: row.full_name,
        status: row.status,
        createdAt: row.created_at,
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalOrders,
        todayOrders,
        pendingOrders,
        completedOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        listedKitchens,
        registeredCustomers,
        pendingCookApplications,
        pendingDeliveryApplications,
      },
      notes: {
        kitchens:
          'Schema has no kitchen active flag yet; count is all listed kitchens.',
        customers:
          'Count of profiles with the customer role. Admins and unassigned profiles are excluded.',
        revenue: 'Sum of order.total where payment_status is paid.',
      },
      salesOverview: this.buildSalesOverview(
        (overviewOrders.data ?? []) as Array<{
          created_at: string;
          total: number | string;
          payment_status: string;
        }>,
      ),
      recentOrders: ((recentOrderRows.data ?? []) as OrderMetricRow[]).map(
        (row) => ({
          id: row.id,
          orderNumber: row.order_number,
          status: row.status,
          paymentStatus: row.payment_status,
          total: Number(row.total ?? 0),
          collectorName: row.collector_name,
          createdAt: row.created_at,
        }),
      ),
      recentApplications,
    };
  }

  private async countCustomerProfiles(client: SupabaseClient): Promise<number> {
    const { data: role, error: roleError } = await client
      .from('roles')
      .select('id')
      .eq('code', 'customer')
      .maybeSingle();
    if (roleError || !role?.id) {
      return 0;
    }
    const { count, error } = await client
      .from('user_roles')
      .select('id', { count: 'exact', head: true })
      .eq('role_id', role.id);
    if (error) {
      throw new ServiceUnavailableException(
        'Unable to count registered customers.',
      );
    }
    return count ?? 0;
  }

  private async count(
    client: SupabaseClient,
    table: string,
    apply?: (query: {
      eq: (col: string, val: string) => unknown;
      gte: (col: string, val: string) => unknown;
      not: (col: string, op: string, val: string) => unknown;
    }) => unknown,
  ): Promise<number> {
    let query = client.from(table).select('id', { count: 'exact', head: true });
    if (apply) {
      query = apply(query as never) as typeof query;
    }
    const { count, error } = await query;
    if (error) {
      throw new ServiceUnavailableException(
        `Unable to load metric for ${table}.`,
      );
    }
    return count ?? 0;
  }

  private buildSalesOverview(
    rows: Array<{
      created_at: string;
      total: number | string;
      payment_status: string;
    }>,
  ): Array<{ date: string; orderCount: number; revenue: number }> {
    const days: Array<{ date: string; orderCount: number; revenue: number }> =
      [];
    for (let i = 13; i >= 0; i -= 1) {
      const date = this.istDateOffset(-i);
      days.push({ date, orderCount: 0, revenue: 0 });
    }
    const byDate = new Map(days.map((d) => [d.date, d]));
    for (const row of rows) {
      const date = this.toIstDate(row.created_at);
      const bucket = byDate.get(date);
      if (!bucket) continue;
      bucket.orderCount += 1;
      if (row.payment_status === 'paid') {
        bucket.revenue += Number(row.total ?? 0);
      }
    }
    return days.map((d) => ({
      date: d.date,
      orderCount: d.orderCount,
      revenue: Number(d.revenue.toFixed(2)),
    }));
  }

  private startOfTodayIstIso(): string {
    return `${this.istDateOffset(0)}T00:00:00+05:30`;
  }

  private daysAgoIstIso(days: number): string {
    return `${this.istDateOffset(-days)}T00:00:00+05:30`;
  }

  private istDateOffset(dayOffset: number): string {
    const now = new Date();
    const istNow = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
    );
    istNow.setDate(istNow.getDate() + dayOffset);
    const y = istNow.getFullYear();
    const m = String(istNow.getMonth() + 1).padStart(2, '0');
    const d = String(istNow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private toIstDate(iso: string): string {
    const date = new Date(iso);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
    const m = parts.find((p) => p.type === 'month')?.value ?? '01';
    const d = parts.find((p) => p.type === 'day')?.value ?? '01';
    return `${y}-${m}-${d}`;
  }

  private requireAdmin(): SupabaseClient {
    if (!this.adminClient) {
      throw new ServiceUnavailableException(
        'Admin service is unavailable (Supabase service role not configured).',
      );
    }
    return this.adminClient;
  }
}
