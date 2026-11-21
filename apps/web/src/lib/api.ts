import { getAccessToken } from "./authSession";

export type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
  supabaseConfigured: boolean;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiRequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** When true, attach the stored bearer access token if present. */
  auth?: boolean;
};

export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL is not set. Add it to apps/web/.env.local (for example http://localhost:3000/api/v1).",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getApiBaseUrl()}${normalizedPath}`;
}

async function parseErrorMessage(response: Response): Promise<{ message: string; details: unknown }> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const data: unknown = await response.json();
      if (typeof data === "object" && data !== null && "message" in data) {
        const rawMessage = (data as { message?: string | string[] }).message;
        if (Array.isArray(rawMessage)) {
          return { message: rawMessage.join(", "), details: data };
        }
        if (typeof rawMessage === "string" && rawMessage.trim()) {
          return { message: rawMessage, details: data };
        }
      }
      return {
        message: `Request failed with status ${response.status}`,
        details: data,
      };
    } catch {
      return {
        message: `Request failed with status ${response.status}`,
        details: undefined,
      };
    }
  }

  try {
    const text = await response.text();
    return {
      message: text.trim() || `Request failed with status ${response.status}`,
      details: text || undefined,
    };
  } catch {
    return {
      message: `Request failed with status ${response.status}`,
      details: undefined,
    };
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers, signal, auth = false } = options;
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth && !requestHeaders.has("Authorization")) {
    const token = getAccessToken();
    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers: requestHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Network request failed";
    throw new ApiError(`Unable to reach the API: ${message}`, 0, error);
  }

  if (!response.ok) {
    const { message, details } = await parseErrorMessage(response);
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(
      `Expected JSON response but received "${contentType || "unknown"}"`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

export function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return apiRequest<HealthResponse>("/health", { method: "GET", signal });
}

export type LocationSearchType = "from_locality" | "to_destination";

export type LocationSearchResult = {
  id: string;
  name: string;
  city: string | null;
  district: string | null;
  state: string;
  location_type: LocationSearchType;
};

export type SearchLocationsParams = {
  type: LocationSearchType;
  q?: string;
  limit?: number;
  signal?: AbortSignal;
};

export function searchLocations(
  params: SearchLocationsParams,
): Promise<LocationSearchResult[]> {
  const search = new URLSearchParams();
  search.set("type", params.type);
  if (params.q !== undefined) {
    search.set("q", params.q);
  }
  if (params.limit !== undefined) {
    search.set("limit", String(params.limit));
  }

  return apiRequest<LocationSearchResult[]>(`/locations?${search.toString()}`, {
    method: "GET",
    signal: params.signal,
  });
}

/** Full active catalogue for a location type (From localities or To destinations). */
export function listLocationCatalogue(
  type: LocationSearchType,
  signal?: AbortSignal,
): Promise<LocationSearchResult[]> {
  return searchLocations({ type, limit: 200, signal });
}

export type KitchenListItem = {
  id: string;
  cookId: string;
  name: string;
  blurb: string | null;
  offerLabel: string | null;
  offerType: "meals-snacks" | "snacks" | null;
  fromPrice: number | null;
  photoUrl: string | null;
  hasMenu: boolean;
  isVerified: boolean;
  /** null = unknown; do not treat as non-vegetarian */
  isVegetarian: boolean | null;
  rating: number | null;
  reviewCount: number;
};

export function listKitchens(signal?: AbortSignal): Promise<KitchenListItem[]> {
  return apiRequest<KitchenListItem[]>("/kitchens", {
    method: "GET",
    signal,
  });
}

export type DishSpiceLevel = "Mild" | "Medium" | "Hot";

export type KitchenDish = {
  id: string;
  kitchenId: string;
  code: string;
  name: string;
  price: number;
  description: string | null;
  /** null when the kitchen has not supplied a spice level */
  spiceLevel: DishSpiceLevel | null;
  allergens: string[];
  categoryCode: string | null;
  sortOrder: number;
  isAvailable: boolean;
};

export function listKitchenDishes(
  kitchenId: string,
  signal?: AbortSignal,
): Promise<KitchenDish[]> {
  return apiRequest<KitchenDish[]>(`/kitchens/${kitchenId}/dishes`, {
    method: "GET",
    signal,
  });
}

export function getKitchenDish(
  kitchenId: string,
  code: string,
  signal?: AbortSignal,
): Promise<KitchenDish> {
  return apiRequest<KitchenDish>(
    `/kitchens/${kitchenId}/dishes/${encodeURIComponent(code)}`,
    {
      method: "GET",
      signal,
    },
  );
}

export type AuthProfile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type AuthSessionPayload = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number | null;
  tokenType: string;
};

export type AuthResponse = {
  profile: AuthProfile;
  session: AuthSessionPayload;
};

export type SendOtpResponse = {
  ok: true;
  cooldownSeconds: number;
  expiresInSeconds: number;
};

export function sendAuthOtp(body: {
  phone: string;
  purpose: "login" | "register";
  fullName?: string;
  email?: string;
}): Promise<SendOtpResponse> {
  return apiRequest<SendOtpResponse>("/auth/otp/send", {
    method: "POST",
    body,
  });
}

export function registerAccount(body: {
  fullName: string;
  phone: string;
  email: string;
  otp: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body,
  });
}

export function loginAccount(body: {
  phone: string;
  otp: string;
}): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body,
  });
}

export function getMyProfile(signal?: AbortSignal): Promise<AuthProfile> {
  return apiRequest<AuthProfile>("/auth/me", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function updateMyProfile(body: {
  fullName?: string;
  phone?: string;
  email?: string;
}): Promise<AuthProfile> {
  return apiRequest<AuthProfile>("/auth/me", {
    method: "PATCH",
    auth: true,
    body,
  });
}

export type NotificationPreferenceCategory =
  | "order_updates"
  | "offers_promotions"
  | "nearby_home_cooks"
  | "general_updates";

export type NotificationPreferences = Record<
  NotificationPreferenceCategory,
  boolean
> & {
  updatedAt: string;
};

export type UpdateNotificationPreferences = Partial<
  Record<NotificationPreferenceCategory, boolean>
>;

export function getNotificationPreferences(
  signal?: AbortSignal,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/notifications/preferences", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function updateNotificationPreferences(
  body: UpdateNotificationPreferences,
): Promise<NotificationPreferences> {
  return apiRequest<NotificationPreferences>("/notifications/preferences", {
    method: "PATCH",
    auth: true,
    body,
  });
}

export type CustomerNotification = {
  id: string;
  category: NotificationPreferenceCategory;
  title: string;
  body: string;
  iconType: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
};

export function listNotifications(
  signal?: AbortSignal,
): Promise<CustomerNotification[]> {
  return apiRequest<CustomerNotification[]>("/notifications", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getUnreadNotificationCount(
  signal?: AbortSignal,
): Promise<{ unreadCount: number }> {
  return apiRequest<{ unreadCount: number }>("/notifications/unread-count", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function markNotificationRead(
  notificationId: string,
): Promise<CustomerNotification> {
  return apiRequest<CustomerNotification>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH", auth: true },
  );
}

export function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  return apiRequest<{ updatedCount: number }>("/notifications/read-all", {
    method: "PATCH",
    auth: true,
  });
}

export function dismissNotification(
  notificationId: string,
): Promise<{ dismissed: true; notificationId: string }> {
  return apiRequest<{ dismissed: true; notificationId: string }>(
    `/notifications/${encodeURIComponent(notificationId)}/dismiss`,
    { method: "PATCH", auth: true },
  );
}

export type CartItem = {
  id: string;
  dishId: string;
  dishCode: string;
  kitchenId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  categoryCode: string | null;
  isAvailable: boolean;
};

export type Cart = {
  id: string;
  kitchenId: string | null;
  status: "active";
  items: CartItem[];
  itemCount: number;
  subtotal: number;
};

export function getCart(signal?: AbortSignal): Promise<Cart> {
  return apiRequest<Cart>("/cart", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function addCartItem(body: {
  kitchenId: string;
  dishCode: string;
  quantity?: number;
}): Promise<Cart> {
  return apiRequest<Cart>("/cart/items", {
    method: "POST",
    auth: true,
    body,
  });
}

export function updateCartItem(
  itemId: string,
  body: { quantity: number },
): Promise<Cart> {
  return apiRequest<Cart>(`/cart/items/${itemId}`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export function removeCartItem(itemId: string): Promise<Cart> {
  return apiRequest<Cart>(`/cart/items/${itemId}`, {
    method: "DELETE",
    auth: true,
  });
}

export function clearCart(): Promise<Cart> {
  return apiRequest<Cart>("/cart", {
    method: "DELETE",
    auth: true,
  });
}

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready_for_pickup"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderItem = {
  id: string;
  dishId: string | null;
  dishCode: string;
  dishName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  kitchenId: string;
  kitchenName: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  collectorName: string;
  collectorPhone: string;
  collectionPoint: string | null;
  kitchenNote: string | null;
  pickupNote: string | null;
  pickupStopName: string;
  pickupTime: string | null;
  journeyFrom: string | null;
  journeyTo: string | null;
  journeyDate: string | null;
  busNumber: string | null;
  seatNumber: string | null;
  subtotal: number;
  pickupServiceFee: number;
  taxAmount: number;
  total: number;
  currency: string;
  items: OrderItem[];
  itemCount: number;
  createdAt: string;
  updatedAt: string;
};

export type OrderListItem = {
  id: string;
  orderNumber: string;
  kitchenId: string;
  kitchenName: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  itemCount: number;
  primaryItemName: string | null;
  items: OrderItem[];
  journeyDate: string | null;
  pickupTime: string | null;
  createdAt: string;
};

export function createOrder(body: {
  idempotencyKey: string;
  collectorName: string;
  collectorPhone: string;
  collectionPoint?: string;
  kitchenNote?: string;
  pickupNote?: string;
  pickupStopName: string;
  pickupTime?: string;
  journeyFrom: string;
  journeyTo: string;
  journeyDate?: string;
  busNumber?: string;
  seatNumber?: string;
  kitchenId?: string;
}): Promise<Order> {
  return apiRequest<Order>("/orders", {
    method: "POST",
    auth: true,
    body,
  });
}

export function listOrders(signal?: AbortSignal): Promise<OrderListItem[]> {
  return apiRequest<OrderListItem[]>("/orders", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    auth: true,
    signal,
  });
}

export type CashfreePaymentSession = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  paymentSessionId: string;
  cashfreeOrderId: string;
  environment: "sandbox" | "production";
  paymentStatus: PaymentStatus;
};

export type CashfreePaymentVerifyResult = {
  orderId: string;
  paymentStatus: PaymentStatus;
  cashfreeOrderId: string | null;
  cashfreeOrderStatus: string | null;
  alreadyPaid: boolean;
  verified: boolean;
};

export type CashfreePaymentStatusResult = {
  orderId: string;
  paymentStatus: PaymentStatus;
  total: number;
  currency: string;
  cashfreeOrderId: string | null;
  verifiedAt: string | null;
};

export function createCashfreePaymentSession(orderId: string): Promise<CashfreePaymentSession> {
  return apiRequest<CashfreePaymentSession>("/payments/cashfree/session", {
    method: "POST",
    auth: true,
    body: { orderId },
  });
}

export function verifyCashfreePayment(orderId: string): Promise<CashfreePaymentVerifyResult> {
  return apiRequest<CashfreePaymentVerifyResult>("/payments/cashfree/verify", {
    method: "POST",
    auth: true,
    body: { orderId },
  });
}

export function getCashfreePaymentStatus(
  orderId: string,
  signal?: AbortSignal,
): Promise<CashfreePaymentStatusResult> {
  return apiRequest<CashfreePaymentStatusResult>(
    `/payments/cashfree/status/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      auth: true,
      signal,
    },
  );
}

export function deleteOrder(
  orderId: string,
  signal?: AbortSignal,
): Promise<{ deleted: true; orderId: string }> {
  return apiRequest<{ deleted: true; orderId: string }>(
    `/orders/${encodeURIComponent(orderId)}`,
    {
      method: "DELETE",
      auth: true,
      signal,
    },
  );
}

export type ApplicationSubmitResult = {
  applicationId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  message: string;
};

export type ApplicationStatusFilter = "pending" | "approved" | "rejected";

export type SubmitCookApplicationPayload = {
  fullName: string;
  mobileNumber: string;
  email: string;
  city: string;
  pincode: string;
  foodPreference: "vegetarian" | "non_vegetarian" | "both";
  foodReferences: string[];
  availableDays: string[];
  availabilityMode: "shared";
  availabilityByDay: Record<string, { from: string; until: string }>;
};

export function submitCookApplication(
  payload: SubmitCookApplicationPayload,
  signal?: AbortSignal,
): Promise<ApplicationSubmitResult> {
  return apiRequest<ApplicationSubmitResult>("/applications/cook", {
    method: "POST",
    body: payload,
    signal,
  });
}

export type SubmitDeliveryPartnerApplicationPayload = {
  fullName: string;
  mobileNumber: string;
  email: string;
  city: string;
  pincode: string;
  ownsVehicle: boolean;
  vehicleType?: "bike" | "car" | "auto" | "other";
  vehicleRegistrationNumber?: string;
  otherVehicleDescription?: string;
  availableDaysMode: "all_days" | "weekdays" | "weekends" | "choose_days";
  availableDays: string[];
  workingHoursMode: "full_app" | "custom";
  availableFrom: string;
  availableUntil: string;
};

export function submitDeliveryPartnerApplication(
  payload: SubmitDeliveryPartnerApplicationPayload,
  signal?: AbortSignal,
): Promise<ApplicationSubmitResult> {
  return apiRequest<ApplicationSubmitResult>("/applications/delivery-partner", {
    method: "POST",
    body: payload,
    signal,
  });
}

export type AdminCookApplicationListItem = {
  id: string;
  application_id: string;
  status: ApplicationStatusFilter;
  full_name: string;
  mobile_number: string;
  email: string;
  city: string;
  food_preference: string;
  created_at: string;
  reviewed_at: string | null;
};

export type AdminDeliveryPartnerListItem = {
  id: string;
  applicationId: string;
  status: ApplicationStatusFilter;
  fullName: string;
  mobileNumber: string;
  email: string;
  city: string;
  workPreference: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export function listAdminCookApplications(
  status?: ApplicationStatusFilter,
  signal?: AbortSignal,
): Promise<AdminCookApplicationListItem[]> {
  const search = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminCookApplicationListItem[]>(
    `/applications/admin/cook${search}`,
    { method: "GET", auth: true, signal },
  );
}

export function listAdminDeliveryPartnerApplications(
  status?: ApplicationStatusFilter,
  signal?: AbortSignal,
): Promise<AdminDeliveryPartnerListItem[]> {
  const search = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiRequest<AdminDeliveryPartnerListItem[]>(
    `/applications/admin/delivery-partner${search}`,
    { method: "GET", auth: true, signal },
  );
}

export function getAdminCookApplication(id: string, signal?: AbortSignal) {
  return apiRequest<Record<string, unknown>>(
    `/applications/admin/cook/${encodeURIComponent(id)}`,
    { method: "GET", auth: true, signal },
  );
}

export function getAdminDeliveryPartnerApplication(id: string, signal?: AbortSignal) {
  return apiRequest<Record<string, unknown>>(
    `/applications/admin/delivery-partner/${encodeURIComponent(id)}`,
    { method: "GET", auth: true, signal },
  );
}

export function reviewAdminCookApplication(
  id: string,
  body: { status: "approved" | "rejected"; reviewNotes?: string },
): Promise<{ id: string; applicationId: string; status: string; reviewedAt: string }> {
  return apiRequest(`/applications/admin/cook/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export function reviewAdminDeliveryPartnerApplication(
  id: string,
  body: { status: "approved" | "rejected"; reviewNotes?: string },
): Promise<{ id: string; applicationId: string; status: string; reviewedAt: string }> {
  return apiRequest(`/applications/admin/delivery-partner/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body,
  });
}

export type AdminSession = {
  role: "admin";
  profile: AuthProfile;
};

export type AdminDashboard = {
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
    type: "cook" | "delivery_partner";
    fullName: string;
    status: string;
    createdAt: string;
  }>;
};

export function getAdminSession(signal?: AbortSignal): Promise<AdminSession> {
  return apiRequest<AdminSession>("/admin/session", {
    method: "GET",
    auth: true,
    signal,
  });
}

export function getAdminDashboard(signal?: AbortSignal): Promise<AdminDashboard> {
  return apiRequest<AdminDashboard>("/admin/dashboard", {
    method: "GET",
    auth: true,
    signal,
  });
}
