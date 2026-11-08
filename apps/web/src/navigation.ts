export const PATHS = {
  home: "/",
  login: "/login",
  register: "/register",
  otp: "/otp",
  registerOtp: "/register/otp",
  registerSuccess: "/register/success",
  cooks: "/cooks",
  cart: "/cart",
  lakshmiMenu: "/cooks/lakshmi",
  mealBag: "/cooks/lakshmi/meal-bag",
  reviewOrder: "/cooks/lakshmi/review",
  confirmPickup: "/cooks/lakshmi/pickup",
  paymentMethod: "/cooks/lakshmi/payment",
  paymentStatus: "/cooks/lakshmi/payment-status",
  invoice: "/cooks/lakshmi/invoice",
  orderSummary: "/cooks/lakshmi/order-summary",
  trackOrder: "/cooks/lakshmi/track-order",
  profile: "/profile",
  accountDetails: "/profile/account-details",
  myOrders: "/my-orders",
  notifications: "/notifications",
  appSettings: "/settings",
  helpSupport: "/help-support",
  about: "/about",
  logout: "/logout",
  lemonRice: "/cooks/lakshmi/lemon-rice",
  editJourney: "/cooks/journey",
  terms: "/terms",
  privacy: "/privacy",
} as const;

export type AppPath = (typeof PATHS)[keyof typeof PATHS];

export const AUTH_PATHS = new Set<string>([PATHS.login, PATHS.register, PATHS.otp, PATHS.registerOtp, PATHS.registerSuccess]);

export function currentPath() {
  return window.location.pathname || PATHS.home;
}

export function navigate(path: string) {
  if (currentPath() === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
