import type { Meal } from "./cookData";

/**
 * Meal Bag–only bowl-style dish photos (`food-images` bucket).
 *
 * Paste each uploaded public object URL against the matching meal id.
 * Leave a value empty to keep the shared menu `meal.photo` for that item.
 *
 * Expected URL shape (case-sensitive path):
 * https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/<Kitchen>/meal-bag/<filename>
 *
 * Do not invent URLs — only use real uploaded object links.
 * Menu-page photos stay in each kitchen’s `*FoodImages.ts` map and are unchanged here.
 */
export const MEAL_BAG_FOOD_IMAGE_URLS: Record<string, string> = {
  // Swathi
  "veg-lunch":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meal-bag/veg-lunch.jpeg",
  "lemon-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meal-bag/lemon-rice.jpeg",
  idli:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meal-bag/idli.jpeg",
  "curd-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meal-bag/curd-rice.jpeg",
  chapati:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meal-bag/chapati.jpeg",
  pulao:
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Swathi/meal-bag/pulao.jpeg",
  "banana-chips": "",
  murukku: "",
  mixture: "",

  // Kavita
  "kavita-masala-dosa":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meal-bag/dosa.jpeg",
  "kavita-tamarind-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meal-bag/tamarind.jpeg",
  "kavita-tomato-bath":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meal-bag/tomato.jpeg",
  "kavita-poori-potato-masala":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meal-bag/puri.jpeg",
  "kavita-veg-pongal":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meal-bag/veg.jpeg",
  "kavita-ragi-mudde-bassaru":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Kavita/meal-bag/ragi.jpeg",
  "kavita-masala-peanuts": "",
  "kavita-kodubale": "",
  "kavita-nippattu": "",

  // Monica
  "monica-lemon-rice":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meal-bag/lemon.jpeg",
  "monica-curd-rice-pickle":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meal-bag/curd%20rice.jpeg",
  "monica-tomato-bath":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meal-bag/tomato.jpeg",
  "monica-set-dosa":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meal-bag/set.jpeg",
  "monica-soft-idli":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meal-bag/soft.jpeg",
  "monica-akki-roti":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Monica/meal-bag/roti.jpeg",
  "monica-chakli": "",
  "monica-roasted-chana": "",

  // Inchara
  "inchara-vegetable-khichdi":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meal-bag/khichdi.jpeg",
  "inchara-bisibelebath":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meal-bag/bisi.jpeg",
  "inchara-chapati-vegetable-curry":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meal-bag/chapati.jpeg",
  "inchara-sambar-rice-meal":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meal-bag/sambar.jpeg",
  "inchara-vegetable-upma":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meal-bag/upma.jpeg",
  "inchara-rava-idli":
    "https://fdbdlwwangidgwydhhcq.supabase.co/storage/v1/object/public/food-images/Inchara/meal-bag/rava.jpeg",
  "inchara-onion-pakoda": "",
  "inchara-masala-makhana": "",
};

/** Meal Bag thumbnail: bowl URL when set, otherwise the shared menu photo. */
export function mealBagPhoto(meal: Meal): string {
  const url = MEAL_BAG_FOOD_IMAGE_URLS[meal.id]?.trim();
  return url || meal.photo;
}

export function mealBagServingLabel(meal: Meal): string {
  return meal.pack ?? "1 serving";
}

/* -------------------------------------------------------------------------- */
/* Dish-specific Meal Bag animation profiles                                  */
/* -------------------------------------------------------------------------- */

export type MealBagAromaStyle = "none" | "delicate" | "soft" | "flowing" | "layered" | "dense" | "warm-thin";
export type MealBagSteamIntensity = "none" | "low" | "medium" | "high";
export type MealBagSteamSpeed = "slow" | "medium" | "fast";
export type MealBagSteamCurve = "soft" | "narrow" | "wide" | "drift-left" | "drift-right" | "layered";
/** Visual accent only when supported by the dish / photo — never invent toppings. */
export type MealBagGarnishType =
  | "none"
  | "temper"
  | "curry-leaf"
  | "peanut"
  | "herb"
  | "mustard"
  | "coriander";
export type MealBagGarnishSpeed = "slow" | "medium" | "lively";
export type MealBagFoodMotion = "still" | "calm" | "float" | "breathe" | "warm-pulse";
export type MealBagWarmthEffect = "none" | "cool" | "soft" | "warm" | "rich";

export type MealBagAnimProfile = {
  aromaStyle: MealBagAromaStyle;
  steamIntensity: MealBagSteamIntensity;
  steamSpeed: MealBagSteamSpeed;
  steamCurve: MealBagSteamCurve;
  garnishType: MealBagGarnishType;
  garnishCount: 0 | 1 | 2 | 3 | 4;
  garnishSpeed: MealBagGarnishSpeed;
  foodMotion: MealBagFoodMotion;
  warmthEffect: MealBagWarmthEffect;
};

const SNACK_PROFILE: MealBagAnimProfile = {
  aromaStyle: "none",
  steamIntensity: "none",
  steamSpeed: "slow",
  steamCurve: "soft",
  garnishType: "none",
  garnishCount: 0,
  garnishSpeed: "slow",
  foodMotion: "still",
  warmthEffect: "none",
};

/** Cool curd rice — no hot steam; light tempering accents (mustard/chilli) only. */
const COLD_CURD_PROFILE: MealBagAnimProfile = {
  aromaStyle: "none",
  steamIntensity: "none",
  steamSpeed: "slow",
  steamCurve: "soft",
  garnishType: "temper",
  garnishCount: 2,
  garnishSpeed: "slow",
  foodMotion: "calm",
  warmthEffect: "cool",
};

const CHAPATI_PROFILE: MealBagAnimProfile = {
  aromaStyle: "warm-thin",
  steamIntensity: "low",
  steamSpeed: "slow",
  steamCurve: "narrow",
  garnishType: "none",
  garnishCount: 0,
  garnishSpeed: "slow",
  foodMotion: "calm",
  warmthEffect: "soft",
};

const IDLI_PROFILE: MealBagAnimProfile = {
  aromaStyle: "delicate",
  steamIntensity: "low",
  steamSpeed: "slow",
  steamCurve: "soft",
  garnishType: "temper",
  garnishCount: 2,
  garnishSpeed: "slow",
  foodMotion: "float",
  warmthEffect: "soft",
};

const LEMON_RICE_PROFILE: MealBagAnimProfile = {
  aromaStyle: "flowing",
  steamIntensity: "medium",
  steamSpeed: "medium",
  steamCurve: "drift-right",
  garnishType: "curry-leaf",
  garnishCount: 3,
  garnishSpeed: "lively",
  foodMotion: "breathe",
  warmthEffect: "warm",
};

const PULAO_PROFILE: MealBagAnimProfile = {
  aromaStyle: "layered",
  steamIntensity: "high",
  steamSpeed: "medium",
  steamCurve: "layered",
  garnishType: "coriander",
  garnishCount: 3,
  garnishSpeed: "medium",
  foodMotion: "warm-pulse",
  warmthEffect: "rich",
};

/** Per-meal-id profiles — prefer exact IDs over broad category heuristics. */
export const MEAL_BAG_ANIM_PROFILES: Record<string, MealBagAnimProfile> = {
  // —— Swathi ——
  idli: { ...IDLI_PROFILE },
  "lemon-rice": { ...LEMON_RICE_PROFILE, garnishType: "peanut", garnishCount: 3 },
  pulao: { ...PULAO_PROFILE },
  "curd-rice": { ...COLD_CURD_PROFILE },
  chapati: { ...CHAPATI_PROFILE },
  /** Thali photo already shows many components — aroma + warmth only, no falling garnish. */
  "veg-lunch": {
    aromaStyle: "layered",
    steamIntensity: "medium",
    steamSpeed: "medium",
    steamCurve: "wide",
    garnishType: "none",
    garnishCount: 0,
    garnishSpeed: "slow",
    foodMotion: "breathe",
    warmthEffect: "rich",
  },
  "banana-chips": { ...SNACK_PROFILE },
  murukku: { ...SNACK_PROFILE },
  mixture: { ...SNACK_PROFILE },

  // —— Kavita ——
  "kavita-masala-dosa": {
    aromaStyle: "soft",
    steamIntensity: "low",
    steamSpeed: "medium",
    steamCurve: "wide",
    garnishType: "none",
    garnishCount: 0,
    garnishSpeed: "slow",
    foodMotion: "breathe",
    warmthEffect: "warm",
  },
  "kavita-tamarind-rice": {
    aromaStyle: "flowing",
    steamIntensity: "medium",
    steamSpeed: "medium",
    steamCurve: "drift-left",
    garnishType: "peanut",
    garnishCount: 2,
    garnishSpeed: "medium",
    foodMotion: "breathe",
    warmthEffect: "warm",
  },
  "kavita-tomato-bath": {
    aromaStyle: "flowing",
    steamIntensity: "medium",
    steamSpeed: "medium",
    steamCurve: "drift-right",
    garnishType: "coriander",
    garnishCount: 2,
    garnishSpeed: "medium",
    foodMotion: "warm-pulse",
    warmthEffect: "warm",
  },
  "kavita-poori-potato-masala": {
    aromaStyle: "warm-thin",
    steamIntensity: "low",
    steamSpeed: "slow",
    steamCurve: "narrow",
    garnishType: "none",
    garnishCount: 0,
    garnishSpeed: "slow",
    foodMotion: "calm",
    warmthEffect: "soft",
  },
  "kavita-veg-pongal": {
    aromaStyle: "soft",
    steamIntensity: "medium",
    steamSpeed: "slow",
    steamCurve: "soft",
    garnishType: "temper",
    garnishCount: 2,
    garnishSpeed: "slow",
    foodMotion: "float",
    warmthEffect: "warm",
  },
  "kavita-ragi-mudde-bassaru": {
    aromaStyle: "warm-thin",
    steamIntensity: "low",
    steamSpeed: "slow",
    steamCurve: "narrow",
    garnishType: "none",
    garnishCount: 0,
    garnishSpeed: "slow",
    foodMotion: "calm",
    warmthEffect: "soft",
  },
  "kavita-masala-peanuts": { ...SNACK_PROFILE },
  "kavita-kodubale": { ...SNACK_PROFILE },
  "kavita-nippattu": { ...SNACK_PROFILE },

  // —— Monica ——
  "monica-lemon-rice": {
    ...LEMON_RICE_PROFILE,
    garnishType: "mustard",
    garnishCount: 3,
    steamCurve: "drift-left",
  },
  "monica-curd-rice-pickle": { ...COLD_CURD_PROFILE },
  "monica-tomato-bath": {
    aromaStyle: "flowing",
    steamIntensity: "medium",
    steamSpeed: "medium",
    steamCurve: "wide",
    garnishType: "herb",
    garnishCount: 2,
    garnishSpeed: "medium",
    foodMotion: "warm-pulse",
    warmthEffect: "warm",
  },
  "monica-set-dosa": {
    aromaStyle: "soft",
    steamIntensity: "low",
    steamSpeed: "medium",
    steamCurve: "soft",
    garnishType: "none",
    garnishCount: 0,
    garnishSpeed: "slow",
    foodMotion: "breathe",
    warmthEffect: "soft",
  },
  "monica-soft-idli": { ...IDLI_PROFILE },
  "monica-akki-roti": { ...CHAPATI_PROFILE },
  "monica-chakli": { ...SNACK_PROFILE },
  "monica-roasted-chana": { ...SNACK_PROFILE },

  // —— Inchara ——
  "inchara-vegetable-khichdi": {
    aromaStyle: "layered",
    steamIntensity: "medium",
    steamSpeed: "medium",
    steamCurve: "layered",
    garnishType: "herb",
    garnishCount: 2,
    garnishSpeed: "medium",
    foodMotion: "warm-pulse",
    warmthEffect: "warm",
  },
  "inchara-bisibelebath": {
    aromaStyle: "dense",
    steamIntensity: "high",
    steamSpeed: "fast",
    steamCurve: "layered",
    garnishType: "temper",
    garnishCount: 2,
    garnishSpeed: "lively",
    foodMotion: "warm-pulse",
    warmthEffect: "rich",
  },
  "inchara-chapati-vegetable-curry": { ...CHAPATI_PROFILE },
  "inchara-sambar-rice-meal": {
    aromaStyle: "layered",
    steamIntensity: "medium",
    steamSpeed: "medium",
    steamCurve: "wide",
    garnishType: "none",
    garnishCount: 0,
    garnishSpeed: "slow",
    foodMotion: "breathe",
    warmthEffect: "warm",
  },
  "inchara-vegetable-upma": {
    aromaStyle: "soft",
    steamIntensity: "medium",
    steamSpeed: "slow",
    steamCurve: "soft",
    garnishType: "temper",
    garnishCount: 2,
    garnishSpeed: "slow",
    foodMotion: "float",
    warmthEffect: "soft",
  },
  "inchara-rava-idli": { ...IDLI_PROFILE, steamCurve: "narrow", garnishCount: 2 },
  "inchara-onion-pakoda": { ...SNACK_PROFILE },
  "inchara-masala-makhana": { ...SNACK_PROFILE },
};

const FALLBACK_HOT: MealBagAnimProfile = {
  aromaStyle: "soft",
  steamIntensity: "low",
  steamSpeed: "medium",
  steamCurve: "soft",
  garnishType: "none",
  garnishCount: 0,
  garnishSpeed: "slow",
  foodMotion: "breathe",
  warmthEffect: "soft",
};

export function mealBagAnimProfile(meal: Meal): MealBagAnimProfile {
  const exact = MEAL_BAG_ANIM_PROFILES[meal.id];
  if (exact) return exact;
  if (meal.category === "snacks") return SNACK_PROFILE;
  return FALLBACK_HOT;
}

export function mealBagShowsSteam(meal: Meal): boolean {
  const profile = mealBagAnimProfile(meal);
  return profile.aromaStyle !== "none" && profile.steamIntensity !== "none";
}

/** @deprecated Prefer mealBagAnimProfile(meal).garnishType */
export type MealBagGarnish = MealBagGarnishType;

export function mealBagGarnish(meal: Meal): MealBagGarnishType {
  return mealBagAnimProfile(meal).garnishType;
}

/** CSS custom properties derived from a dish profile (for data-driven animations). */
export function mealBagAnimStyle(profile: MealBagAnimProfile): Record<string, string> {
  const speedScale =
    profile.steamSpeed === "slow" ? "1.35" : profile.steamSpeed === "fast" ? "0.72" : "1";
  const garnishScale =
    profile.garnishSpeed === "slow" ? "1.35" : profile.garnishSpeed === "lively" ? "0.75" : "1";
  /* Tuned for 52×52 thumbnails — previous values were too faint on real food photos. */
  const intensityOpacity =
    profile.steamIntensity === "high" ? "1" : profile.steamIntensity === "medium" ? "0.92" : "0.78";
  return {
    "--ck-steam-speed": speedScale,
    "--ck-steam-opacity": intensityOpacity,
    "--ck-garnish-speed": garnishScale,
  };
}

/** How many steam wisps to render for the intensity (visible at 52×52). */
export function mealBagSteamWispCount(profile: MealBagAnimProfile): number {
  if (profile.aromaStyle === "none" || profile.steamIntensity === "none") return 0;
  if (profile.steamIntensity === "high") return 4;
  if (profile.steamIntensity === "medium") return 3;
  return 2;
}
