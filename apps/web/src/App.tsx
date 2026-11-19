import { useEffect, useState } from "react";
import { AdminApp } from "./admin/AdminApp";
import { AuthOverlay } from "./AuthOverlay";
import { CookPages } from "./CookPages";
import { LandingPage } from "./LandingPage";
import {
  AUTH_PATHS,
  currentPath,
  parseKitchenPath,
  PATHS,
  rewriteLegacyKitchenPath,
} from "./navigation";
import { BecomeCookPage, BecomeDeliveryPartnerPage } from "./PartnerApplyPages";
import { PlaceholderPage } from "./PlaceholderPage";

export function App() {
  const [path, setPath] = useState(currentPath);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    // Child effects can navigate before this listener exists; resync once mounted.
    setPath(currentPath());
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const kitchenRoute = parseKitchenPath(path);
  const legacyKitchenPath = rewriteLegacyKitchenPath(path);

  useEffect(() => {
    if (!legacyKitchenPath) return;
    window.history.replaceState({}, "", legacyKitchenPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, [legacyKitchenPath]);

  if (path === PATHS.becomeCook) {
    return <BecomeCookPage />;
  }
  if (path === PATHS.becomeDeliveryPartner) {
    return <BecomeDeliveryPartnerPage />;
  }
  if (path === PATHS.admin || path.startsWith(`${PATHS.admin}/`)) {
    return <AdminApp path={path} />;
  }

  if (
    path === PATHS.cooks ||
    path === PATHS.cart ||
    kitchenRoute !== null ||
    legacyKitchenPath !== null ||
    path === PATHS.profile ||
    path === PATHS.accountDetails ||
    path === PATHS.myOrders ||
    path === PATHS.notifications ||
    path === PATHS.appSettings ||
    path === PATHS.helpSupport ||
    path === PATHS.faqs ||
    path === PATHS.chatSupport ||
    path === PATHS.emailSupport ||
    path === PATHS.reportIssue ||
    path === PATHS.safetyGuidelines ||
    path === PATHS.about ||
    path === PATHS.logout ||
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
