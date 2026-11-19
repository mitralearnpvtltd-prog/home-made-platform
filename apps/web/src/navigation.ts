import { KITCHEN_IDS } from "./kitchenMenus";

/** Seed kitchen id for Swathi’s Kitchen (catalogue entry). */
export const SWATHI_KITCHEN_ID = KITCHEN_IDS.swathi;
export { KITCHEN_IDS };

const SWATHI_PATHS = {
  menu: `/cooks/${SWATHI_KITCHEN_ID}`,
  mealBag: `/cooks/${SWATHI_KITCHEN_ID}/meal-bag`,
  reviewOrder: `/cooks/${SWATHI_KITCHEN_ID}/review`,
  confirmPickup: `/cooks/${SWATHI_KITCHEN_ID}/pickup`,
  paymentMethod: `/cooks/${SWATHI_KITCHEN_ID}/payment`,
  paymentReturn: `/cooks/${SWATHI_KITCHEN_ID}/payment-return`,
  paymentStatus: `/cooks/${SWATHI_KITCHEN_ID}/payment-status`,
  invoice: `/cooks/${SWATHI_KITCHEN_ID}/invoice`,
  orderSummary: `/cooks/${SWATHI_KITCHEN_ID}/order-summary`,
  trackOrder: `/cooks/${SWATHI_KITCHEN_ID}/track-order`,
  lemonRice: `/cooks/${SWATHI_KITCHEN_ID}/lemon-rice`,
} as const;

export const PATHS = {
  home: "/",
  login: "/login",
  register: "/register",
  otp: "/otp",
  registerOtp: "/register/otp",
  registerSuccess: "/register/success",
  cooks: "/cooks",
  cart: "/cart",
  profile: "/profile",
  accountDetails: "/profile/account-details",
  myOrders: "/my-orders",
  notifications: "/notifications",
  appSettings: "/settings",
  helpSupport: "/help-support",
  faqs: "/help-support/faqs",
  chatSupport: "/help-support/chat",
  emailSupport: "/help-support/email",
  reportIssue: "/help-support/report-issue",
  safetyGuidelines: "/help-support/safety-guidelines",
  about: "/about",
  logout: "/logout",
  editJourney: "/cooks/journey",
  terms: "/terms",
  privacy: "/privacy",
  becomeCook: "/become-a-cook",
  becomeDeliveryPartner: "/become-a-delivery-partner",
  admin: "/admin",
  adminLogin: "/admin/login",
  adminOrders: "/admin/orders",
  adminKitchens: "/admin/kitchens",
  adminFoodMenu: "/admin/food-menu",
  adminCookApplications: "/admin/cook-applications",
  adminDeliveryApplications: "/admin/delivery-applications",
  adminDeliveryPartners: "/admin/delivery-partners",
  adminCustomers: "/admin/customers",
  adminPayments: "/admin/payments",
  adminOffers: "/admin/offers",
  adminNotifications: "/admin/notifications",
  adminReviews: "/admin/reviews",
  adminReports: "/admin/reports",
  adminSettings: "/admin/settings",
  /** Legacy alias — redirects into the admin shell. */
  adminApplications: "/admin/applications",
  /** Prefer kitchenPaths(id).menu — Swathi kitchen-scoped menu route. */
  lakshmiMenu: SWATHI_PATHS.menu,
  mealBag: SWATHI_PATHS.mealBag,
  reviewOrder: SWATHI_PATHS.reviewOrder,
  confirmPickup: SWATHI_PATHS.confirmPickup,
  paymentMethod: SWATHI_PATHS.paymentMethod,
  paymentReturn: SWATHI_PATHS.paymentReturn,
  paymentStatus: SWATHI_PATHS.paymentStatus,
  invoice: SWATHI_PATHS.invoice,
  orderSummary: SWATHI_PATHS.orderSummary,
  trackOrder: SWATHI_PATHS.trackOrder,
  lemonRice: SWATHI_PATHS.lemonRice,
} as const;

export type KitchenFlowPage =
  | "menu"
  | "meal-bag"
  | "review"
  | "pickup"
  | "payment"
  | "payment-return"
  | "payment-status"
  | "invoice"
  | "order-summary"
  | "track-order"
  | "dish"
  | "lemon-rice";

export type ParsedKitchenPath = {
  kitchenId: string;
  page: KitchenFlowPage;
  mealId?: string;
};

export type KitchenPaths = {
  menu: string;
  mealBag: string;
  reviewOrder: string;
  confirmPickup: string;
  paymentMethod: string;
  paymentReturn: string;
  paymentStatus: string;
  invoice: string;
  orderSummary: string;
  trackOrder: string;
  lemonRice: string;
  /** Dish details URL. Lemon rice keeps its legacy `/lemon-rice` path. */
  dish: (mealId: string) => string;
};

const KITCHEN_UUID =
  "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

const KITCHEN_PATH_RE = new RegExp(`^/cooks/(${KITCHEN_UUID})(?:/([^/]+))?$`, "i");

const KITCHEN_DISH_PATH_RE = new RegExp(`^/cooks/(${KITCHEN_UUID})/dish/([^/]+)$`, "i");

const KITCHEN_PAGE_BY_SEGMENT: Record<string, KitchenFlowPage> = {
  "": "menu",
  "meal-bag": "meal-bag",
  review: "review",
  pickup: "pickup",
  payment: "payment",
  "payment-return": "payment-return",
  "payment-status": "payment-status",
  invoice: "invoice",
  "order-summary": "order-summary",
  "track-order": "track-order",
  "lemon-rice": "lemon-rice",
};

export function kitchenPaths(kitchenId: string): KitchenPaths {
  const root = `/cooks/${kitchenId}`;
  return {
    menu: root,
    mealBag: `${root}/meal-bag`,
    reviewOrder: `${root}/review`,
    confirmPickup: `${root}/pickup`,
    paymentMethod: `${root}/payment`,
    paymentReturn: `${root}/payment-return`,
    paymentStatus: `${root}/payment-status`,
    invoice: `${root}/invoice`,
    orderSummary: `${root}/order-summary`,
    trackOrder: `${root}/track-order`,
    lemonRice: `${root}/lemon-rice`,
    dish: (mealId: string) =>
      mealId === "lemon-rice" ? `${root}/lemon-rice` : `${root}/dish/${encodeURIComponent(mealId)}`,
  };
}

export function parseKitchenPath(path: string): ParsedKitchenPath | null {
  const dishMatch = path.match(KITCHEN_DISH_PATH_RE);
  if (dishMatch) {
    return {
      kitchenId: dishMatch[1],
      page: "dish",
      mealId: decodeURIComponent(dishMatch[2]),
    };
  }

  const match = path.match(KITCHEN_PATH_RE);
  if (!match) return null;
  const kitchenId = match[1];
  const segment = match[2] ?? "";
  const page = KITCHEN_PAGE_BY_SEGMENT[segment];
  if (!page) return null;
  if (page === "lemon-rice") {
    return { kitchenId, page: "dish", mealId: "lemon-rice" };
  }
  return { kitchenId, page };
}

/** Old Lakshmi-only routes → kitchen-scoped equivalents for Swathi. */
export function rewriteLegacyKitchenPath(path: string): string | null {
  if (path === "/cooks/lakshmi") return kitchenPaths(SWATHI_KITCHEN_ID).menu;
  if (!path.startsWith("/cooks/lakshmi/")) return null;
  const segment = path.slice("/cooks/lakshmi/".length);
  const page = KITCHEN_PAGE_BY_SEGMENT[segment];
  if (!page || page === "menu") return kitchenPaths(SWATHI_KITCHEN_ID).menu;
  const routes = kitchenPaths(SWATHI_KITCHEN_ID);
  switch (page) {
    case "meal-bag":
      return routes.mealBag;
    case "review":
      return routes.reviewOrder;
    case "pickup":
      return routes.confirmPickup;
    case "payment":
      return routes.paymentMethod;
    case "payment-return":
      return routes.paymentReturn;
    case "payment-status":
      return routes.paymentStatus;
    case "invoice":
      return routes.invoice;
    case "order-summary":
      return routes.orderSummary;
    case "track-order":
      return routes.trackOrder;
    case "lemon-rice":
      return routes.lemonRice;
    default:
      return routes.menu;
  }
}

export type AppPath = (typeof PATHS)[keyof typeof PATHS];

export const AUTH_PATHS = new Set<string>([PATHS.login, PATHS.register, PATHS.otp, PATHS.registerOtp, PATHS.registerSuccess]);

export function currentPath() {
  return window.location.pathname || PATHS.home;
}

export function navigate(path: string, options?: { replace?: boolean }) {
  // When the URL already matches, still notify listeners. React route state can
  // lag the real pathname if a child called navigate before App attached its
  // popstate listener (effects run children → parent).
  if (currentPath() !== path) {
    if (options?.replace) {
      window.history.replaceState({}, "", path);
    } else {
      window.history.pushState({}, "", path);
    }
  }
  window.dispatchEvent(new PopStateEvent("popstate"));
}
