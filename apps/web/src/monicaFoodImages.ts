import type { Meal } from "./cookData";

/**
 * Monica dish photos from the public Supabase Storage bucket `food-images`.
 *
 * Paste each uploaded public object URL against the matching meal id.
 * Leave a value empty to keep the existing meal photo (empty fallback for Monica).
 *
 * Expected URL shape (case-sensitive path):
 * https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/<meals|snacks>/<filename>
 *
 * Do not invent URLs — only use real uploaded object links.
 */
export const MONICA_FOOD_IMAGE_URLS: Record<
  | "monica-lemon-rice"
  | "monica-curd-rice-pickle"
  | "monica-tomato-bath"
  | "monica-set-dosa"
  | "monica-soft-idli"
  | "monica-akki-roti"
  | "monica-chakli"
  | "monica-roasted-chana",
  string
> = {
  /** Lemon rice */
  "monica-lemon-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meals/Lemon%20rice.jpeg",
  /** Curd rice & pickle */
  "monica-curd-rice-pickle":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meals/Curd%20%20rice%20&%20pickle.jpeg",
  /** Tomato bath */
  "monica-tomato-bath":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meals/Tomato%20%20bath.jpeg",
  /** Set dosa */
  "monica-set-dosa":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meals/Set%20dosa.jpeg",
  /** Soft idli */
  "monica-soft-idli":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meals/Soft%20idli.jpeg",
  /** Akki roti */
  "monica-akki-roti":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meals/Akki%20roti.jpeg",
  /** Chakli */
  "monica-chakli":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/snacks/Chakli.jpeg",
  /** Roasted chana */
  "monica-roasted-chana":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/snacks/Roasted%20chana.jpeg",
};

/** Apply `food-images` URLs when present; otherwise keep the original meal photo. */
export function applyMonicaFoodImages(meals: readonly Meal[]): Meal[] {
  return meals.map((meal) => {
    const url = MONICA_FOOD_IMAGE_URLS[meal.id as keyof typeof MONICA_FOOD_IMAGE_URLS]?.trim();
    if (!url) return { ...meal };
    return { ...meal, photo: url };
  });
}
