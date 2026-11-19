import type { Meal, MealCategory } from "../cookData";
import { getKitchenMeals } from "../kitchenMenus";
import type { Cart, CartItem } from "./api";

export type PersistedBagLine = {
  meal: Meal;
  qty: number;
  cartItemId?: string;
};

function categoryFromCode(code: string | null): MealCategory {
  if (code === "breakfast" || code === "snacks" || code === "meals") {
    return code;
  }
  return "meals";
}

function toMeal(item: CartItem, kitchenId: string): Meal {
  const local = getKitchenMeals(kitchenId).find((meal) => meal.id === item.dishCode);
  if (local) {
    return {
      ...local,
      // Prefer server price so totals never trust a stale client catalogue value.
      name: item.name,
      price: item.unitPrice,
    };
  }

  return {
    id: item.dishCode,
    name: item.name,
    description: "",
    price: item.unitPrice,
    rating: 0,
    reviews: 0,
    category: categoryFromCode(item.categoryCode),
    photo: "",
  };
}

/** Map a persisted cart into Meal Bag lines for the active kitchen only. */
export function cartToBagLines(cart: Cart, kitchenId: string): PersistedBagLine[] {
  return cart.items
    .filter((item) => item.kitchenId === kitchenId && item.isAvailable)
    .map((item) => ({
      meal: toMeal(item, kitchenId),
      qty: item.quantity,
      cartItemId: item.id,
    }));
}
