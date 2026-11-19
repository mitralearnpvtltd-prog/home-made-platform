import type { Meal } from "./cookData";

/**
 * Swathi dish photos from the public Supabase Storage bucket `food-images`.
 *
 * Paste each uploaded public object URL against the matching meal id.
 * Leave a value empty to keep the existing local asset for that dish.
 *
 * Expected URL shape (case-sensitive path):
 * https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/<filename>
 *
 * Do not invent URLs — only use real uploaded object links.
 */
export const SWATHI_FOOD_IMAGE_URLS: Record<
  | "veg-lunch"
  | "lemon-rice"
  | "idli"
  | "curd-rice"
  | "chapati"
  | "pulao"
  | "banana-chips"
  | "murukku"
  | "mixture",
  string
> = {
  /** Homestyle veg lunch */
  "veg-lunch":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meals/Homestyle%20veg%20lunch.jpeg",
  /** Lemon rice & potato fry */
  "lemon-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meals/Lemon%20rice%20&%20potato%20fry.jpeg",
  /** Soft idli & chutney */
  idli: "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meals/Soft%20idli%20&%20chutney.jpeg",
  /** Curd rice & pickle */
  "curd-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meals/Curd%20rice%20&%20pickle.jpeg",
  /** Chapati & vegetable curry */
  chapati:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meals/Chapati%20&%20vegetable%20curry.jpeg",
  /** Vegetable pulao */
  pulao:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meals/Vegetable%20pulao.jpeg",
  /** Banana chips */
  "banana-chips":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/snacks/Banana%20chips.jpeg",
  /** Murukku */
  murukku:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/snacks/Murukku.jpeg",
  /** Spiced mixture */
  mixture:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/snacks/Spiced%20mixture.jpeg",
};

/** Apply `food-images` URLs when present; otherwise keep the original meal photo. */
export function applySwathiFoodImages(meals: readonly Meal[]): Meal[] {
  return meals.map((meal) => {
    const url = SWATHI_FOOD_IMAGE_URLS[meal.id as keyof typeof SWATHI_FOOD_IMAGE_URLS]?.trim();
    if (!url) return { ...meal };
    return { ...meal, photo: url };
  });
}
