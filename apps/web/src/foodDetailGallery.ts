import {
  lemonHeroMain,
  lemonThumb1,
  lemonThumb2,
  lemonThumb3,
} from "./assets/cooks";
import type { Meal } from "./cookData";
import { MEAL_BAG_FOOD_IMAGE_URLS } from "./mealBagFoodImages";

/** Deduplicate while preserving first-seen order. */
function uniqueUrls(urls: readonly (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
  }
  return out;
}

/**
 * Genuine Food Details gallery photos for a dish.
 *
 * - Lemon rice keeps its dedicated multi-angle assets (no URL duplication).
 * - Other dishes use the menu photo plus a distinct Meal Bag bowl photo when mapped.
 * - Never pads with duplicate URLs; 1–N thumbs based on what exists.
 */
export function foodDetailGallery(meal: Meal): string[] {
  if (meal.id === "lemon-rice") {
    return uniqueUrls([lemonHeroMain, lemonThumb1, lemonThumb2, lemonThumb3]);
  }

  return uniqueUrls([meal.photo, MEAL_BAG_FOOD_IMAGE_URLS[meal.id]]);
}
