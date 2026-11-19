import type { Meal } from "./cookData";
import { LAKSHMI_MEALS } from "./cookData";
import { applyIncharaFoodImages } from "./incharaFoodImages";
import { INCHARA_MEALS } from "./incharaMenu";
import { applyKavitaFoodImages } from "./kavitaFoodImages";
import { KAVITA_MEALS } from "./kavitaMenu";
import { applyMonicaFoodImages } from "./monicaFoodImages";
import { MONICA_MEALS } from "./monicaMenu";
import { applySwathiFoodImages } from "./swathiFoodImages";

/**
 * Fixed seed kitchen IDs from 20261114000000_seed_initial_kitchens.
 * Menu routes are `/cooks/{kitchenId}`.
 */
export const KITCHEN_IDS = {
  swathi: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11",
  kavita: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12",
  monica: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13",
  inchara: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14",
} as const;

export type CatalogueKitchenId = (typeof KITCHEN_IDS)[keyof typeof KITCHEN_IDS];

/**
 * Per-kitchen food catalogues.
 *
 * - Swathi reuses the existing Lakshmi meal list (names/prices/order unchanged).
 *   Dish photos can be overridden via `SWATHI_FOOD_IMAGE_URLS` (`food-images` bucket).
 * - Kavita uses `KAVITA_MEALS`; dish photos via `KAVITA_FOOD_IMAGE_URLS`.
 * - Monica uses `MONICA_MEALS`; dish photos via `MONICA_FOOD_IMAGE_URLS`.
 * - Inchara uses `INCHARA_MEALS`; dish photos via `INCHARA_FOOD_IMAGE_URLS`.
 * - Kitchen headshots stay in `kitchen-photos` (unchanged).
 */
export const KITCHEN_MENUS: Record<string, readonly Meal[]> = {
  [KITCHEN_IDS.swathi]: applySwathiFoodImages(LAKSHMI_MEALS),
  [KITCHEN_IDS.kavita]: applyKavitaFoodImages(KAVITA_MEALS),
  [KITCHEN_IDS.monica]: applyMonicaFoodImages(MONICA_MEALS),
  [KITCHEN_IDS.inchara]: applyIncharaFoodImages(INCHARA_MEALS),
};

export function isCatalogueKitchenId(kitchenId: string): kitchenId is CatalogueKitchenId {
  return Object.prototype.hasOwnProperty.call(KITCHEN_MENUS, kitchenId);
}

export function getKitchenMeals(kitchenId: string): Meal[] {
  return [...(KITCHEN_MENUS[kitchenId] ?? [])];
}

export function kitchenHasMenuItems(kitchenId: string) {
  return getKitchenMeals(kitchenId).length > 0;
}
