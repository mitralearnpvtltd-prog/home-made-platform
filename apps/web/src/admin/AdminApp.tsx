import { useEffect, useState, type ReactNode } from "react";
import { ApiError, getAdminSession } from "../lib/api";
import {
  clearAuthSession,
  getAccessToken,
  type AuthProfile,
} from "../lib/authSession";
import { navigate, PATHS } from "../navigation";
import "../styles/admin.css";
import { AdminApplicationsPanel } from "./AdminApplicationsPanel";
import { AdminDashboardPage } from "./AdminDashboardPage";
import { AdminLayout } from "./AdminLayout";
import { AdminLoginPage } from "./AdminLoginPage";
import { ADMIN_NAV } from "./adminNav";
import { AdminModulePlaceholder } from "./AdminModulePlaceholder";

function AdminGate({
  path,
  children,
}: {
  path: string;
  children: (profile: AuthProfile) => ReactNode;
}) {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setNeedsLogin(true);
      setLoading(false);
      setError("Sign in with an administrator account to continue.");
      // Dedicated admin login — never the customer /login overlay.
      queueMicrotask(() => navigate(PATHS.adminLogin, { replace: true }));
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setNeedsLogin(false);
    setError(null);
    void getAdminSession(controller.signal)
      .then((session) => setProfile(session.profile))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setProfile(null);
        if (err instanceof ApiError && err.status === 401) {
          setNeedsLogin(true);
          setError("Your session expired. Please sign in again.");
          queueMicrotask(() => navigate(PATHS.adminLogin, { replace: true }));
          return;
        }
        if (err instanceof ApiError && err.status === 403) {
          setNeedsLogin(false);
          setError(
            "Administrator access required. This signed-in account does not have the admin role.",
          );
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to verify administrator access.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [path]);

  if (loading) {
    return (
      <div className="ad-shell is-collapsed">
        <div className="ad-content">
          <div className="ad-empty">
            <p>Verifying administrator access…</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="ad-shell is-collapsed">
        <div className="ad-content">
          <div className="ad-locked">
            <h2>Admin access required</h2>
            <p>{error ?? "You cannot open the Aahaa admin dashboard with this account."}</p>
            <div className="ad-actions">
              {needsLogin ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--primary"
                  onClick={() => navigate(PATHS.adminLogin)}
                >
                  Sign in
                </button>
              ) : null}
              <button
                type="button"
                className="ad-btn ad-btn--ghost"
                onClick={() => navigate(PATHS.cooks)}
              >
                Customer website
              </button>
              {!needsLogin ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost"
                  onClick={() => {
                    clearAuthSession();
                    navigate(PATHS.adminLogin);
                  }}
                >
                  Sign in with another account
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children(profile)}</>;
}

function AdminPage({ path }: { path: string }) {
  if (path === PATHS.admin) return <AdminDashboardPage />;
  if (path === PATHS.adminCookApplications) {
    return <AdminApplicationsPanel initialTab="cook" />;
  }
  if (path === PATHS.adminDeliveryApplications) {
    return <AdminApplicationsPanel initialTab="delivery" />;
  }
  if (path === PATHS.adminApplications) {
    return <AdminApplicationsPanel initialTab="cook" />;
  }

  const item = ADMIN_NAV.find((entry) => entry.path === path);
  return (
    <AdminModulePlaceholder
      title={item?.label ?? "Admin module"}
      description={
        item
          ? `${item.label} management will be added in a later milestone. No fabricated data is shown.`
          : "This admin route is not implemented yet."
      }
    />
  );
}

export function AdminApp({ path }: { path: string }) {
  useEffect(() => {
    if (path === PATHS.adminApplications) {
      navigate(PATHS.adminCookApplications, { replace: true });
    }
  }, [path]);

  if (path === PATHS.adminLogin) {
    return <AdminLoginPage />;
  }

  return (
    <AdminGate path={path}>
      {(profile) => (
        <AdminLayout
          path={path === PATHS.adminApplications ? PATHS.adminCookApplications : path}
          profile={profile}
        >
          <AdminPage path={path} />
        </AdminLayout>
      )}
    </AdminGate>
  );
}
