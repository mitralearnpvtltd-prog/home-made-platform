export const PATHS = {
  home: "/",
  login: "/login",
  register: "/register",
  otp: "/otp",
  registerOtp: "/register/otp",
  registerSuccess: "/register/success",
  cooks: "/cooks",
  lakshmiMenu: "/cooks/lakshmi",
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
