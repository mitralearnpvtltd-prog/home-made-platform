import { useEffect, useState } from "react";
import { AuthOverlay } from "./AuthOverlay";
import { LandingPage } from "./LandingPage";
import { AUTH_PATHS, currentPath, PATHS } from "./navigation";
import { PlaceholderPage } from "./PlaceholderPage";

export function App() {
  const [path, setPath] = useState(currentPath);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (path === PATHS.terms || path === PATHS.privacy || (!AUTH_PATHS.has(path) && path !== PATHS.home)) {
    return <PlaceholderPage path={path} />;
  }

  const authScreen =
    path === PATHS.login
      ? "login"
      : path === PATHS.register
        ? "register"
        : path === PATHS.otp
          ? "otp"
          : path === PATHS.registerOtp
            ? "register-otp"
            : path === PATHS.registerSuccess
              ? "register-success"
              : null;

  return (
    <>
      <LandingPage />
      {authScreen ? <AuthOverlay screen={authScreen} phone={phone} setPhone={setPhone} /> : null}
    </>
  );
}
