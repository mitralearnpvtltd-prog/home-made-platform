import type { Meal } from "./cookData";

/**
 * Inchara dish photos from the public Supabase Storage bucket `food-images`.
 *
 * Paste each uploaded public object URL against the matching meal id.
 * Leave a value empty to keep the existing meal photo (empty fallback for Inchara).
 *
 * Expected URL shape (case-sensitive path):
 * https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/<meals|snacks>/<filename>
 *
 * Do not invent URLs — only use real uploaded object links.
 */
export const INCHARA_FOOD_IMAGE_URLS: Record<
  | "inchara-vegetable-khichdi"
  | "inchara-bisibelebath"
  | "inchara-chapati-vegetable-curry"
  | "inchara-sambar-rice-meal"
  | "inchara-vegetable-upma"
  | "inchara-rava-idli"
  | "inchara-onion-pakoda"
  | "inchara-masala-makhana",
  string
> = {
  /** Vegetable khichdi */
  "inchara-vegetable-khichdi":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meals/vegetable%20khichdi.jpeg",
  /** Bisibelebath */
  "inchara-bisibelebath":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meals/Bisibelebath.jpeg",
  /** Chapati & vegetable curry */
  "inchara-chapati-vegetable-curry":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meals/Chapati%20%20&%20vegetable%20curry.jpeg",
  /** Sambar rice meal */
  "inchara-sambar-rice-meal":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meals/Sambar%20rice%20meal.jpeg",
  /** Vegetable upma */
  "inchara-vegetable-upma":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meals/Vegetable%20upma.jpeg",
  /** Rava idli */
  "inchara-rava-idli":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meals/Rava%20idli.jpeg",
  /** Onion pakoda */
  "inchara-onion-pakoda":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/snacks/Onion%20pakoda.jpeg",
  /** Masala makhana */
  "inchara-masala-makhana":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/snacks/Masala%20makhana.jpeg",
};

/** Apply `food-images` URLs when present; otherwise keep the original meal photo. */
export function applyIncharaFoodImages(meals: readonly Meal[]): Meal[] {
  return meals.map((meal) => {
    const url = INCHARA_FOOD_IMAGE_URLS[meal.id as keyof typeof INCHARA_FOOD_IMAGE_URLS]?.trim();
    if (!url) return { ...meal };
    return { ...meal, photo: url };
  });
}
