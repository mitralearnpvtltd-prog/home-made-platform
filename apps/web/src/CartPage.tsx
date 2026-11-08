import { useMemo } from "react";
import { imgBusStop, mealLemonRice } from "./assets/cooks";
import { imgBoardingTheCityBus11, imgColorfulCalendarIconWithCheckmark1, imgRedHattedDeliveryRiderWithParcel1 } from "./assets/landing";
import imgKitchenLakshmi from "./assets/mobile-landing/imgKitchenLakshmi.png";
import { formatRupees, type JourneyChoice, type Meal } from "./cookData";
import "./styles/cart.css";

type CartLine = { meal: Meal; qty: number };

type CartPageProps = {
  bag: CartLine[];
  journey: JourneyChoice;
  stop: { name: string; time: string };
  setQty: (id: string, qty: number) => void;
  onBack: () => void;
  onEditJourney: () => void;
  onProceed: () => void;
};

export function CartPage({ bag, journey, stop, setQty, onBack, onEditJourney, onProceed }: CartPageProps) {
  const itemCount = bag.reduce((total, line) => total + line.qty, 0);
  const subtotal = useMemo(() => bag.reduce((total, line) => total + line.meal.price * line.qty, 0), [bag]);
  const deliveryFee = 30;
  const taxes = 25.3;
  const total = subtotal + deliveryFee + taxes;
  const journeyDate = `${String(journey.date.getDate()).padStart(2, "0")} ${journey.date.toLocaleString("en", { month: "short" })} ${journey.date.getFullYear()}`;

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

        <section className="cart-journey" aria-label="Journey details">
          <div className="cart-journey-row cart-journey-route">
            <JourneyField icon={imgBoardingTheCityBus11} label="From" value={journey.from} />
            <span className="cart-route-swap" aria-hidden="true"><SwapIcon /></span>
            <JourneyField icon={imgBoardingTheCityBus11} label="To" value={journey.to} />
          </div>
          <div className="cart-journey-row">
            <JourneyField icon={imgRedHattedDeliveryRiderWithParcel1} label="Pickup point" value={journey.pickup} />
            <JourneyField icon={imgColorfulCalendarIconWithCheckmark1} label="Date of journey" value={journeyDate} />
          </div>
          <div className="cart-journey-row cart-journey-last">
            <JourneyField icon={null} label="Pickup time" value={stop.time} />
            <button className="cart-edit-journey" type="button" onClick={onEditJourney}>
              Edit your Journey <PencilIcon />
            </button>
          </div>
        </section>

        <section className="cart-kitchen" aria-label="Cart items from Lakshmi’s Kitchen">
          <div className="cart-kitchen-header">
            <img className="cart-kitchen-photo" src={imgKitchenLakshmi} alt="" />
            <div className="cart-kitchen-info">
              <div className="cart-kitchen-title">
                <strong>Lakshmi’s Kitchen</strong>
                <span className="cart-veg"><LeafIcon /> Vegetarian</span>
              </div>
              <p>Everyday South Indian comfort food</p>
              <small><span className="cart-offer-icon"><OfferIcon /></span> Meals &amp; homemade snacks</small>
              <div className="cart-rating"><span>★</span> 4.8 (120+)</div>
            </div>
          </div>

          <ul className="cart-items">
            {bag.map(({ meal, qty }) => (
              <li className="cart-item" key={meal.id}>
                <img
                  className="cart-item-photo"
                  src={meal.id === "lemon-rice" ? mealLemonRice : meal.photo}
                  alt=""
                />
                <div className="cart-item-detail">
                  <strong>{meal.id === "lemon-rice" ? "Lemon Rice" : meal.name}</strong>
                  <p>{meal.id === "lemon-rice" ? "Homemade lemon rice with peanuts and mild spices" : meal.description}</p>
                  <b>{formatRupees(meal.price)}</b>
                </div>
                <button className="cart-remove" type="button" aria-label={`Remove ${meal.name}`} onClick={() => setQty(meal.id, 0)}>
                  <TrashIcon />
                </button>
                <div className="cart-quantity">
                  <button type="button" aria-label={`Decrease ${meal.name} quantity`} onClick={() => setQty(meal.id, qty - 1)}>−</button>
                  <span>{qty}</span>
                  <button type="button" aria-label={`Increase ${meal.name} quantity`} onClick={() => setQty(meal.id, qty + 1)}>+</button>
                </div>
              </li>
            ))}
            {bag.length === 0 ? <li className="cart-empty">Your cart is empty. Add a meal from Lakshmi’s Kitchen.</li> : null}
          </ul>
        </section>

        <button className="cart-reviews" type="button">
          <span className="cart-review-ticket"><TicketIcon /></span>
          <span>View all reviews</span>
          <ChevronRightIcon />
        </button>

        <section className="cart-bill" aria-label="Bill details">
          <h2>Bill details</h2>
          <BillRow label={`Items total (${itemCount} items)`} value={formatRupees(subtotal)} highlight />
          <BillRow label="Delivery Fee" value={formatRupees(deliveryFee)} />
          <BillRow label="GST & Other Charges" value={formatCartAmount(taxes)} />
          <div className="cart-bill-total">
            <strong>Total amount</strong>
            <strong>{formatCartAmount(total)}</strong>
          </div>
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
        <button className="cart-proceed" type="button" disabled={bag.length === 0} onClick={onProceed}>
          Proceed to pay <ProceedIcon />
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

function BillRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return <div className={`cart-bill-row${highlight ? " is-highlight" : ""}`}><span>{label}</span><span>{value}</span></div>;
}

function formatCartAmount(value: number) {
  return Number.isInteger(value) ? formatRupees(value) : `₹${value.toFixed(2)}`;
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
