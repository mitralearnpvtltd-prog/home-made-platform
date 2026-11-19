import type { Meal } from "./cookData";

/**
 * Kavita dish photos from the public Supabase Storage bucket `food-images`.
 *
 * Paste each uploaded public object URL against the matching meal id.
 * Leave a value empty to keep the existing meal photo (empty fallback for Kavita).
 *
 * Expected URL shape (case-sensitive path):
 * https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/<meals|snacks>/<filename>
 *
 * Do not invent URLs — only use real uploaded object links.
 */
export const KAVITA_FOOD_IMAGE_URLS: Record<
  | "kavita-masala-dosa"
  | "kavita-tamarind-rice"
  | "kavita-tomato-bath"
  | "kavita-poori-potato-masala"
  | "kavita-veg-pongal"
  | "kavita-ragi-mudde-bassaru"
  | "kavita-masala-peanuts"
  | "kavita-kodubale"
  | "kavita-nippattu",
  string
> = {
  /** Masala dosa */
  "kavita-masala-dosa":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meals/Masala%20dosa.jpeg",
  /** Tamarind rice */
  "kavita-tamarind-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meals/Tamarind%20rice.jpeg",
  /** Tomato bath */
  "kavita-tomato-bath":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meals/Tomato%20bath.jpeg",
  /** Poori & potato masala */
  "kavita-poori-potato-masala":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meals/Poori%20&%20potato%20masala.jpeg",
  /** Veg pongal */
  "kavita-veg-pongal":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meals/Veg%20pongal.jpeg",
  /** Ragi mudde & bassaru */
  "kavita-ragi-mudde-bassaru":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meals/Ragi%20mudde%20&%20bassaru.jpeg",
  /** Masala peanuts */
  "kavita-masala-peanuts":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/snacks/Masala%20Peanuts.jpeg",
  /** Kodubale */
  "kavita-kodubale":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/snacks/Kodubale.jpeg",
  /** Nippattu */
  "kavita-nippattu":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/snacks/Nippattu.jpeg",
};

/** Apply `food-images` URLs when present; otherwise keep the original meal photo. */
export function applyKavitaFoodImages(meals: readonly Meal[]): Meal[] {
  return meals.map((meal) => {
    const url = KAVITA_FOOD_IMAGE_URLS[meal.id as keyof typeof KAVITA_FOOD_IMAGE_URLS]?.trim();
    if (!url) return { ...meal };
    return { ...meal, photo: url };
  });
}
