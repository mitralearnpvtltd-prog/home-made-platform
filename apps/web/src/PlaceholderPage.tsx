import { navigate, PATHS } from "./navigation";

const TITLES: Record<string, string> = {
  [PATHS.terms]: "Terms of service",
  [PATHS.privacy]: "Privacy policy",
};

export function PlaceholderPage({ path }: { path: string }) {
  const title = TITLES[path] ?? "Coming next";

  return (
    <main className="lp-placeholder">
      <p className="lp-placeholder-brand">aahaa</p>
      <h1>{title}</h1>
      <p>This screen will be added in a later task.</p>
      <button className="lp-login-otp" type="button" onClick={() => navigate(PATHS.login)}>
        Back to log in
      </button>
    </main>
  );
}
