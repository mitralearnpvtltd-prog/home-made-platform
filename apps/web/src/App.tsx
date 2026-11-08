import { useEffect, useState } from "react";
import { AuthOverlay } from "./AuthOverlay";
import { CookPages } from "./CookPages";
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

  if (
    path === PATHS.cooks ||
    path === PATHS.cart ||
    path === PATHS.lakshmiMenu ||
    path === PATHS.mealBag ||
    path === PATHS.reviewOrder ||
    path === PATHS.confirmPickup ||
    path === PATHS.paymentMethod ||
    path === PATHS.paymentStatus ||
    path === PATHS.invoice ||
    path === PATHS.orderSummary ||
    path === PATHS.trackOrder ||
    path === PATHS.profile ||
    path === PATHS.accountDetails ||
    path === PATHS.myOrders ||
    path === PATHS.notifications ||
    path === PATHS.appSettings ||
    path === PATHS.helpSupport ||
    path === PATHS.about ||
    path === PATHS.logout ||
    path === PATHS.lemonRice ||
    path === PATHS.editJourney
  ) {
    return <CookPages path={path} />;
  }

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
