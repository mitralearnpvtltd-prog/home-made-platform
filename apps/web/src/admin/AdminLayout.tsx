import { useEffect, useRef, useState, type ReactNode } from "react";
import { clearAuthSession, type AuthProfile } from "../lib/authSession";
import { navigate, PATHS } from "../navigation";
import { ADMIN_NAV, adminPageTitle } from "./adminNav";

export function AdminLayout({
  path,
  profile,
  children,
}: {
  path: string;
  profile: AuthProfile;
  children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { title, subtitle } = adminPageTitle(path);
  const initials = (profile.fullName ?? profile.email ?? "A")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "A";

  useEffect(() => {
    setNavOpen(false);
    setMenuOpen(false);
  }, [path]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function logout() {
    clearAuthSession();
    navigate(PATHS.adminLogin);
  }

  return (
    <div className={`ad-shell${navOpen ? " is-nav-open" : ""}`}>
      {navOpen ? (
        <button
          type="button"
          className="ad-backdrop"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside className="ad-sidebar" aria-label="Admin navigation">
        <div className="ad-brand">
          <span className="ad-brand__mark">aa</span>
          <div className="ad-brand__text">
            <strong>aahaa admin</strong>
            <small>Operations console</small>
          </div>
        </div>
        <nav className="ad-nav">
          {ADMIN_NAV.map((item) => (
            <button
              key={item.path}
              type="button"
              className={path === item.path ? "is-active" : undefined}
              onClick={() => navigate(item.path)}
            >
              <span className="ad-nav__dot" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="ad-sidebar__foot">
          <button type="button" onClick={() => navigate(PATHS.home)}>
            <span className="ad-nav__dot" aria-hidden="true" />
            Customer website
          </button>
        </div>
      </aside>

      <div className="ad-main">
        <header className="ad-header">
          <div className="ad-header__left">
            <button
              type="button"
              className="ad-icon-btn"
              aria-label="Open menu"
              onClick={() => setNavOpen(true)}
            >
              ☰
            </button>
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
          </div>

          <div className="ad-profile" ref={menuRef}>
            <button
              type="button"
              className="ad-profile__btn"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="ad-avatar">{initials}</span>
              <span className="ad-profile__meta">
                <strong>{profile.fullName ?? "Administrator"}</strong>
                <small>{profile.email ?? profile.phone ?? "admin"}</small>
              </span>
            </button>
            {menuOpen ? (
              <div className="ad-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => navigate(PATHS.adminSettings)}>
                  Settings
                </button>
                <button type="button" role="menuitem" onClick={logout}>
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>
        <div className="ad-content">{children}</div>
      </div>
    </div>
  );
}
