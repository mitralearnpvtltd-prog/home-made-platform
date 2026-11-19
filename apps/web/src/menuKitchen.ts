import { KITCHEN_IDS, isCatalogueKitchenId } from "./kitchenMenus";
import type { KitchenListItem } from "./lib/api";

/** Kitchen identity used across menu, bag, and checkout. */
export type MenuKitchen = {
  id: string;
  name: string;
  blurb: string;
  offerLabel: string;
  photoUrl: string;
  fromPrice: number | null;
  hasMenu: boolean;
  isVerified: boolean;
  isVegetarian: boolean | null;
  rating: number | null;
  reviewCount: number;
};

const SWATHI_PHOTO =
  "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Swathi/Swathi.jpeg";
const KAVITA_PHOTO =
  "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Kavita/Kavita.jpeg";
const MONICA_PHOTO =
  "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Monica/Monica.jpeg";
const INCHARA_PHOTO =
  "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/kitchen-photos/Inchara/Inchara.jpeg";

/**
 * Shared catalogue review display for all four kitchens.
 * Replace per kitchen (or drive from API) when genuine review data is available.
 */
export const CATALOGUE_REVIEW_DISPLAY = {
  rating: 4.8,
  reviewCount: 126,
} as const;

/** Offline / seed fallbacks for the four catalogue kitchens. */
export const MENU_KITCHEN_FALLBACKS: Record<string, MenuKitchen> = {
  [KITCHEN_IDS.swathi]: {
    id: KITCHEN_IDS.swathi,
    name: "Swathi’s Kitchen",
    blurb: "Everyday South Indian comfort food",
    offerLabel: "Meals & homemade snacks",
    photoUrl: SWATHI_PHOTO,
    fromPrice: 60,
    hasMenu: true,
    isVerified: true,
    isVegetarian: true,
    rating: CATALOGUE_REVIEW_DISPLAY.rating,
    reviewCount: CATALOGUE_REVIEW_DISPLAY.reviewCount,
  },
  [KITCHEN_IDS.kavita]: {
    id: KITCHEN_IDS.kavita,
    name: "Kavita’s Kitchen",
    blurb: "Familiar flavours, freshly prepared",
    offerLabel: "Meals & crispy homemade snacks",
    photoUrl: KAVITA_PHOTO,
    fromPrice: 60,
    hasMenu: true,
    isVerified: false,
    isVegetarian: null,
    rating: CATALOGUE_REVIEW_DISPLAY.rating,
    reviewCount: CATALOGUE_REVIEW_DISPLAY.reviewCount,
  },
  [KITCHEN_IDS.monica]: {
    id: KITCHEN_IDS.monica,
    name: "Monica’s Kitchen",
    blurb: "Home-style favourites for your journey",
    offerLabel: "Meals & homemade snacks",
    photoUrl: MONICA_PHOTO,
    fromPrice: 100,
    hasMenu: true,
    isVerified: false,
    isVegetarian: null,
    rating: CATALOGUE_REVIEW_DISPLAY.rating,
    reviewCount: CATALOGUE_REVIEW_DISPLAY.reviewCount,
  },
  [KITCHEN_IDS.inchara]: {
    id: KITCHEN_IDS.inchara,
    name: "Inchara’s Kitchen",
    blurb: "Simple meals, made with care",
    offerLabel: "Breakfast, lunch & snacks",
    photoUrl: INCHARA_PHOTO,
    fromPrice: 80,
    hasMenu: true,
    isVerified: false,
    isVegetarian: null,
    rating: CATALOGUE_REVIEW_DISPLAY.rating,
    reviewCount: CATALOGUE_REVIEW_DISPLAY.reviewCount,
  },
};

/** @deprecated Prefer MENU_KITCHEN_FALLBACKS[KITCHEN_IDS.swathi] */
export const SWATHI_MENU_KITCHEN = MENU_KITCHEN_FALLBACKS[KITCHEN_IDS.swathi];

export function getMenuKitchenFallback(kitchenId: string): MenuKitchen | null {
  return MENU_KITCHEN_FALLBACKS[kitchenId] ?? null;
}

export function kitchenAllowsMenu(kitchenId: string) {
  return isCatalogueKitchenId(kitchenId);
}

export function toMenuKitchen(item: KitchenListItem): MenuKitchen {
  const fallback = getMenuKitchenFallback(item.id);
  const hasApiRating = item.rating !== null && item.rating !== undefined;
  return {
    id: item.id,
    name: item.name,
    blurb: item.blurb?.trim() || fallback?.blurb || "",
    offerLabel: item.offerLabel?.trim() || fallback?.offerLabel || "",
    photoUrl: item.photoUrl?.trim() || fallback?.photoUrl || "",
    fromPrice: item.fromPrice,
    // Catalogue kitchens always expose the shared menu shell (items may still be empty).
    hasMenu: item.hasMenu || kitchenAllowsMenu(item.id),
    isVerified: item.isVerified,
    isVegetarian: item.isVegetarian,
    // Prefer live API reviews when present; otherwise keep the shared catalogue display.
    rating: hasApiRating ? item.rating : (fallback?.rating ?? null),
    reviewCount: hasApiRating
      ? item.reviewCount
      : (fallback?.reviewCount ?? item.reviewCount),
  };
}

export function kitchenRatingDesk(kitchen: MenuKitchen) {
  if (kitchen.rating === null) return "No reviews yet";
  return `${kitchen.rating} · ${kitchen.reviewCount} reviews`;
}

export function kitchenRatingMobile(kitchen: MenuKitchen) {
  if (kitchen.rating === null) return "No reviews yet";
  const countLabel = kitchen.reviewCount >= 120 ? "120+" : String(kitchen.reviewCount);
  return `${kitchen.rating} ( ${countLabel} )`;
}

export function kitchenHasReviews(kitchen: MenuKitchen) {
  return kitchen.rating !== null;
}

export function kitchenPhoto(kitchen: MenuKitchen, fallback: string) {
  return kitchen.photoUrl.trim() || fallback;
}
