import { useEffect, useRef, useState, type RefObject } from "react";
import type { Meal } from "./cookData";
import {
  mealBagAnimProfile,
  mealBagAnimStyle,
  mealBagPhoto,
  mealBagShowsSteam,
  mealBagSteamWispCount,
  type MealBagAnimProfile,
  type MealBagGarnishType,
} from "./mealBagFoodImages";

function useMealBagThumbMotion(rootRef: RefObject<Element | null>) {
  const [active, setActive] = useState(true);
  const intersectingRef = useRef(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const sync = () => {
      setActive(intersectingRef.current && document.visibilityState === "visible");
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        intersectingRef.current = entry.isIntersecting;
        sync();
      },
      { threshold: 0.2, rootMargin: "24px" },
    );
    observer.observe(el);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [rootRef]);

  return active;
}

function mealBagFxClass(profile: MealBagAnimProfile, boost: boolean): string {
  return [
    "ck-bag-fx",
    `aroma-${profile.aromaStyle}`,
    `steam-${profile.steamIntensity}`,
    `speed-${profile.steamSpeed}`,
    `curve-${profile.steamCurve}`,
    `motion-${profile.foodMotion}`,
    `warmth-${profile.warmthEffect}`,
    boost ? "is-boost" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function MealBagSteam({
  profile,
  boost = false,
}: {
  profile: MealBagAnimProfile;
  boost?: boolean;
}) {
  const count = mealBagSteamWispCount(profile);
  if (count <= 0) return null;
  return (
    <span
      className={`ck-bag-steam curve-${profile.steamCurve}${boost ? " ck-bag-steam--boost" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <i key={index} className={`ck-bag-wisp ck-bag-wisp--${index + 1}`} />
      ))}
    </span>
  );
}

function MealBagGarnishAccent({
  kind,
  count,
  boost = false,
}: {
  kind: MealBagGarnishType;
  count: number;
  boost?: boolean;
}) {
  if (kind === "none" || count <= 0) return null;
  return (
    <span
      className={`ck-bag-garnish ck-bag-garnish--${kind} is-loop garnish-n-${count}${boost ? " is-boost" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: count }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

export function MealBagAliveLayers({
  meal,
  profile,
  boost = false,
}: {
  meal: Meal;
  profile: MealBagAnimProfile;
  boost?: boolean;
}) {
  const showSteam = mealBagShowsSteam(meal);
  return (
    <span className={`ck-bag-alive ${mealBagFxClass(profile, boost)}`} style={mealBagAnimStyle(profile)}>
      <img src={mealBagPhoto(meal)} alt="" draggable={false} />
      {profile.warmthEffect !== "none" ? <span className="ck-bag-shine" aria-hidden="true" /> : null}
      {showSteam ? <MealBagSteam profile={profile} boost={boost} /> : null}
      <MealBagGarnishAccent kind={profile.garnishType} count={profile.garnishCount} boost={boost} />
      {boost ? (
        <span className="ck-bag-celebrate" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </span>
  );
}

export function MealBagThumb({
  meal,
  pulseKey,
  pulseMode = "serve",
}: {
  meal: Meal;
  pulseKey: number;
  pulseMode?: "serve" | "wobble";
}) {
  const profile = mealBagAnimProfile(meal);
  const rootRef = useRef<HTMLButtonElement>(null);
  const photoRef = useRef<HTMLSpanElement>(null);
  const motionActive = useMealBagThumbMotion(rootRef);
  const [burst, setBurst] = useState<"idle" | "serve" | "wobble">("idle");
  const lastPulseRef = useRef(0);

  useEffect(() => {
    if (pulseKey <= 0 || pulseKey === lastPulseRef.current) return;
    lastPulseRef.current = pulseKey;
    const el = photoRef.current;
    const mode = pulseMode === "wobble" ? "wobble" : "serve";
    if (el) {
      el.classList.remove("is-serve", "is-wobble");
      void el.offsetWidth;
      el.classList.add(mode === "wobble" ? "is-wobble" : "is-serve");
    }
    setBurst(mode);
  }, [pulseKey, pulseMode]);

  return (
    <button
      ref={rootRef}
      type="button"
      className={`ck-bag-item-media${mealBagShowsSteam(meal) ? " ck-bag-item-media--hot" : ""}${
        motionActive ? "" : " is-paused"
      }`}
      aria-label={`${meal.name} preview`}
      onClick={(event) => {
        event.preventDefault();
        const el = photoRef.current;
        if (el) {
          el.classList.remove("is-serve", "is-wobble");
          void el.offsetWidth;
          el.classList.add("is-wobble");
        }
        setBurst("wobble");
      }}
    >
      <span
        ref={photoRef}
        className="ck-bag-item-photo"
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          event.currentTarget.classList.remove("is-serve", "is-wobble");
          setBurst("idle");
        }}
      >
        <MealBagAliveLayers meal={meal} profile={profile} boost={burst === "serve"} />
      </span>
    </button>
  );
}
