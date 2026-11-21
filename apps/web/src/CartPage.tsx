import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { imgBusStop } from "./assets/cooks";
import {
  imgAltArrowDownStreamlineSolarAr,
  imgBoardingTheCityBus11,
  imgColorfulCalendarIconWithCheckmark1,
  imgMapPointStreamlineSolar,
  imgRedHattedDeliveryRiderWithParcel1,
} from "./assets/landing";
import imgKitchenLakshmi from "./assets/mobile-landing/imgKitchenLakshmi.png";
import {
  FIXED_PICKUP_POINT,
  formatRupees,
  isBengaluruPlace,
  journeyPickName,
  normalizeJourneySearch,
  type JourneyChoice,
  type Meal,
} from "./cookData";
import {
  CHECKOUT_DELIVERY_FEE_LIST,
  checkoutGstFromSubtotal,
  checkoutTotalFromSubtotal,
  formatCheckoutMoney,
  formatGstAmount,
} from "./lib/checkoutFees";
import { getMyProfile } from "./lib/api";
import { cacheProfile, getAccessToken, readCachedProfile } from "./lib/authSession";
import { normalizePhoneDigits } from "./lib/profileDisplay";
import { useLocationRecents } from "./lib/useLocationRecents";
import { useLocationSuggest, type LocationSuggestStatus } from "./lib/useLocationSuggest";
import { MealBagThumb } from "./MealBagThumb";
import { kitchenPhoto, SWATHI_MENU_KITCHEN, type MenuKitchen } from "./menuKitchen";
import "./styles/cart.css";
import "./styles/cook.css";

type CartLine = { meal: Meal; qty: number };

type CartPageProps = {
  bag: CartLine[];
  kitchen?: MenuKitchen;
  journey: JourneyChoice;
  setJourney: Dispatch<SetStateAction<JourneyChoice>>;
  stop: { name: string; time: string };
  setQty: (id: string, qty: number) => void;
  bagThumbPulse?: Record<string, number>;
  onBack: () => void;
  onEditJourney: () => void;
  onProceed: () => void;
  orderingFor: "myself" | "someone-else" | null;
  setOrderingFor: (value: "myself" | "someone-else" | null) => void;
  pickupName: string;
  setPickupName: (name: string) => void;
  pickupPhone: string;
  setPickupPhone: (phone: string) => void;
  someoneElseName: string;
  setSomeoneElseName: (name: string) => void;
  someoneElsePhone: string;
  setSomeoneElsePhone: (phone: string) => void;
  placingOrder?: boolean;
  placeOrderError?: string;
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function CartPage({
  bag,
  kitchen = SWATHI_MENU_KITCHEN,
  journey,
  setJourney,
  stop,
  setQty,
  bagThumbPulse = {},
  onBack,
  onEditJourney,
  onProceed,
  orderingFor,
  setOrderingFor,
  pickupName,
  setPickupName,
  pickupPhone,
  setPickupPhone,
  someoneElseName,
  setSomeoneElseName,
  someoneElsePhone,
  setSomeoneElsePhone,
  placingOrder = false,
  placeOrderError = "",
}: CartPageProps) {
  const [localThumbPulse, setLocalThumbPulse] = useState<Record<string, number>>({});
  const [localPulseMode, setLocalPulseMode] = useState<Record<string, "serve" | "wobble">>({});
  const [leavingIds, setLeavingIds] = useState<Record<string, true>>({});
  const itemCount = bag.reduce((total, line) => total + line.qty, 0);
  const subtotal = useMemo(() => bag.reduce((total, line) => total + line.meal.price * line.qty, 0), [bag]);
  const gst = checkoutGstFromSubtotal(subtotal);
  const total = checkoutTotalFromSubtotal(subtotal);
  const journeyDate = `${String(journey.date.getDate()).padStart(2, "0")} ${journey.date.toLocaleString("en", { month: "short" })} ${journey.date.getFullYear()}`;
  const suggestRef = useRef<HTMLElement>(null);
  const [suggest, setSuggest] = useState<"from" | "to" | "pickup" | null>(null);
  const [typed, setTyped] = useState(false);
  const fromRecentsState = useLocationRecents("from");
  const toRecentsState = useLocationRecents("to");
  const fromSuggest = useLocationSuggest(
    "from_locality",
    journey.from,
    typed && suggest === "from" && Boolean(journey.from.trim()),
  );
  const toSuggest = useLocationSuggest(
    "to_destination",
    journey.to,
    typed && suggest === "to" && Boolean(journey.to.trim()),
  );
  const showFromSuggest =
    suggest === "from" && (typed ? Boolean(journey.from.trim()) : fromRecentsState.recents.length > 0);
  const showToSuggest =
    suggest === "to" && (typed ? Boolean(journey.to.trim()) : toRecentsState.recents.length > 0);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (orderingFor !== "myself" || !window.matchMedia("(max-width: 767px)").matches) return;

    let cancelled = false;
    const cached = readCachedProfile();
    const cachedName = cached?.fullName?.trim() ?? "";
    const cachedPhone = cached?.phone ? formatCollectorPhone(cached.phone) : "";
    setPickupName(cachedName);
    setPickupPhone(cachedPhone);
    setProfileError("");
    setProfileLoading(Boolean(getAccessToken()));

    if (!getAccessToken()) return;

    void getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        cacheProfile(profile);
        setPickupName(profile.fullName?.trim() ?? "");
        setPickupPhone(profile.phone ? formatCollectorPhone(profile.phone) : "");
      })
      .catch(() => {
        if (cancelled) return;
        setProfileError("Could not load your registered details. Please try again or choose someone else.");
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderingFor, setPickupName, setPickupPhone]);

  function chooseCollector(value: "myself" | "someone-else") {
    setOrderingFor(value);
    setProfileError("");
    if (value === "someone-else") {
      setPickupName(someoneElseName);
      setPickupPhone(someoneElsePhone);
    } else {
      setPickupName("");
      setPickupPhone("");
    }
  }

  function formatCollectorPhone(phone: string) {
    const digits = normalizePhoneDigits(phone);
    return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : phone.trim();
  }

  return (
    <main className="cart-page">
      <header className="cart-header">
        <button className="cart-back" type="button" aria-label="Go back" onClick={onBack}>
          <ChevronLeftIcon />
        </button>
        <span className="cart-wordmark">aahaa</span>
        <span className="cart-bag-icon" aria-label={`${bag.length} items in cart`}>
          <CartIcon />
          {bag.length > 0 ? <em>{bag.length}</em> : null}
        </span>
      </header>

      <section className="cart-content">
        <div className="cart-heading">
          <h1>Your Cart <span>({itemCount} items)</span></h1>
          <p>Review your selected items and proceed to pay</p>
        </div>

        <section className="cart-journey" aria-label="Journey details" ref={suggestRef}>
          <div className="cart-journey-row cart-journey-route">
            <div className="cart-journey-field-wrap">
              <JourneyTextField
                icon={imgBoardingTheCityBus11}
                label="From"
                value={journey.from}
                onFocus={() => {
                  setSuggest("from");
                  setTyped(false);
                }}
                onChange={(next) => {
                  setJourney((current) => ({ ...current, from: next }));
                  setSuggest("from");
                  setTyped(true);
                }}
              />
              {showFromSuggest ? (
                <CartPlaceSuggest
                  query={typed ? journey.from : ""}
                  recents={fromRecentsState.recents}
                  popularTitle="Popular Boarding Points near you"
                  popular={typed ? fromSuggest.items : []}
                  popularMeta="Board at"
                  remoteStatus={typed && journey.from.trim() ? fromSuggest.status : undefined}
                  onClearRecents={fromRecentsState.clear}
                  onPick={(name) => {
                    fromRecentsState.remember(name);
                    setJourney((current) => ({ ...current, from: name }));
                    setSuggest(null);
                    setTyped(false);
                  }}
                />
              ) : null}
            </div>
            <span className="cart-route-swap" aria-hidden="true"><SwapIcon /></span>
            <div className="cart-journey-field-wrap">
              <JourneyTextField
                icon={imgBoardingTheCityBus11}
                label="To"
                value={journey.to}
                onFocus={() => {
                  setSuggest("to");
                  setTyped(false);
                }}
                onChange={(next) => {
                  setJourney((current) => ({ ...current, to: next }));
                  setSuggest("to");
                  setTyped(true);
                }}
              />
              {showToSuggest ? (
                <CartPlaceSuggest
                  query={typed ? journey.to : ""}
                  recents={toRecentsState.recents}
                  popularTitle="Popular Dropping Points near you"
                  popular={typed ? toSuggest.items : []}
                  popularMeta="Drop at"
                  remoteStatus={typed && journey.to.trim() ? toSuggest.status : undefined}
                  excludeBengaluru
                  onClearRecents={toRecentsState.clear}
                  onPick={(name) => {
                    toRecentsState.remember(name);
                    setJourney((current) => ({ ...current, to: name }));
                    setSuggest(null);
                    setTyped(false);
                  }}
                />
              ) : null}
            </div>
          </div>
          <div className="cart-journey-row">
            <JourneyTextField
              icon={imgRedHattedDeliveryRiderWithParcel1}
              label="Pickup point"
              value={FIXED_PICKUP_POINT}
              onFocus={() => {
                setSuggest(null);
                setTyped(false);
                setJourney((current) =>
                  current.pickup === FIXED_PICKUP_POINT
                    ? current
                    : { ...current, pickup: FIXED_PICKUP_POINT },
                );
              }}
              onChange={() => {
                setJourney((current) => ({ ...current, pickup: FIXED_PICKUP_POINT }));
                setSuggest(null);
                setTyped(false);
              }}
            />
            <JourneyField icon={imgColorfulCalendarIconWithCheckmark1} label="Date of journey" value={journeyDate} />
          </div>
          <div className="cart-journey-row cart-journey-last">
            <button className="cart-edit-journey" type="button" onClick={onEditJourney}>
              Edit your Journey <PencilIcon />
            </button>
          </div>
        </section>

        <section className="cart-kitchen" aria-label={`Cart items from ${kitchen.name}`}>
          <div className="cart-kitchen-header">
            <img className="cart-kitchen-photo" src={kitchenPhoto(kitchen, imgKitchenLakshmi)} alt="" />
            <div className="cart-kitchen-info">
              <div className="cart-kitchen-title">
                <strong>{kitchen.name}</strong>
                {kitchen.isVegetarian === true ? (
                  <span className="cart-veg"><LeafIcon /> Vegetarian</span>
                ) : null}
              </div>
              <p>{kitchen.blurb || "Everyday South Indian comfort food"}</p>
              <small>
                <span className="cart-offer-icon"><OfferIcon /></span>{" "}
                {kitchen.offerLabel || "Meals & homemade snacks"}
              </small>
              {kitchen.rating !== null ? (
                <div className="cart-rating">
                  <span>★</span> {kitchen.rating}
                  {kitchen.reviewCount >= 120 ? " (120+)" : kitchen.reviewCount ? ` (${kitchen.reviewCount})` : ""}
                </div>
              ) : null}
            </div>
          </div>

          <ul className="cart-items">
            {bag.map(({ meal, qty }, index) => {
              const pulseKey = Math.max(bagThumbPulse[meal.id] ?? 0, localThumbPulse[meal.id] ?? 0);
              const pulseMode =
                (bagThumbPulse[meal.id] ?? 0) >= (localThumbPulse[meal.id] ?? 0)
                  ? "serve"
                  : localPulseMode[meal.id] ?? "wobble";
              const leaving = Boolean(leavingIds[meal.id]);

              return (
                <li
                  className={`cart-item is-enter${leaving ? " is-leave" : ""}`}
                  key={meal.id}
                  style={{ ["--ck-bag-enter-delay" as string]: `${index * 55}ms` }}
                  onAnimationEnd={(event) => {
                    if (event.target !== event.currentTarget || !leaving) return;
                    setLeavingIds((current) => {
                      const next = { ...current };
                      delete next[meal.id];
                      return next;
                    });
                    setQty(meal.id, 0);
                  }}
                >
                  <MealBagThumb meal={meal} pulseKey={pulseKey} pulseMode={pulseMode} />
                  <div className="cart-item-detail">
                    <strong>{meal.id === "lemon-rice" ? "Lemon Rice" : meal.name}</strong>
                    <p>{meal.id === "lemon-rice" ? "Homemade lemon rice with peanuts and mild spices" : meal.description}</p>
                    <b>{formatRupees(meal.price)}</b>
                  </div>
                  <button
                    className="cart-remove"
                    type="button"
                    aria-label={`Remove ${meal.name}`}
                    onClick={() => {
                      if (leaving) return;
                      if (prefersReducedMotion()) {
                        setQty(meal.id, 0);
                        return;
                      }
                      setLeavingIds((current) => ({ ...current, [meal.id]: true }));
                    }}
                  >
                    <TrashIcon />
                  </button>
                  <div className="cart-quantity">
                    <button
                      type="button"
                      aria-label={`Decrease ${meal.name} quantity`}
                      onClick={() => {
                        if (leaving) return;
                        if (qty <= 1) {
                          if (prefersReducedMotion()) {
                            setQty(meal.id, 0);
                            return;
                          }
                          setLeavingIds((current) => ({ ...current, [meal.id]: true }));
                          return;
                        }
                        const nonce = Date.now();
                        setLocalThumbPulse((current) => ({ ...current, [meal.id]: nonce }));
                        setLocalPulseMode((current) => ({ ...current, [meal.id]: "wobble" }));
                        setQty(meal.id, qty - 1);
                      }}
                    >
                      −
                    </button>
                    <span>{qty}</span>
                    <button
                      type="button"
                      aria-label={`Increase ${meal.name} quantity`}
                      onClick={() => {
                        if (leaving) return;
                        setQty(meal.id, qty + 1);
                      }}
                    >
                      +
                    </button>
                  </div>
                </li>
              );
            })}
            {bag.length === 0 ? <li className="cart-empty">Your cart is empty. Add a meal from {kitchen.name}.</li> : null}
          </ul>
        </section>

        <button className="cart-reviews" type="button">
          <span className="cart-review-ticket"><TicketIcon /></span>
          <span>View all reviews</span>
          <ChevronRightIcon />
        </button>

        <section className="cart-bill" aria-label="Bill details">
          <h2>Bill details</h2>
          <BillRow label={`Items subtotal (${itemCount} items)`} value={formatCheckoutMoney(subtotal)} highlight />
          <BillRow label="GST (18%)" value={formatGstAmount(gst)} />
          <div className="cart-bill-row">
            <span>Delivery Fee</span>
            <span className="ck-fee-pair">
              <s className="ck-fee-strike">{formatCheckoutMoney(CHECKOUT_DELIVERY_FEE_LIST)}</s>
              <span className="ck-fee-free">FREE</span>
            </span>
          </div>
          <div className="cart-bill-total">
            <strong>Total</strong>
            <strong>{formatCheckoutMoney(total)}</strong>
          </div>
        </section>

        <section className="cart-collector" aria-labelledby="cart-collector-title">
          <h2 id="cart-collector-title">Who&apos;s collecting?</h2>
          <div className="cart-collector-options" role="group" aria-label="Who is collecting the order">
            <button
              type="button"
              className={orderingFor === "myself" ? "is-selected" : undefined}
              aria-pressed={orderingFor === "myself"}
              onClick={() => chooseCollector("myself")}
            >
              Myself
            </button>
            <button
              type="button"
              className={orderingFor === "someone-else" ? "is-selected" : undefined}
              aria-pressed={orderingFor === "someone-else"}
              onClick={() => chooseCollector("someone-else")}
            >
              For someone else
            </button>
          </div>
          {orderingFor === "myself" ? (
            <div className="cart-collector-details" aria-live="polite">
              {profileLoading ? <p>Loading registered details…</p> : pickupName && pickupPhone ? (
                <>
                  <p><span>Name</span><strong>{pickupName}</strong></p>
                  <p><span>Mobile number</span><strong>{pickupPhone}</strong></p>
                  {profileError ? <p role="alert">{profileError} Showing the saved details.</p> : null}
                </>
              ) : (
                <p role={profileError ? "alert" : undefined}>
                  {profileError || "Please sign in or choose someone else to enter collector details."}
                </p>
              )}
            </div>
          ) : null}
          {orderingFor === "someone-else" ? (
            <div className="cart-collector-fields">
              <label>
                Name
                <input
                  type="text"
                  autoComplete="name"
                  value={someoneElseName}
                  onChange={(event) => {
                    setSomeoneElseName(event.target.value);
                    setPickupName(event.target.value);
                  }}
                />
              </label>
              <label>
                Mobile number
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={someoneElsePhone}
                  onChange={(event) => {
                    setSomeoneElsePhone(event.target.value);
                    setPickupPhone(event.target.value);
                  }}
                />
              </label>
            </div>
          ) : null}
        </section>

        <section className="cart-pickup">
          <span className="cart-pickup-pin"><PickupPinIcon /></span>
          <div>
            <strong>Pickup at {stop.name}</strong>
            <p>Collect your order at {stop.name} bus stand</p>
          </div>
          <img src={imgBusStop} alt="" />
        </section>
      </section>

      <footer className="cart-checkout">
        <div className="cart-checkout-total">
          <strong>{formatRupees(subtotal)}</strong>
          <span>{itemCount} items</span>
        </div>
        {placeOrderError ? <p className="ck-place-order-error" role="alert">{placeOrderError}</p> : null}
        <button
          className="cart-proceed"
          type="button"
          disabled={bag.length === 0 || placingOrder}
          onClick={onProceed}
        >
          {placingOrder ? "Opening Cashfree…" : <>Proceed to pay <ProceedIcon /></>}
        </button>
      </footer>
    </main>
  );
}

function JourneyField({ icon, label, value }: { icon: string | null; label: string; value: string }) {
  return (
    <div className="cart-journey-field">
      {icon ? <img src={icon} alt="" /> : <ClockIcon />}
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  );
}

function JourneyTextField({
  icon,
  label,
  value,
  onFocus,
  onChange,
}: {
  icon: string;
  label: string;
  value: string;
  onFocus: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <label className="cart-journey-field cart-journey-field--input">
      <img src={icon} alt="" />
      <span>
        <small>{label}</small>
        <input value={value} aria-label={label} onFocus={onFocus} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function CartPlaceSuggest({
  query,
  recents,
  popularTitle,
  popular,
  popularMeta,
  remoteStatus,
  excludeBengaluru = false,
  onClearRecents,
  onPick,
}: {
  query: string;
  recents: { title: string; action: string }[];
  popularTitle: string;
  popular: readonly { title: string; city: string }[];
  popularMeta: string;
  remoteStatus?: LocationSuggestStatus;
  excludeBengaluru?: boolean;
  onClearRecents: () => void;
  onPick: (name: string) => void;
}) {
  const needle = normalizeJourneySearch(query.trim());
  const useRemote = remoteStatus !== undefined && remoteStatus !== "idle";
  const recentHits = recents.filter((item) => {
    if (!normalizeJourneySearch(item.title).includes(needle)) return false;
    if (excludeBengaluru && isBengaluruPlace(journeyPickName(item.title))) return false;
    return true;
  });
  const popularHits = useRemote
    ? popular.filter((item) => !(excludeBengaluru && isBengaluruPlace(item.title)))
    : popular.filter((item) => {
        if (!normalizeJourneySearch(`${item.title} ${item.city}`).includes(needle)) return false;
        if (excludeBengaluru && isBengaluruPlace(item.title)) return false;
        return true;
      });
  const showLoading = remoteStatus === "loading";
  const showError = remoteStatus === "error";
  const showEmpty = remoteStatus === "empty" && popularHits.length === 0;
  if (!recentHits.length && !popularHits.length && !showLoading && !showError && !showEmpty) return null;

  return (
    <div className="cart-suggest" onMouseDown={(event) => event.preventDefault()}>
      {recentHits.length > 0 ? (
        <div className="cart-suggest-section">
          <div className="cart-suggest-head">
            <p>Recent searches</p>
            <button type="button" onClick={onClearRecents}>
              Clear all
            </button>
          </div>
          {recentHits.map((item) => (
            <button key={item.title} type="button" className="cart-suggest-row" onClick={() => onPick(journeyPickName(item.title))}>
              <span className="cart-suggest-icon">
                <SuggestClockIcon />
              </span>
              <span className="cart-suggest-title">{item.title}</span>
              {item.action ? <span className="cart-suggest-meta">{item.action}</span> : null}
              <img className="cart-suggest-chevron" src={imgAltArrowDownStreamlineSolarAr} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {showLoading ? (
        <div className="cart-suggest-section">
          <div className="cart-suggest-head">
            <p>Searching…</p>
          </div>
        </div>
      ) : null}
      {showError ? (
        <div className="cart-suggest-section">
          <div className="cart-suggest-head">
            <p>Unable to load places</p>
          </div>
        </div>
      ) : null}
      {showEmpty ? (
        <div className="cart-suggest-section">
          <div className="cart-suggest-head">
            <p>No matching places</p>
          </div>
        </div>
      ) : null}
      {popularHits.length > 0 ? (
        <div className="cart-suggest-section">
          <div className="cart-suggest-head">
            <p>{popularTitle}</p>
          </div>
          {popularHits.map((item) => (
            <button key={item.title} type="button" className="cart-suggest-row cart-suggest-row--stop" onClick={() => onPick(item.title)}>
              <span className="cart-suggest-icon">
                <img src={imgMapPointStreamlineSolar} alt="" />
              </span>
              <span className="cart-suggest-copy">
                <strong>{item.title}</strong>
                <small>{item.city}</small>
              </span>
              <span className="cart-suggest-meta">{popularMeta}</span>
              <img className="cart-suggest-chevron" src={imgAltArrowDownStreamlineSolarAr} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SuggestClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="#FF4B2B" strokeWidth="1.5" />
      <path d="M12 7.75V12.1L15.1 14.15" stroke="#FF4B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BillRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`cart-bill-row${highlight ? " is-highlight" : ""}`}><span>{label}</span><span>{value}</span></div>;
}

function ChevronLeftIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5" /></svg>;
}

function ChevronRightIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>;
}

function CartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2 12h11l2-9H6" /><circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" /></svg>;
}

function ClockIcon() {
  return <svg className="cart-clock-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>;
}

function PencilIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13.5 3.5 3 3L7 16H4v-3z" /><path d="m12 5 3 3" /></svg>;
}

function TrashIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 5h12M7 5V3h4v2m3 0-.7 10H4.7L4 5m3 3v4m4-4v4" /></svg>;
}

function LeafIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 2.5C7 2.4 3 5.2 3 9.2c0 2 1.4 3.3 3.3 3.3 4 0 6.8-4 7.2-10Z" /><path d="M3.3 13.5c1.4-2.6 3.7-4.8 7-6.5" /></svg>;
}

function TicketIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5h14v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" /><path d="M10 6.5v1m0 2v1m0 2v1" /></svg>;
}

function PickupPinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-6-5.3-6-11a6 6 0 1 1 12 0c0 5.7-6 11-6 11Z" /><circle cx="12" cy="9" r="2" /></svg>;
}

function SwapIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5h10M10 2l3 3-3 3M13 11H3m3-3-3 3 3 3" /></svg>;
}

function OfferIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5h10v9H3zM5 5V3h6v2" /><path d="M6 8h4" /></svg>;
}

function ProceedIcon() {
  return <svg viewBox="0 0 18 18" aria-hidden="true"><path d="M2 9h12m-5-5 5 5-5 5" /></svg>;
}
