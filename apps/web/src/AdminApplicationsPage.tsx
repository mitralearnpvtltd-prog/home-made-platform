import { useEffect } from "react";
import { navigate, PATHS } from "./navigation";

/** Legacy entry — redirects into the admin dashboard applications module. */
export function AdminApplicationsPage() {
  useEffect(() => {
    navigate(PATHS.adminCookApplications, { replace: true });
  }, []);

  return null;
}
