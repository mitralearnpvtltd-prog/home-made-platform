import { PATHS } from "../navigation";

export type AdminNavItem = {
  label: string;
  path: string;
  implemented: boolean;
};

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", path: PATHS.admin, implemented: true },
  { label: "Orders", path: PATHS.adminOrders, implemented: false },
  { label: "Kitchens", path: PATHS.adminKitchens, implemented: false },
  { label: "Food & Menu", path: PATHS.adminFoodMenu, implemented: false },
  { label: "Cook Applications", path: PATHS.adminCookApplications, implemented: true },
  { label: "Delivery Applications", path: PATHS.adminDeliveryApplications, implemented: true },
  { label: "Delivery Partners", path: PATHS.adminDeliveryPartners, implemented: false },
  { label: "Customers", path: PATHS.adminCustomers, implemented: false },
  { label: "Payments & Earnings", path: PATHS.adminPayments, implemented: false },
  { label: "Offers & Coupons", path: PATHS.adminOffers, implemented: false },
  { label: "Notifications", path: PATHS.adminNotifications, implemented: false },
  { label: "Reviews & Complaints", path: PATHS.adminReviews, implemented: false },
  { label: "Reports & Analytics", path: PATHS.adminReports, implemented: false },
  { label: "Settings", path: PATHS.adminSettings, implemented: false },
];

export function adminPageTitle(path: string): { title: string; subtitle: string } {
  const item = ADMIN_NAV.find((entry) => entry.path === path);
  if (path === PATHS.admin) {
    return {
      title: "Dashboard",
      subtitle: "Live platform overview from Supabase",
    };
  }
  if (item) {
    return {
      title: item.label,
      subtitle: item.implemented
        ? "Connected to live backend data"
        : "Module shell — management APIs not available yet",
    };
  }
  return { title: "Admin", subtitle: "Aahaa operations" };
}
