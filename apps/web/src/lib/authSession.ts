const ACCESS_TOKEN_KEY = "aahaa.auth.accessToken";
const REFRESH_TOKEN_KEY = "aahaa.auth.refreshToken";
const PROFILE_CACHE_KEY = "aahaa.auth.profileCache";
const RETURN_PATH_KEY = "aahaa.auth.returnPath";

export type AuthProfile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number | null;
  tokenType: string;
};

export type AuthResponse = {
  profile: AuthProfile;
  session: AuthSession;
};

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
}

export function clearAuthSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

export function cacheProfile(profile: AuthProfile): void {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch {
    // ignore quota
  }
}

export function readCachedProfile(): AuthProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthProfile;
  } catch {
    return null;
  }
}

export function persistAuth(response: AuthResponse): AuthProfile {
  setAuthSession(response.session);
  cacheProfile(response.profile);
  // Fire-and-forget: transfer guest Meal Bag into the signed-in cart when present.
  void import("./guestCart")
    .then(({ mergeGuestCartToServer }) => mergeGuestCartToServer())
    .catch(() => {
      // Guest merge is best-effort; Meal Bag UI still works from server cart.
    });
  return response.profile;
}

/**
 * Customer post-login return paths.
 * Admin URLs are never accepted here — admin authentication uses /admin/login only.
 */
export function isSafeAuthReturnPath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return false;
  }
  // Reserved for future customer deep-links. Admin paths must never qualify.
  if (path === "/admin" || path.startsWith("/admin/")) {
    return false;
  }
  return false;
}

export function setAuthReturnPath(path: string): void {
  if (!isSafeAuthReturnPath(path)) return;
  try {
    sessionStorage.setItem(RETURN_PATH_KEY, path);
  } catch {
    // ignore quota / private mode
  }
}

export function peekAuthReturnPath(): string | null {
  try {
    const path = sessionStorage.getItem(RETURN_PATH_KEY);
    if (!path || !isSafeAuthReturnPath(path)) return null;
    return path;
  } catch {
    return null;
  }
}

export function consumeAuthReturnPath(): string | null {
  const path = peekAuthReturnPath();
  try {
    sessionStorage.removeItem(RETURN_PATH_KEY);
  } catch {
    // ignore
  }
  return path;
}

export function clearAuthReturnPath(): void {
  try {
    sessionStorage.removeItem(RETURN_PATH_KEY);
  } catch {
    // ignore
  }
}
