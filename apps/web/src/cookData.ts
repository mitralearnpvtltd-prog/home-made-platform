import * as cooks from "./assets/cooks";

export type CookOffer = "meals-snacks" | "snacks";

export type Cook = {
  id: string;
  name: string;
  blurb: string;
  offerLabel: string;
  offer: CookOffer;
  fromPrice: number;
  pickupLabel: string;
  photo: string;
  hasMenu: boolean;
};

export type MealCategory = "meals" | "breakfast" | "snacks";

export type Meal = {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  reviews: number;
  category: MealCategory;
  photo: string;
  pack?: string;
};

export const COOKS: Cook[] = [
  {
    id: "lakshmi",
    name: "Lakshmi’s Kitchen",
    blurb: "Everyday South Indian comfort food",
    offerLabel: "Meals & homemade snacks",
    offer: "meals-snacks",
    fromPrice: 60,
    pickupLabel: "Available for 1:00 PM pickup",
    photo: cooks.cookLakshmi,
    hasMenu: true,
  },
  {
    id: "meena",
    name: "Meena’s Home Food",
    blurb: "Familiar flavours, freshly prepared",
    offerLabel: "Meals & crispy homemade snacks",
    offer: "meals-snacks",
    fromPrice: 60,
    pickupLabel: "Available for 1:00 PM pickup",
    photo: cooks.cookMeena,
    hasMenu: false,
  },
  {
    id: "agalya",
    name: "Agalya’s Kitchen",
    blurb: "Home-style favourites for your journey",
    offerLabel: "Meals & homemade snacks",
    offer: "meals-snacks",
    fromPrice: 100,
    pickupLabel: "Available for 1:00 PM pickup",
    photo: cooks.cookAgalya,
    hasMenu: false,
  },
  {
    id: "padma",
    name: "Padma’s Kitchen",
    blurb: "Simple meals, made with care",
    offerLabel: "Breakfast, lunch & snacks",
    offer: "meals-snacks",
    fromPrice: 80,
    pickupLabel: "Available for 1:00 PM pickup",
    photo: cooks.cookPadma,
    hasMenu: false,
  },
];

export const LAKSHMI_MEALS: Meal[] = [
  {
    id: "veg-lunch",
    name: "Homestyle veg lunch",
    description: "Rice, sambar, poriyal & curd",
    price: 140,
    rating: 4.6,
    reviews: 4,
    category: "meals",
    photo: cooks.mealVegLunch,
  },
  {
    id: "lemon-rice",
    name: "Lemon rice & potato fry",
    description: "Tangy lemon rice with crispy potatoes",
    price: 100,
    rating: 4.7,
    reviews: 38,
    category: "meals",
    photo: cooks.mealLemonRice,
  },
  {
    id: "idli",
    name: "Soft idli & chutney",
    description: "4 idli, chutney & sambar",
    price: 80,
    rating: 4.6,
    reviews: 52,
    category: "breakfast",
    photo: cooks.mealIdli,
  },
  {
    id: "curd-rice",
    name: "Curd rice & pickle",
    description: "A cooling homestyle favourite",
    price: 90,
    rating: 4.6,
    reviews: 29,
    category: "meals",
    photo: cooks.mealCurdRice,
  },
  {
    id: "chapati",
    name: "Chapati & vegetable curry",
    description: "3 chapati with seasonal curry",
    price: 110,
    rating: 4.7,
    reviews: 31,
    category: "meals",
    photo: cooks.mealChapati,
  },
  {
    id: "pulao",
    name: "Vegetable pulao",
    description: "Mild pulao with vegetables",
    price: 120,
    rating: 4.7,
    reviews: 6,
    category: "meals",
    photo: cooks.mealPulao,
  },
  {
    id: "banana-chips",
    name: "Banana chips",
    description: "Crispy homemade chips",
    price: 60,
    rating: 4.8,
    reviews: 27,
    category: "snacks",
    photo: cooks.mealBananaChips,
    pack: "100g pack",
  },
  {
    id: "murukku",
    name: "Murukku",
    description: "Crunchy homemade murukku",
    price: 70,
    rating: 4.7,
    reviews: 34,
    category: "snacks",
    photo: cooks.mealMurukku,
    pack: "100g pack",
  },
  {
    id: "mixture",
    name: "Spiced mixture",
    description: "Mildly spiced tea-time mix",
    price: 65,
    rating: 4.6,
    reviews: 21,
    category: "snacks",
    photo: cooks.mealMixture,
    pack: "100g pack",
  },
];

export const FROM_CITIES = ["Bangalore", "Hyderabad", "Chennai", "Kochi", "Coimbatore"] as const;
export const TO_CITIES = ["Chennai", "Salem", "Hyderabad", "Kochi", "Coimbatore"] as const;

export const PICKUP_STOPS = [
  {
    name: "Hosur",
    time: "1:00 PM",
    title: "Hosur · Food pickup stop",
    detail: "Collect near the main entrance, Hosur bus stand",
  },
  {
    name: "Krishnagiri",
    time: "2:30 PM",
    title: "Krishnagiri · Food pickup stop",
    detail: "Collect near the main entrance, Krishnagiri bus stand",
  },
  {
    name: "Vellore",
    time: "4:30 PM",
    title: "Vellore · Food pickup stop",
    detail: "Collect near the main entrance, Vellore bus stand",
  },
] as const;

export type JourneyChoice = {
  from: string;
  to: string;
  pickup: string;
  date: Date;
};

export const INITIAL_JOURNEY: JourneyChoice = {
  from: "Bangalore",
  to: "Chennai",
  pickup: "Hosur",
  date: new Date(2026, 9, 18),
};

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function pickupMeta(name: string) {
  return PICKUP_STOPS.find((stop) => stop.name === name) ?? PICKUP_STOPS[0];
}

export function formatBarDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}-${MONTHS_SHORT[date.getMonth()]}-${date.getFullYear()}`;
}

export function formatLongDate(date: Date) {
  return `${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;
}

export function formatBannerDate(date: Date) {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatRupees(value: number) {
  return `₹${value}`;
}
