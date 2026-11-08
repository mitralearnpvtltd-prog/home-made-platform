import { useEffect, useMemo, useRef, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import {
  cookLakshmiMenu,
  editBusStop,
  imgBusStop,
  lemonHeroMain,
  lemonIncPickle,
  lemonIncPotato,
  lemonIncRice,
  lemonThumb1,
  lemonThumb2,
  lemonThumb3,
  metaChefHat,
  metaLeaf,
  metaRiceBowl,
  serveCloche,
} from "./assets/cooks";
import trackMapBase from "./assets/cooks/trackMapBase.svg";
import imgKitchenLakshmi from "./assets/mobile-landing/imgKitchenLakshmi.png";
import paymentKitchen from "./assets/payment/payment-kitchen.png";
import paymentCompleteSuccess from "./assets/payment/payment-complete-success.png";
import paymentCompleteInvoice from "./assets/payment/payment-complete-invoice.png";
import paymentGooglePayLogo from "./assets/payment/payment-google-pay.svg";
import paymentPhonePeLogo from "./assets/payment/payment-phonepe.svg";
import paymentPaytmLogo from "./assets/payment/payment-paytm.svg";
import * as a from "./assets/landing";
import {
  COOKS,
  FROM_CITIES,
  INITIAL_JOURNEY,
  LAKSHMI_MEALS,
  PICKUP_STOPS,
  TO_CITIES,
  formatBannerDate,
  formatBarDate,
  formatRupees,
  pickupMeta,
  type Cook,
  type JourneyChoice,
  type Meal,
  type MealCategory,
} from "./cookData";
import { navigate, PATHS } from "./navigation";
import { CartPage } from "./CartPage";
import "./styles/cook.css";

type CookFilter = "all" | "meals-snacks" | "snacks" | "veg" | "nonveg";
type CookSort = "default" | "price-asc" | "price-desc";
type MenuTab = "all" | MealCategory;
type JourneyPanel = "from" | "to" | "pickup" | "date" | "time" | null;
type BagLine = { meal: Meal; qty: number };
type PaymentMethod = "google-pay" | "phonepe" | "paytm" | "other-upi";

const INITIAL_BAG: BagLine[] = LAKSHMI_MEALS.filter((meal) => meal.id === "lemon-rice" || meal.id === "banana-chips").map(
  (meal) => ({ meal, qty: 1 }),
);

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function monthCells(year: number, month: number) {
  const weekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<number | null>(weekday).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
}

export function CookPages({ path }: { path: string }) {
  const [bag, setBag] = useState<BagLine[]>(INITIAL_BAG);
  const [journey, setJourney] = useState<JourneyChoice>(INITIAL_JOURNEY);
  const [journeyPanel, setJourneyPanel] = useState<JourneyPanel>(null);
  const [kitchenNote, setKitchenNote] = useState("");
  const [pickupName, setPickupName] = useState("Ananya Rao");
  const [pickupPhone, setPickupPhone] = useState("+91 9876543210");
  const [collectionPoint, setCollectionPoint] = useState("Main entrance near bus-stop sign");
  const [pickupNote, setPickupNote] = useState("");
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("google-pay");
  const [upiId, setUpiId] = useState("");

  function addMeal(meal: Meal) {
    setBag((current) => {
      const found = current.find((line) => line.meal.id === meal.id);
      if (found) {
        return current.map((line) => (line.meal.id === meal.id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...current, { meal, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    setBag((current) => {
      if (qty <= 0) return current.filter((line) => line.meal.id !== id);
      return current.map((line) => (line.meal.id === id ? { ...line, qty } : line));
    });
  }

  const bagCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const stop = pickupMeta(journey.pickup);
  const returnTo = useRef<string>(PATHS.cooks);
  const paymentBackTo = useRef<string>(PATHS.confirmPickup);
  const confirmPickupBackTo = useRef<string>(PATHS.reviewOrder);
  const editing = path === PATHS.editJourney;
  const mealDetail = path === PATHS.lemonRice;
  const mealBagPage = path === PATHS.mealBag;
  const reviewOrderPage = path === PATHS.reviewOrder;
  const confirmPickupPage = path === PATHS.confirmPickup;
  const paymentMethodPage = path === PATHS.paymentMethod;
  const paymentStatusPage = path === PATHS.paymentStatus;
  const invoicePage = path === PATHS.invoice;
  const orderSummaryPage = path === PATHS.orderSummary;
  const trackOrderPage = path === PATHS.trackOrder;
  const profilePage = path === PATHS.profile;
  const accountDetailsPage = path === PATHS.accountDetails;
  const myOrdersPage = path === PATHS.myOrders;
  const notificationsPage = path === PATHS.notifications;
  const settingsPage = path === PATHS.appSettings;
  const helpSupportPage = path === PATHS.helpSupport;
  const aboutPage = path === PATHS.about;
  const logoutPage = path === PATHS.logout;
  const accountPage = profilePage || accountDetailsPage || myOrdersPage || notificationsPage || settingsPage || helpSupportPage || aboutPage || logoutPage;
  const onMenu = path === PATHS.lakshmiMenu || mealDetail;

  useEffect(() => {
    if (path === PATHS.cooks || path === PATHS.lakshmiMenu) returnTo.current = path;
  }, [path]);

  const pageClass = mealDetail
    ? "ck-page ck-page--menu ck-page--meal"
    : path === PATHS.lakshmiMenu
      ? "ck-page ck-page--menu"
      : reviewOrderPage || confirmPickupPage
        || paymentMethodPage || paymentStatusPage || invoicePage || orderSummaryPage || trackOrderPage
        ? "ck-page ck-page--checkout"
        : accountPage
          ? `ck-page ck-page--profile${myOrdersPage ? " ck-page--orders" : ""}`
      : path === PATHS.editJourney
        ? "ck-page ck-page--edit"
        : "ck-page";

  if (path === PATHS.cart) {
    return (
      <CartPage
        bag={bag}
        journey={journey}
        stop={stop}
        setQty={setQty}
        onBack={() => navigate(PATHS.cooks)}
        onEditJourney={() => navigate(PATHS.editJourney)}
        onProceed={() => {
          paymentBackTo.current = PATHS.cart;
          navigate(PATHS.paymentMethod);
        }}
      />
    );
  }

  return (
    <div className={pageClass}>
      {paymentMethodPage || paymentStatusPage || orderSummaryPage || notificationsPage || settingsPage ? <MobileStatusBar /> : null}
      <CookHeader
        bagCount={onMenu || mealBagPage || reviewOrderPage || confirmPickupPage || paymentMethodPage || paymentStatusPage || invoicePage || orderSummaryPage || trackOrderPage || myOrdersPage ? bagCount : 0}
        hideCart={accountPage && !myOrdersPage}
        profilePage={accountPage}
        hideProfileOnMobile={
          accountPage || trackOrderPage || path === PATHS.cooks || path === PATHS.lakshmiMenu || path === PATHS.lemonRice
        }
        showBack={onMenu || mealBagPage || reviewOrderPage || confirmPickupPage || paymentMethodPage || myOrdersPage || accountDetailsPage}
        listingCart={path === PATHS.cooks || myOrdersPage}
        backTo={
          invoicePage
            ? PATHS.home
            : paymentMethodPage
              ? paymentBackTo.current
              : confirmPickupPage
                ? confirmPickupBackTo.current
                : reviewOrderPage
              ? PATHS.mealBag
              : accountDetailsPage
                ? PATHS.profile
                : mealDetail || mealBagPage
              ? PATHS.lakshmiMenu
              : PATHS.cooks
        }
      />
      {editing ? <div className="ck-edit-hairline" /> : null}
      {editing ? (
        <EditJourney journey={journey} setJourney={setJourney} returnTo={returnTo.current} />
      ) : (
        <>
          {accountPage ? null : <JourneyBar journey={journey} setJourney={setJourney} panel={journeyPanel} setPanel={setJourneyPanel} />}
          {accountDetailsPage ? (
            <AccountDetailsPage />
          ) : profilePage ? (
            <ProfilePage
              onPaymentMethods={() => {
                paymentBackTo.current = PATHS.profile;
                navigate(PATHS.paymentMethod);
              }}
            />
          ) : myOrdersPage ? (
            <MyOrdersPage />
          ) : notificationsPage ? (
            <NotificationsPage />
          ) : settingsPage ? (
            <AppSettingsPage />
          ) : helpSupportPage ? (
            <HelpSupportPage bag={bag} journey={journey} stop={stop} />
          ) : aboutPage ? (
            <AboutAahaaPage />
          ) : logoutPage ? (
            <LogoutPage />
          ) : mealDetail ? (
            <LemonRiceDetail
              bag={bag}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
            />
          ) : path === PATHS.lakshmiMenu ? (
            <LakshmiMenu
              bag={bag}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
              onContinue={() => navigate(PATHS.mealBag)}
            />
          ) : mealBagPage ? (
            <MealBagPage
              bag={bag}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
              kitchenNote={kitchenNote}
              setKitchenNote={setKitchenNote}
              onContinue={() => {
                const mobile = window.matchMedia("(max-width: 767px)").matches;
                confirmPickupBackTo.current = mobile ? PATHS.reviewOrder : PATHS.mealBag;
                navigate(mobile ? PATHS.reviewOrder : PATHS.confirmPickup);
              }}
            />
          ) : reviewOrderPage ? (
            <ReviewOrderPage
              bag={bag}
              journey={journey}
              stop={stop}
              kitchenNote={kitchenNote}
              onContinue={() => {
                confirmPickupBackTo.current = PATHS.reviewOrder;
                navigate(PATHS.confirmPickup);
              }}
            />
          ) : confirmPickupPage ? (
            <ConfirmPickupPage
              bag={bag}
              journey={journey}
              setJourney={setJourney}
              stop={stop}
              pickupName={pickupName}
              setPickupName={setPickupName}
              pickupPhone={pickupPhone}
              setPickupPhone={setPickupPhone}
              collectionPoint={collectionPoint}
              setCollectionPoint={setCollectionPoint}
              pickupNote={pickupNote}
              setPickupNote={setPickupNote}
              pickupConfirmed={pickupConfirmed}
              setPickupConfirmed={setPickupConfirmed}
              backTo={confirmPickupBackTo.current}
              onContinue={() => {
                paymentBackTo.current = PATHS.confirmPickup;
                navigate(PATHS.paymentMethod);
              }}
            />
          ) : paymentMethodPage ? (
            <PaymentMethodPage
              bag={bag}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              upiId={upiId}
              setUpiId={setUpiId}
              backTo={paymentBackTo.current}
              onPay={() => navigate(
                window.matchMedia("(max-width: 767px)").matches ? PATHS.paymentStatus : PATHS.invoice,
              )}
            />
          ) : paymentStatusPage ? (
            window.matchMedia("(max-width: 767px)").matches ? (
              <MobilePaymentStatusPage
                bag={bag}
                journey={journey}
                stop={stop}
                onComplete={() => navigate(PATHS.orderSummary)}
              />
            ) : (
              <PreparingInvoicePage onComplete={() => navigate(PATHS.orderSummary)} bag={bag} />
            )
          ) : invoicePage ? (
            window.matchMedia("(max-width: 767px)").matches ? (
              <MobileOrderInvoice
                bag={bag}
                journey={journey}
                stop={stop}
                paymentMethod={paymentMethod}
              />
            ) : (
              <PreparingInvoicePage onComplete={() => navigate(PATHS.orderSummary)} bag={bag} />
            )
          ) : orderSummaryPage ? (
            <OrderSummaryPage
              bag={bag}
              journey={journey}
              stop={stop}
              pickupName={pickupName}
              pickupPhone={pickupPhone}
              paymentMethod={paymentMethod}
            />
          ) : trackOrderPage ? (
            <TrackOrderPage bag={bag} stop={stop} journey={journey} />
          ) : (
            <CookListing journey={journey} stop={stop} onChangeStop={() => setJourneyPanel("pickup")} />
          )}
        </>
      )}
      <CookFooter />
      {path === PATHS.cooks || profilePage || myOrdersPage || trackOrderPage ? (
        <MobileTabBar active={profilePage ? "profile" : myOrdersPage ? "orders" : trackOrderPage ? "track" : "home"} />
      ) : null}
    </div>
  );
}

function CookHeader({
  bagCount,
  showBack = false,
  listingCart = false,
  backTo = PATHS.cooks,
  hideCart = false,
  profilePage = false,
  hideProfileOnMobile = false,
}: {
  bagCount: number;
  showBack?: boolean;
  listingCart?: boolean;
  backTo?: string;
  hideCart?: boolean;
  profilePage?: boolean;
  hideProfileOnMobile?: boolean;
}) {
  return (
    <header className="ck-header">
      <div className="ck-header-left">
        {showBack ? (
          <button className="ck-m-back" type="button" aria-label="Back" onClick={() => navigate(backTo)}>
            <BackChevronIcon />
          </button>
        ) : null}
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
        <nav className="ck-nav">
          <button type="button" onClick={() => navigate(PATHS.home)}>
            Why aahaa
          </button>
          <button type="button" onClick={() => navigate(PATHS.home)}>
            How it works
          </button>
          <button type="button">Help</button>
        </nav>
      </div>
      <div className="ck-header-tools">
        {!hideCart ? (
          <button
            className={listingCart ? "ck-cart ck-cart--mobile-only" : "ck-cart"}
            type="button"
            aria-label={bagCount > 0 ? `${bagCount} items in meal bag` : "Meal bag"}
            onClick={() => {
              if (window.matchMedia("(max-width: 767px)").matches) navigate(PATHS.cart);
            }}
            style={{ border: 0, padding: 0, background: "transparent", cursor: "default" }}
          >
            <CartIcon />
            {bagCount > 0 ? <em>{bagCount}</em> : null}
          </button>
        ) : null}
        <button
          className={`ck-avatar${profilePage ? " is-active" : ""}${hideProfileOnMobile ? " ck-avatar--mobile-hidden" : ""}`}
          type="button"
          aria-label="My profile"
          aria-current={profilePage ? "page" : undefined}
          onClick={() => navigate(PATHS.profile)}
        >
          <ProfileIcon />
        </button>
      </div>
    </header>
  );
}

function JourneyBar({
  journey,
  setJourney,
  panel,
  setPanel,
}: {
  journey: JourneyChoice;
  setJourney: Dispatch<SetStateAction<JourneyChoice>>;
  panel: JourneyPanel;
  setPanel: (panel: JourneyPanel) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const stop = pickupMeta(journey.pickup);
  const [viewMonth, setViewMonth] = useState(() => new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [setPanel]);

  function toggle(next: Exclude<JourneyPanel, null>) {
    setPanel(panel === next ? null : next);
    if (next === "date") setViewMonth(new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
  }

  function choosePickup(name: string) {
    setJourney((current) => ({ ...current, pickup: name }));
    setPanel(null);
  }

  return (
    <div className="ck-journey" ref={barRef} aria-label="Selected journey">
      <JourneySelect
        area="from"
        icon={<img src={a.imgBoardingTheCityBus11} alt="" />}
        label="From"
        value={journey.from}
        open={panel === "from"}
        onToggle={() => toggle("from")}
      >
        {FROM_CITIES.map((city) => (
          <button
            key={city}
            type="button"
            className={city === journey.from ? "is-on" : undefined}
            onClick={() => {
              setJourney((current) => ({ ...current, from: city }));
              setPanel(null);
            }}
          >
            {city}
          </button>
        ))}
      </JourneySelect>

      <button
        className="ck-journey-swap"
        type="button"
        aria-label="Swap from and to"
        onClick={() => setJourney((current) => ({ ...current, from: current.to, to: current.from }))}
      >
        <img src={a.imgSortHorizontalStreamlineSolarAr} alt="" />
      </button>

      <JourneySelect
        area="to"
        icon={<img src={a.imgBusExitAdventure1} alt="" />}
        label="To"
        value={journey.to}
        open={panel === "to"}
        onToggle={() => toggle("to")}
      >
        {TO_CITIES.map((city) => (
          <button
            key={city}
            type="button"
            className={city === journey.to ? "is-on" : undefined}
            onClick={() => {
              setJourney((current) => ({ ...current, to: city }));
              setPanel(null);
            }}
          >
            {city}
          </button>
        ))}
      </JourneySelect>

      <span className="ck-journey-rule ck-journey-rule--1" aria-hidden="true" />

      <JourneySelect
        area="pickup"
        icon={<img src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />}
        label="Pickup point"
        value={journey.pickup}
        open={panel === "pickup"}
        onToggle={() => toggle("pickup")}
        chevron
      >
        {PICKUP_STOPS.map((item) => (
          <button
            key={item.name}
            type="button"
            className={item.name === journey.pickup ? "is-on" : undefined}
            onClick={() => choosePickup(item.name)}
          >
            <strong>{item.name}</strong>
            <small>{item.time}</small>
          </button>
        ))}
      </JourneySelect>

      <JourneySelect
        area="date"
        icon={<img src={a.imgColorfulCalendarIconWithCheckmark1} alt="" />}
        label="Date of journey"
        value={formatBarDate(journey.date)}
        open={panel === "date"}
        onToggle={() => toggle("date")}
        wide
      >
        <div className="ck-cal-nav">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          >
            ‹
          </button>
          <strong>
            {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </strong>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          >
            ›
          </button>
        </div>
        <div className="ck-cal">
          {WEEKDAYS.map((day) => (
            <span key={day} className="ck-cal-wd">
              {day}
            </span>
          ))}
          {monthCells(viewMonth.getFullYear(), viewMonth.getMonth()).map((day, index) => {
            if (!day) return <span key={`e-${index}`} />;
            const cell = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
            return (
              <button
                key={cell.toISOString()}
                type="button"
                className={sameDay(cell, journey.date) ? "is-on" : undefined}
                onClick={() => {
                  setJourney((current) => ({ ...current, date: cell }));
                  setPanel(null);
                }}
              >
                {day}
              </button>
            );
          })}
        </div>
      </JourneySelect>

      <span className="ck-journey-rule ck-journey-rule--2" aria-hidden="true" />

      <div className="ck-journey-field ck-journey-time">
        <BarClockIcon />
        <span>
          <small>Pickup time</small>
          <strong>{stop.time}</strong>
        </span>
      </div>

      <button className="ck-edit-journey" type="button" onClick={() => navigate(PATHS.editJourney)}>
        <PencilIcon />
        <span className="ck-edit-label-desk">Edit journey</span>
        <span className="ck-edit-label-m">Edit your Journey</span>
      </button>
    </div>
  );
}

function JourneySelect({
  area,
  icon,
  label,
  value,
  open,
  onToggle,
  chevron,
  wide,
  children,
}: {
  area?: "from" | "to" | "pickup" | "date";
  icon: ReactNode;
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  chevron?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  const classes = ["ck-journey-dd"];
  if (wide) classes.push("ck-journey-dd--wide");
  if (area) classes.push(`ck-journey-dd--${area}`);
  return (
    <div className={classes.join(" ")}>
      <button className="ck-journey-field" type="button" aria-expanded={open} aria-haspopup="listbox" onClick={onToggle}>
        {icon}
        <span>
          <small>{label}</small>
          <strong>{value}</strong>
        </span>
        {chevron ? <ChevronIcon className="ck-chevron" /> : null}
      </button>
      {open ? <div className="ck-dd">{children}</div> : null}
    </div>
  );
}

function CookListing({
  journey,
  stop,
  onChangeStop,
}: {
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  onChangeStop: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CookFilter>("all");
  const [sort, setSort] = useState<CookSort>("default");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!sortRef.current?.contains(event.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const cooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = COOKS.filter((cook) => {
      if (needle && !cook.name.toLowerCase().includes(needle)) return false;
      if (filter === "nonveg") return false;
      if (filter === "snacks") return cook.offer === "snacks";
      if (filter === "meals-snacks") return cook.offer === "meals-snacks";
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((left, right) => left.fromPrice - right.fromPrice);
    if (sort === "price-desc") list = [...list].sort((left, right) => right.fromPrice - left.fromPrice);
    return list;
  }, [filter, query, sort]);

  const sortLabel = sort === "price-asc" ? "Price: low to high" : sort === "price-desc" ? "Price: high to low" : "Sort by";

  return (
    <main className="ck-main">
      <section className="ck-banner">
        <div>
          <div className="ck-banner-info">
            <span className="ck-pin" aria-hidden="true">
              <BannerPinIcon />
            </span>
            <div>
              <p className="ck-banner-title">{stop.title}</p>
              <p className="ck-banner-copy">{stop.detail}</p>
              <p className="ck-banner-meta">
                {formatBannerDate(journey.date)} • {stop.time}
                <button type="button" onClick={onChangeStop}>
                  Change stop
                  <CaretIcon />
                </button>
              </p>
            </div>
          </div>
          <div className="ck-stats">
            <span>
              <PeopleIcon />4 home cooks
            </span>
            <span>
              <StatLeafIcon />8 veg meals
            </span>
            <span>
              <GiftIcon />6 snacks
            </span>
          </div>
        </div>
        <img className="ck-banner-art" src={imgBusStop} alt="" />
      </section>

      <div className="ck-heading-row">
        <div>
          <h1>Choose your home cook</h1>
          <p>Discover home kitchens serving your selected pickup stop.</p>
        </div>
        <p className="ck-count">{cooks.length} cook{cooks.length === 1 ? "" : "s"} available</p>
      </div>

      <div className="ck-toolbar">
        <label className="ck-search">
          <SearchIcon />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search home cooks" />
        </label>
        <div className="ck-chips" role="tablist" aria-label="Cook filters">
          <Chip pressed={filter === "all"} onClick={() => setFilter("all")}>
            All cooks
          </Chip>
          <Chip className="ck-chip--m" pressed={filter === "veg"} onClick={() => setFilter("veg")}>
            Veg
          </Chip>
          <Chip className="ck-chip--m" pressed={filter === "nonveg"} onClick={() => setFilter("nonveg")}>
            Non-Veg
          </Chip>
          <Chip pressed={filter === "meals-snacks"} onClick={() => setFilter("meals-snacks")}>
            Meals & snacks
          </Chip>
          <Chip className="ck-chip--desk" pressed={filter === "snacks"} onClick={() => setFilter("snacks")}>
            Snacks only
          </Chip>
        </div>
        <div className="ck-sort" ref={sortRef}>
          <button type="button" aria-expanded={sortOpen} onClick={() => setSortOpen((open) => !open)}>
            {sortLabel}
            <ChevronIcon />
          </button>
          {sortOpen ? (
            <div className="ck-dd">
              <button
                type="button"
                className={sort === "default" ? "is-on" : undefined}
                onClick={() => {
                  setSort("default");
                  setSortOpen(false);
                }}
              >
                Recommended
              </button>
              <button
                type="button"
                className={sort === "price-asc" ? "is-on" : undefined}
                onClick={() => {
                  setSort("price-asc");
                  setSortOpen(false);
                }}
              >
                Price: low to high
              </button>
              <button
                type="button"
                className={sort === "price-desc" ? "is-on" : undefined}
                onClick={() => {
                  setSort("price-desc");
                  setSortOpen(false);
                }}
              >
                Price: high to low
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {cooks.length === 0 ? (
        <p className="ck-empty">No home cooks match this search.</p>
      ) : (
        <div className="ck-cook-grid">
          {cooks.map((cook) => (
            <CookCard key={cook.id} cook={cook} time={stop.time} />
          ))}
        </div>
      )}

      <ol className="ck-steps">
        <li>
          <StepCookIcon />
          <div>
            <strong>Choose a cook</strong>
            <span>Pick a home cook that suits your taste.</span>
          </div>
        </li>
        <li className="ck-steps-arrow" aria-hidden="true">
          <StepArrowIcon />
        </li>
        <li>
          <StepMenuIcon />
          <div>
            <strong>Explore their menu</strong>
            <span>See their meals and snacks on the next page.</span>
          </div>
        </li>
        <li className="ck-steps-arrow" aria-hidden="true">
          <StepArrowIcon />
        </li>
        <li>
          <StepStopIcon />
          <div>
            <strong>Collect at your stop</strong>
            <span>Pick up your order at {stop.name} bus stand.</span>
          </div>
        </li>
      </ol>
    </main>
  );
}

function CookCard({ cook, time }: { cook: Cook; time: string }) {
  return (
    <article
      className={cook.hasMenu ? "ck-cook-card ck-cook-card--link" : "ck-cook-card"}
      onClick={cook.hasMenu ? () => navigate(PATHS.lakshmiMenu) : undefined}
      onKeyDown={
        cook.hasMenu
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(PATHS.lakshmiMenu);
              }
            }
          : undefined
      }
      role={cook.hasMenu ? "link" : undefined}
      tabIndex={cook.hasMenu ? 0 : undefined}
    >
      <img src={cook.photo} alt="" />
      <div className="ck-cook-copy">
        <h2>{cook.name}</h2>
        <p>{cook.blurb}</p>
        <p className="ck-cook-offer">
          <TiffinIcon />
          {cook.offerLabel}
        </p>
        <div className="ck-cook-meta">
          <span className="ck-cook-price">
            <small>From</small>
            <strong>{formatRupees(cook.fromPrice)}</strong>
          </span>
          <span className="ck-cook-avail">
            <ClockIcon />
            <span>
              Available for
              <b>{time} pickup</b>
            </span>
          </span>
          {cook.hasMenu ? (
            <button
              className="ck-view-menu"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(PATHS.lakshmiMenu);
              }}
            >
              View menu
              <ViewMenuArrow />
            </button>
          ) : (
            <button className="ck-view-menu" type="button" disabled>
              View menu
              <ViewMenuArrow />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function LakshmiMenu({
  bag,
  addMeal,
  setQty,
  journey,
  stop,
  onContinue,
}: {
  bag: BagLine[];
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  onContinue: () => void;
}) {
  const [tab, setTab] = useState<MenuTab>("all");
  const [query, setQuery] = useState("");

  const meals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return LAKSHMI_MEALS.filter((meal) => {
      if (tab !== "all" && meal.category !== tab) return false;
      if (needle && !`${meal.name} ${meal.description} ${meal.pack ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [query, tab]);

  const favourites = meals.filter((meal) => meal.category !== "snacks");
  const snacks = meals.filter((meal) => meal.category === "snacks");
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const bagCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const allCount = LAKSHMI_MEALS.length;
  const mealCount = LAKSHMI_MEALS.filter((meal) => meal.category === "meals").length;
  const snackCount = LAKSHMI_MEALS.filter((meal) => meal.category === "snacks").length;
  const editDate = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;

  return (
    <main className="ck-main ck-main--menu">
      <div className="ck-crumbs">
        <button type="button" onClick={() => navigate(PATHS.cooks)}>
          Home
        </button>
        <span>/</span>
        <button type="button" onClick={() => navigate(PATHS.cooks)}>
          Home cooks
        </button>
        <span>/</span>
        <strong>Lakshmi’s Kitchen</strong>
        <button className="ck-back" type="button" onClick={() => navigate(PATHS.cooks)}>
          Back to cooks
        </button>
      </div>

      <section className="ck-kitchen-head">
        <img src={cookLakshmiMenu} alt="" />
        <div>
          <h1>
            Lakshmi’s Kitchen
            <em>
              <LeafIcon />
              Vegetarian
            </em>
          </h1>
          <p>Everyday South Indian comfort food, made at home.</p>
          <p className="ck-m-offer">
            <TiffinIcon />
            Meals & homemade snacks
          </p>
          <p className="ck-rating">
            <StarIcon />
            <span className="ck-rating-desk">4.8 · 126 reviews</span>
            <span className="ck-rating-m">4.8 ( 120+ )</span>
          </p>
          <p className="ck-from">
            <TiffinIcon />
            <span>
              Meals from
              <strong>{formatRupees(60)}</strong>
            </span>
          </p>
        </div>
        <aside className="ck-pickup-card">
          <p>
            <span className="ck-head-ico">
              <img src={a.imgMapPointStreamlineSolar} alt="" />
            </span>
            <span>
              <small>Pickup at</small>
              <strong>{stop.name} bus stand</strong>
              Collect near the main entrance.
            </span>
          </p>
          <p>
            <span className="ck-head-ico">
              <img src={a.imgColorfulCalendarIconWithCheckmark1} alt="" />
            </span>
            <span>
              {formatBannerDate(journey.date)} • {stop.time}
            </span>
          </p>
        </aside>
      </section>

      <div className="ck-m-pickup">
        <div className="ck-m-pickup-stop">
          <span className="ck-m-pickup-pin" aria-hidden="true">
            <img src={a.imgMapPointStreamlineSolar} alt="" />
          </span>
          <span>
            <strong>Pickup at {stop.name.toLowerCase()}</strong>
            <small>{stop.name} bus stand</small>
          </span>
        </div>
        <span className="ck-m-pickup-rule" aria-hidden="true" />
        <div className="ck-m-pickup-time">
          <BarClockIcon />
          <span>
            <strong>Today,{editDate}</strong>
            <small>{stop.time} pickup</small>
          </span>
        </div>
        <button className="ck-m-pickup-edit" type="button" aria-label="Edit journey" onClick={() => navigate(PATHS.editJourney)}>
          <PencilIcon />
        </button>
      </div>

      <div className="ck-note">
        <span>
          <LeafIcon />
          Meals shown are available for your selected pickup time.
        </span>
        <span>
          <LeafIcon />
          Vegetarian kitchen
        </span>
      </div>

      <div className="ck-menu-layout">
        <div>
          <div className="ck-menu-tools">
            <label className="ck-search">
              <SearchIcon />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this kitchen’s menu" />
            </label>
            <div className="ck-tabs">
              <Chip className="ck-chip--desk" pressed={tab === "all"} onClick={() => setTab("all")}>
                All
              </Chip>
              <Chip className="ck-chip--m" pressed={tab === "all"} onClick={() => setTab("all")}>
                {`All items ( ${allCount} )`}
              </Chip>
              <Chip className="ck-chip--desk" pressed={tab === "meals"} onClick={() => setTab("meals")}>
                Meals
              </Chip>
              <Chip className="ck-chip--m" pressed={tab === "meals"} onClick={() => setTab("meals")}>
                {`Meals ( ${mealCount} )`}
              </Chip>
              <Chip className="ck-chip--desk" pressed={tab === "breakfast"} onClick={() => setTab("breakfast")}>
                Breakfast
              </Chip>
              <Chip className="ck-chip--desk" pressed={tab === "snacks"} onClick={() => setTab("snacks")}>
                Homemade snacks
              </Chip>
              <Chip className="ck-chip--m" pressed={tab === "snacks"} onClick={() => setTab("snacks")}>
                {`Snacks ( ${snackCount} )`}
              </Chip>
            </div>
          </div>

          {favourites.length ? (
            <section className="ck-menu-section">
              <h2>
                <span className="ck-sec-desk">Home-cooked favourites</span>
                <span className="ck-sec-m">Meals</span>
              </h2>
              <p className="ck-sec-desk">Freshly prepared for your journey.</p>
              <div className="ck-meal-grid">
                {favourites.map((meal) => (
                  <MealCard key={meal.id} meal={meal} qty={bag.find((line) => line.meal.id === meal.id)?.qty ?? 0} onAdd={() => addMeal(meal)} onQty={(qty) => setQty(meal.id, qty)} />
                ))}
              </div>
            </section>
          ) : null}

          {snacks.length ? (
            <section className="ck-menu-section ck-snacks-m">
              <h2>
                <span className="ck-sec-m">Snacks</span>
              </h2>
              <div className="ck-snack-grid">
                {snacks.map((meal) => (
                  <SnackCard key={meal.id} meal={meal} qty={bag.find((line) => line.meal.id === meal.id)?.qty ?? 0} onAdd={() => addMeal(meal)} onQty={(qty) => setQty(meal.id, qty)} />
                ))}
              </div>
            </section>
          ) : null}

          {meals.length === 0 ? <p className="ck-empty">No dishes match this search.</p> : null}
        </div>

        <div className="ck-bag-col">
          <aside className="ck-bag">
            <h2>
              <BagIcon />
              Your meal bag
            </h2>
            <p>From Lakshmi’s Kitchen</p>
            {bag.length === 0 ? (
              <p className="ck-empty">Your bag is empty.</p>
            ) : (
              <ul>
                {bag.map((line) => (
                  <li key={line.meal.id}>
                    <img src={line.meal.photo} alt="" />
                    <div>
                      <strong>{line.meal.name}</strong>
                      {line.meal.pack ? <em>{line.meal.pack}</em> : null}
                      <span>{formatRupees(line.meal.price)}</span>
                    </div>
                    <Stepper name={line.meal.name} qty={line.qty} onQty={(qty) => setQty(line.meal.id, qty)} />
                  </li>
                ))}
              </ul>
            )}
            <p className="ck-subtotal">
              <span>Subtotal</span>
              <strong>{formatRupees(subtotal)}</strong>
            </p>
            <p className="ck-bag-hint">Taxes and pickup charges at checkout.</p>
            <button className="ck-continue" type="button" disabled={bag.length === 0} onClick={onContinue}>
              Continue
              <ArrowIcon />
            </button>
            <p className="ck-bag-stop">
              <BannerPinIcon />
              <span>
                <strong>Pickup at {stop.name}</strong>
                {formatBannerDate(journey.date)} • {stop.time}
              </span>
            </p>
            <button className="ck-help" type="button">
              <HelpIcon />
              Need pickup help?
            </button>
          </aside>
          <p className="ck-bag-one">
            <StoreIcon />
            <span>
              <strong>One kitchen, one order</strong>
              Your selected items are prepared by Lakshmi’s Kitchen.
            </span>
          </p>
          <section className="ck-bag-snacks">
            <h2>Homemade snacks</h2>
            <div className="ck-bag-snacks-list">
              {LAKSHMI_MEALS.filter((meal) => meal.category === "snacks").map((meal) => (
                <SnackSideRow
                  key={meal.id}
                  meal={meal}
                  qty={bag.find((line) => line.meal.id === meal.id)?.qty ?? 0}
                  onAdd={() => addMeal(meal)}
                  onQty={(qty) => setQty(meal.id, qty)}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <p className="ck-collect">
        <BannerPinIcon />
        <span className="ck-collect-rule" aria-hidden="true" />
        <span>
          <strong>Collect near the main entrance, {stop.name} bus stand.</strong>
          Check your order for pickup updates.
        </span>
      </p>

      <div className="ck-m-cartbar">
        <div className="ck-m-cartbar-info">
          <span className="ck-m-cartbar-ico" aria-hidden="true">
            <CartIcon />
            {bagCount > 0 ? <em>{bagCount}</em> : null}
          </span>
          <span>
            <small>{bagCount} items</small>
            <strong>{formatRupees(subtotal)}</strong>
          </span>
        </div>
        <button className="ck-m-cartbar-go" type="button" disabled={bag.length === 0} aria-label="Continue" onClick={onContinue}>
          <ArrowIcon />
        </button>
      </div>
    </main>
  );
}

function MealBagPage({
  bag,
  addMeal,
  setQty,
  journey,
  stop,
  kitchenNote,
  setKitchenNote,
  onContinue,
}: {
  bag: BagLine[];
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  kitchenNote: string;
  setKitchenNote: (note: string) => void;
  onContinue: () => void;
}) {
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const suggestedSnack = LAKSHMI_MEALS.find((meal) => meal.id === "murukku") ?? LAKSHMI_MEALS[0];
  const journeyDate = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;

  return (
    <main className="ck-main ck-main--meal-bag">
      <div className="ck-crumbs ck-meal-bag-crumbs">
        <button type="button" onClick={() => navigate(PATHS.cooks)}>Home</button>
        <span>/</span>
        <button type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>Menu</button>
        <span>/</span>
        <strong>Meal bag</strong>
        <button className="ck-back" type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>
          <BackChevronIcon />
          Back to menu
        </button>
      </div>

      <div className="ck-meal-bag-heading">
        <div>
          <h1>Your meal bag</h1>
          <p>A little home, packed for your journey.</p>
        </div>
        <ol className="ck-meal-bag-progress" aria-label="Checkout progress">
          <li className="is-current"><span>1</span><strong>Bag</strong></li>
          <li><span>2</span><strong>Review</strong></li>
          <li><span>3</span><strong>Pickup</strong></li>
          <li><span>4</span><strong>Payment</strong></li>
        </ol>
      </div>

      <div className="ck-meal-bag-layout">
        <div className="ck-meal-bag-main">
          <section className="ck-meal-bag-items" aria-label="Items in your meal bag">
            <div className="ck-meal-bag-kitchen">
              <img src={cookLakshmiMenu} alt="" />
              <div>
                <small>From</small>
                <h2>
                  Lakshmi’s Kitchen
                  <span><LeafIcon /> Vegetarian</span>
                </h2>
                <p>Everyday South Indian comfort food, made at home.</p>
              </div>
            </div>

            {bag.length ? (
              <ul className="ck-meal-bag-list">
                {bag.map(({ meal, qty }) => (
                  <li key={meal.id} className="ck-meal-bag-item">
                    <img src={meal.photo} alt="" />
                    <div className="ck-meal-bag-item-copy">
                      <strong>{meal.name}</strong>
                      <p>{meal.description}</p>
                      <small>{meal.pack ?? `${qty} ${qty === 1 ? "serving" : "servings"}`}</small>
                      <b>{formatRupees(meal.price)}</b>
                    </div>
                    <div className="ck-meal-bag-item-actions">
                      <Stepper name={meal.name} qty={qty} onQty={(nextQty) => setQty(meal.id, nextQty)} />
                      <button type="button" onClick={() => setQty(meal.id, 0)}>
                        <TrashIcon />
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ck-meal-bag-empty">Your meal bag is empty. Add something from Lakshmi’s Kitchen.</p>
            )}

            <button className="ck-meal-bag-add-more" type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>
              <span>+</span>
              Add more from this kitchen
            </button>
            <p className="ck-meal-bag-prepared">
              <StoreIcon />
              <span>Items in this bag are prepared by Lakshmi’s Kitchen.</span>
            </p>
          </section>

          <section className="ck-meal-bag-note">
            <div><NoteIcon /><strong>Note for the kitchen (optional)</strong></div>
            <textarea
              aria-label="Note for the kitchen"
              placeholder="Any preparation requests?"
              value={kitchenNote}
              onChange={(event) => setKitchenNote(event.target.value)}
            />
            <small>Requests depend on what the cook can accommodate.</small>
          </section>
        </div>

        <aside className="ck-meal-bag-side">
          <section className="ck-meal-bag-summary">
            <h2><BagIcon /> Order summary</h2>
            <ul>
              {bag.map(({ meal, qty }) => (
                <li key={meal.id}>
                  <img src={meal.photo} alt="" />
                  <span>
                    <strong>{meal.name}</strong>
                    <small>{meal.pack ?? `${qty} ${qty === 1 ? "serving" : "servings"}`}</small>
                  </span>
                  <b>{formatRupees(meal.price * qty)}</b>
                </li>
              ))}
            </ul>
            <p className="ck-meal-bag-subtotal"><strong>Subtotal</strong><b>{formatRupees(subtotal)}</b></p>
            <p className="ck-meal-bag-tax-note">
              <span className="ck-meal-bag-tax-note-desktop">Final taxes and pickup charges shown on pickup confirmation.</span>
              <span className="ck-meal-bag-tax-note-mobile">Final taxes and pickup charges shown on the review page.</span>
            </p>
            <button
              className="ck-meal-bag-review"
              type="button"
              disabled={bag.length === 0}
              onClick={onContinue}
            >
              <span className="ck-meal-bag-review-desktop">Continue</span>
              <span className="ck-meal-bag-review-mobile">Review order</span>
              <ArrowIcon />
            </button>
            <div className="ck-meal-bag-pickup">
              <BannerPinIcon />
              <p>
                Pickup at <strong>{stop.name} bus stand</strong>
                <span>{journeyDate} · {stop.time}</span>
                <small>Collect near main entrance.</small>
              </p>
            </div>
            <button className="ck-meal-bag-help" type="button"><HelpIcon />Need pickup help?</button>
          </section>

          <section className="ck-meal-bag-suggestion">
            <h2><GiftIcon /> <span>Something for later?<small>Popular homemade snacks from this kitchen.</small></span></h2>
            <div>
              <img src={suggestedSnack.photo} alt="" />
              <span>
                <strong>{suggestedSnack.name}</strong>
                <small>{suggestedSnack.pack}</small>
                <b>{formatRupees(suggestedSnack.price)}</b>
              </span>
              {bag.some((line) => line.meal.id === suggestedSnack.id) ? (
                <Stepper
                  name={suggestedSnack.name}
                  qty={bag.find((line) => line.meal.id === suggestedSnack.id)?.qty ?? 0}
                  onQty={(qty) => setQty(suggestedSnack.id, qty)}
                />
              ) : (
                <AddButton onClick={() => addMeal(suggestedSnack)} />
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function CheckoutProgress({ step }: { step: 2 | 3 | 4 }) {
  const steps = ["Bag", "Review", "Pickup", "Payment"];
  return (
    <ol className="ck-checkout-progress" aria-label="Checkout progress">
      {steps.map((label, index) => {
        const number = index + 1;
        const complete = number < step;
        const current = number === step;
        return (
          <li key={label} className={complete ? "is-complete" : current ? "is-current" : undefined}>
            <span>{complete ? "✓" : number}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

function CheckoutBreadcrumbs({ current, backTo, backLabel }: { current: string; backTo: string; backLabel: string }) {
  return (
    <div className="ck-crumbs ck-checkout-crumbs">
      <button type="button" onClick={() => navigate(PATHS.cooks)}>Home</button>
      <span>/</span>
      <button type="button" onClick={() => navigate(PATHS.cooks)}>Home cooks</button>
      <span>/</span>
      <button type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>Lakshmi’s Kitchen</button>
      <span>/</span>
      <strong>{current}</strong>
      <button className="ck-back" type="button" onClick={() => navigate(backTo)}>
        <BackChevronIcon />
        {backLabel}
      </button>
    </div>
  );
}

function CheckoutMealRows({ bag }: { bag: BagLine[] }) {
  return (
    <ul className="ck-checkout-meals">
      {bag.map(({ meal, qty }) => (
        <li key={meal.id}>
          <img src={meal.photo} alt="" />
          <span>
            <strong>{meal.name}</strong>
            <small>{meal.description}</small>
            <small>{meal.pack ?? `${qty} ${qty === 1 ? "serving" : "servings"}`}</small>
          </span>
          <b>× {qty}</b>
          <strong>{formatRupees(meal.price * qty)}</strong>
        </li>
      ))}
    </ul>
  );
}

function CheckoutTotals({ subtotal }: { subtotal: number }) {
  return (
    <div className="ck-checkout-totals">
      <p><span>Items subtotal</span><strong>{formatRupees(subtotal)}</strong></p>
      <p><span>Pickup service <HelpIcon /></span><strong>{formatRupees(15)}</strong></p>
      <p><span>Taxes</span><strong>{formatRupees(8)}</strong></p>
      <p className="ck-checkout-total"><span>Total</span><strong>{formatRupees(subtotal + 23)}</strong></p>
    </div>
  );
}

function ReviewOrderPage({
  bag,
  journey,
  stop,
  kitchenNote,
  onContinue,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  kitchenNote: string;
  onContinue: () => void;
}) {
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const date = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;

  return (
    <main className="ck-main ck-checkout-main">
      <CheckoutBreadcrumbs current="Review your order" backTo={PATHS.mealBag} backLabel="Back to meal bag" />
      <div className="ck-checkout-progress-row"><CheckoutProgress step={2} /></div>
      <div className="ck-checkout-layout">
        <div className="ck-checkout-primary">
          <section className="ck-review-items">
            <div className="ck-checkout-kitchen">
              <img src={cookLakshmiMenu} alt="" />
              <div>
                <h1>From Lakshmi’s Kitchen <span><LeafIcon /> Vegetarian</span></h1>
                <p>Everyday South Indian comfort food, made at home.</p>
                <p className="ck-checkout-rating"><StarIcon /> <strong>4.8</strong> · 126 reviews</p>
              </div>
              <button type="button" onClick={() => navigate(PATHS.mealBag)}><PencilIcon /> Edit items</button>
            </div>
            <CheckoutMealRows bag={bag} />
          </section>

          <section className="ck-selected-pickup">
            <h2><BannerPinIcon /> Your selected pickup</h2>
            <div className="ck-selected-pickup-details">
              <p><PinIcon /><span><strong>{stop.name} bus stand</strong><small>Collect near the main entrance.</small></span></p>
              <p><CalendarIcon /><span><small>Date of journey</small><strong>{date}</strong></span></p>
              <p><ClockIcon /><span><small>Arrival time</small><strong>{stop.time}</strong></span></p>
            </div>
            <p className="ck-selected-pickup-hint"><HelpIcon /> You’ll confirm your contact details in the next step.</p>
          </section>

          <section className="ck-review-note">
            <NoteIcon />
            <span><strong>Note for the kitchen</strong><small>{kitchenNote.trim() || "No special requests added."}</small></span>
            <button type="button" onClick={() => navigate(PATHS.mealBag)}><PencilIcon /> Edit note</button>
          </section>
        </div>

        <aside className="ck-checkout-sidebar">
          <section className="ck-bill-details">
            <h2>Bill details</h2>
            <CheckoutTotals subtotal={subtotal} />
            <small className="ck-bill-caption">Sample charges shown for this design.</small>
            <button className="ck-checkout-primary-button" type="button" disabled={bag.length === 0} onClick={onContinue}>
              Confirm pickup details <ArrowIcon />
            </button>
            <p className="ck-bill-after">Payment comes after pickup confirmation.</p>
            <div className="ck-bus-hint"><BusIcon /><span><strong>Check your bus already stops at this pickup point.</strong><small>Aahaa does not arrange bus stops.</small></span></div>
            <button className="ck-checkout-help" type="button"><HelpIcon />Help &amp; support</button>
          </section>
        </aside>
      </div>
    </main>
  );
}

function ConfirmPickupPage({
  bag,
  journey,
  setJourney,
  stop,
  pickupName,
  setPickupName,
  pickupPhone,
  setPickupPhone,
  collectionPoint,
  setCollectionPoint,
  pickupNote,
  setPickupNote,
  pickupConfirmed,
  setPickupConfirmed,
  backTo,
  onContinue,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  setJourney: Dispatch<SetStateAction<JourneyChoice>>;
  stop: ReturnType<typeof pickupMeta>;
  pickupName: string;
  setPickupName: (name: string) => void;
  pickupPhone: string;
  setPickupPhone: (phone: string) => void;
  collectionPoint: string;
  setCollectionPoint: (point: string) => void;
  pickupNote: string;
  setPickupNote: (note: string) => void;
  pickupConfirmed: boolean;
  setPickupConfirmed: (confirmed: boolean) => void;
  backTo: string;
  onContinue: () => void;
}) {
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const dateValue = `${journey.date.getFullYear()}-${String(journey.date.getMonth() + 1).padStart(2, "0")}-${String(journey.date.getDate()).padStart(2, "0")}`;

  return (
    <main className="ck-main ck-checkout-main">
      <CheckoutBreadcrumbs current="Confirm pickup details" backTo={backTo} backLabel={backTo === PATHS.mealBag ? "Back to meal bag" : "Back to review order"} />
      <div className="ck-checkout-title-row">
        <div><h1>Confirm your pickup details</h1><p>Help us get your meal to the right person, at the right stop.</p></div>
        <CheckoutProgress step={3} />
      </div>
      <div className="ck-checkout-layout ck-pickup-layout">
        <div className="ck-checkout-primary">
          <section className="ck-collecting-card">
            <div className="ck-pickup-section-icon"><ProfileIcon /></div>
            <div className="ck-pickup-section-content">
              <h2>Who’s collecting?</h2>
              <div className="ck-collecting-fields">
                <label>Full name<input value={pickupName} onChange={(event) => setPickupName(event.target.value)} /></label>
                <label>Mobile number<div className="ck-phone-field"><input type="tel" value={pickupPhone} onChange={(event) => setPickupPhone(event.target.value)} /><span><LockIcon /> Verified</span></div><small>Your delivery partner will contact this number.</small></label>
              </div>
            </div>
          </section>

          <section className="ck-pickup-where">
            <div className="ck-pickup-section-icon"><BannerPinIcon /></div>
            <div className="ck-pickup-section-content">
              <div className="ck-pickup-where-grid">
                <div>
                  <h2>Where and when?</h2>
                  <p>Your selected pickup stop and time.</p>
                  <label>Pickup stop
                    <select value={journey.pickup} onChange={(event) => setJourney((current) => ({ ...current, pickup: event.target.value }))}>
                      {PICKUP_STOPS.map((pickup) => <option key={pickup.name} value={pickup.name}>{pickup.name} bus stand</option>)}
                    </select>
                  </label>
                  <label>Collection point<input value={collectionPoint} onChange={(event) => setCollectionPoint(event.target.value)} /></label>
                  <div className="ck-pickup-date-time">
                    <label>Date of journey<input type="date" value={dateValue} onChange={(event) => {
                      const [year, month, day] = event.target.value.split("-").map(Number);
                      if (year && month && day) setJourney((current) => ({ ...current, date: new Date(year, month - 1, day) }));
                    }} /></label>
                    <label>Expected arrival time<select value={stop.time}><option>{stop.time}</option></select></label>
                  </div>
                  <p className="ck-pickup-point-hint"><LeafIcon /> Choose a pickup point where your bus already stops.</p>
                </div>
                <img className="ck-pickup-illustration" src={imgBusStop} alt="" />
              </div>
            </div>
          </section>

          <section className="ck-pickup-note-card">
            <div className="ck-pickup-section-icon"><NoteIcon /></div>
            <div className="ck-pickup-section-content">
              <h2>Pickup note (optional)</h2>
              <textarea value={pickupNote} onChange={(event) => setPickupNote(event.target.value)} placeholder="Add a landmark or a detail to help us find you." />
              <small><HelpIcon /> Avoid sharing sensitive information.</small>
            </div>
          </section>
          <label className="ck-pickup-confirm"><input type="checkbox" checked={pickupConfirmed} onChange={(event) => setPickupConfirmed(event.target.checked)} /> I’ve confirmed that my bus stops at this pickup point.</label>
        </div>

        <aside className="ck-checkout-sidebar">
          <section className="ck-pickup-summary">
            <h2><BagIcon /> <span>Order summary<small>From Lakshmi’s Kitchen</small></span></h2>
            <CheckoutMealRows bag={bag} />
            <CheckoutTotals subtotal={subtotal} />
            <button className="ck-checkout-primary-button" type="button" disabled={bag.length === 0} onClick={onContinue}>
              Continue to payment <ArrowIcon />
            </button>
            <p className="ck-bill-after">Review these details before continuing.</p>
          </section>
          <section className="ck-pickup-bus-hint"><BusIcon /><span><strong>Bus running late?</strong><small>You can report a delay from your order page.</small><button className="ck-checkout-help" type="button"><HelpIcon />Help &amp; support</button></span></section>
        </aside>
      </div>
    </main>
  );
}

function PaymentMethodPage({
  bag,
  paymentMethod,
  setPaymentMethod,
  upiId,
  setUpiId,
  backTo,
  onPay,
}: {
  bag: BagLine[];
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  upiId: string;
  setUpiId: (upiId: string) => void;
  backTo: string;
  onPay: () => void;
}) {
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const methods: { id: PaymentMethod; name: string; detail: string; logo: string }[] = [
    { id: "google-pay", name: "Google Pay", detail: "Pay using GPay", logo: "G" },
    { id: "phonepe", name: "PhonePe", detail: "Pay using PhonePe", logo: "पे" },
    { id: "paytm", name: "paytm", detail: "Pay using Paytm", logo: "paytm" },
    { id: "other-upi", name: "Other UPI apps", detail: "Pay using any other UPI app", logo: "UPI" },
  ];

  return (
    <main className="ck-main ck-checkout-main ck-payment-main">
      <MobilePaymentView
        bag={bag}
        methods={methods}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        onPay={onPay}
      />
      <CheckoutBreadcrumbs
        current="Payment"
        backTo={backTo}
        backLabel={backTo === PATHS.cart ? "Back to cart" : "Back to pickup details"}
      />
      <div className="ck-checkout-title-row ck-payment-title-row">
        <div><h1>Choose payment method</h1><p>Pay securely to confirm your homely meal.</p></div>
        <CheckoutProgress step={4} />
      </div>
      <div className="ck-checkout-layout ck-payment-layout">
        <section className="ck-payment-options">
          <div className="ck-payment-section-title">
            <span><ShieldIcon /></span>
            <h2>UPI</h2>
            <small><LockIcon /> Secure payment</small>
          </div>
          <div className="ck-payment-method-list" role="radiogroup" aria-label="UPI payment method">
            {methods.map((method) => (
              <button
                key={method.id}
                className={`ck-payment-method${paymentMethod === method.id ? " is-selected" : ""}`}
                type="button"
                role="radio"
                aria-checked={paymentMethod === method.id}
                onClick={() => setPaymentMethod(method.id)}
              >
                <span className="ck-payment-radio" />
                <span className={`ck-payment-logo ck-payment-logo--${method.id}`}>{method.logo}</span>
                <span className="ck-payment-method-copy"><strong>{method.name}</strong><small>{method.detail}</small></span>
              </button>
            ))}
          </div>
          <section className="ck-payment-any-upi">
            <h3><span><StepArrowIcon /></span>Pay by any UPI app</h3>
            <div className="ck-payment-upi-input">
              <input value={upiId} onChange={(event) => setUpiId(event.target.value)} placeholder="Enter UPI ID (e.g. name@okaxis)" aria-label="UPI ID" />
              <button type="button">Verify</button>
            </div>
            <button type="button" className="ck-payment-scan">
              <span className="ck-payment-qr" aria-hidden="true"><QrIcon /></span>
              <span><strong>Scan QR code</strong><small>Scan with any UPI app</small></span>
              <span className="ck-payment-chevron">›</span>
            </button>
          </section>
          <p className="ck-payment-secure"><LockIcon /><span><strong>100% secure payments.</strong> Your UPI PIN is never shared with Aahaa.</span></p>
        </section>

        <aside className="ck-checkout-sidebar ck-payment-sidebar">
          <section className="ck-pickup-summary ck-payment-summary">
            <h2><BagIcon /><span>Order summary<small>From Lakshmi’s Kitchen</small></span></h2>
            <CheckoutMealRows bag={bag} />
            <CheckoutTotals subtotal={subtotal} />
            <button className="ck-checkout-primary-button" type="button" disabled={bag.length === 0} onClick={onPay}>
              Pay {formatRupees(subtotal + 23)} <ArrowIcon />
            </button>
            <p className="ck-bill-after">You’ll be redirected to your UPI app to complete payment.</p>
          </section>
          <section className="ck-payment-help">
            <span><HeadsetIcon /></span>
            <div><strong>Need help with payment?</strong><small>Our support team is here to help you with any payment issues.</small><button className="ck-checkout-help" type="button"><HelpIcon />Help &amp; support</button></div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function MobilePaymentView({
  bag,
  methods,
  paymentMethod,
  setPaymentMethod,
  onPay,
}: {
  bag: BagLine[];
  methods: { id: PaymentMethod; name: string; detail: string; logo: string }[];
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  onPay: () => void;
}) {
  const [paymentType, setPaymentType] = useState<"upi" | "card" | "net-banking">("upi");
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const itemCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const selectedMethod = methods.find((method) => method.id === paymentMethod);

  return (
    <div className="ck-mobile-payment">
      <div className="ck-mobile-payment-heading">
        <h1>Payment</h1>
        <p>Choose a payment method to complete your order</p>
      </div>
      <section className="ck-mobile-payment-order" aria-label="Order summary">
        <img src={paymentKitchen} alt="" />
        <div className="ck-mobile-payment-order-copy">
          <strong>From Lakshmi’s Kitchen</strong>
          <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
          <small>{itemCount} items - {bag.map(({ meal }) => meal.name).join(", ")}</small>
        </div>
        <strong className="ck-mobile-payment-price">{formatCartAmountForCheckout(subtotal + 55.3)}</strong>
      </section>

      <section className="ck-mobile-payment-section">
        <h2>UPI</h2>
        <p>Pay quickly using any UPI app</p>
        <div className="ck-mobile-payment-options">
          {methods.filter((method) => method.id !== "other-upi").map((method) => (
            <button
              key={method.id}
              className={`ck-mobile-payment-upi${paymentType === "upi" && paymentMethod === method.id ? " is-selected" : ""}`}
              type="button"
              aria-pressed={paymentType === "upi" && paymentMethod === method.id}
              onClick={() => {
                setPaymentType("upi");
                setPaymentMethod(method.id);
              }}
            >
              <span className={`ck-payment-logo ck-payment-logo--${method.id}`}>
                <PaymentMethodLogo id={method.id} fallback={method.logo} />
              </span>
              <strong>{method.name}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="ck-mobile-payment-section">
        <h2>Cards</h2>
        <p>Pay using your credit or debit cards</p>
        <button
          className={`ck-mobile-payment-choice${paymentType === "card" ? " is-selected" : ""}`}
          type="button"
          aria-pressed={paymentType === "card"}
          onClick={() => setPaymentType("card")}
        >
          <span className="ck-mobile-payment-choice-icon"><CreditCardIcon /></span>
          <span><strong>Add credit or debit card</strong><small>Visa, Mastercard, RuPay and more</small></span>
          <PaymentChevronIcon />
        </button>
      </section>

      <section className="ck-mobile-payment-section">
        <h2>Net Banking</h2>
        <p>Pay using your wallet balance</p>
        <button
          className={`ck-mobile-payment-choice${paymentType === "net-banking" ? " is-selected" : ""}`}
          type="button"
          aria-pressed={paymentType === "net-banking"}
          onClick={() => setPaymentType("net-banking")}
        >
          <span className="ck-mobile-payment-choice-icon"><BankOutlineIcon /></span>
          <span><strong>Net Banking</strong><small>All major banks</small></span>
          <PaymentChevronIcon />
        </button>
      </section>

      <footer className="ck-mobile-payment-footer">
        <div>
          <strong>{formatRupees(subtotal)}</strong>
          <span>{itemCount} items</span>
          <small>
            <span className={`ck-payment-logo ck-payment-logo--${selectedMethod?.id ?? "google-pay"}`}>
              <PaymentMethodLogo id={selectedMethod?.id ?? "google-pay"} fallback={selectedMethod?.logo ?? "G"} />
            </span>
            {paymentType === "upi" ? selectedMethod?.name ?? "Google Pay" : paymentType === "card" ? "Cards" : "Net Banking"}
          </small>
        </div>
        <button type="button" onClick={onPay}>Proceed to pay <ArrowIcon /></button>
      </footer>
    </div>
  );
}

function PaymentMethodLogo({ id, fallback }: { id: PaymentMethod; fallback: string }) {
  const source = id === "google-pay"
    ? paymentGooglePayLogo
    : id === "phonepe"
      ? paymentPhonePeLogo
      : id === "paytm"
        ? paymentPaytmLogo
        : null;

  return source ? <img src={source} alt="" /> : fallback;
}

function MobileStatusBar() {
  return (
    <div className="ck-mobile-status-bar" aria-hidden="true">
      <span>9:41</span>
      <span className="ck-mobile-status-icons">
        <svg viewBox="0 0 18 12"><path d="M1 11V8.5h2V11zm4 0V6h2v5zm4 0V3.5h2V11zm4 0V1h2v10z" /></svg>
        <svg viewBox="0 0 16 12"><path d="M1 4.5a10 10 0 0 1 14 0L8 11z" /></svg>
        <svg viewBox="0 0 25 13"><rect x=".5" y="1" width="21" height="11" rx="2" /><path d="M23 4v5" /><rect x="2.5" y="3" width="16" height="7" rx="1" /></svg>
      </span>
    </div>
  );
}

function MobilePaymentStatusPage({
  bag,
  journey,
  stop,
  onComplete,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  onComplete: () => void;
}) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3500);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const itemCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const total = subtotal + 55.3;
  const date = journey.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <main className="ck-mobile-payment-status" aria-label="Payment status">
      <header className="ck-mobile-payment-status-header">
        <button type="button" aria-label="Back to payment methods" onClick={() => navigate(PATHS.paymentMethod)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <h1>Payment Status</h1>

      <section className="ck-payment-status-receipt" aria-label="Order receipt">
        <div className="ck-payment-status-printer" />
        <article className="ck-payment-status-paper">
          <header className="ck-payment-status-paper-header">
            <strong>aahaa<span>⌣</span></strong>
            <span>Trip Food Order<small>#AAH20261018-001</small><small>{date}, 01:02 PM</small></span>
          </header>

          <section className="ck-payment-status-kitchen">
            <img src={imgKitchenLakshmi} alt="" />
            <span>
              <strong>Lakshmi’s Kitchen</strong>
              <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
              <small>Everyday South Indian comfort food</small>
            </span>
          </section>

          <div className="ck-payment-status-pickup">
            <span><PinIcon /><small>Pickup point</small><strong>{stop.name} Bus Stand</strong></span>
            <span><ClockIcon /><small>Pickup time</small><strong>{stop.time}</strong></span>
          </div>

          <div className="ck-payment-status-table">
            <div className="ck-payment-status-table-head"><span>Item</span><span>Qty</span><span>Amount</span></div>
            {bag.map(({ meal, qty }) => (
              <div className="ck-payment-status-item" key={meal.id}>
                <img src={meal.photo} alt="" />
                <span><strong>{meal.name}</strong><small>{meal.description}</small></span>
                <span>{qty}</span>
                <strong>{formatRupees(meal.price * qty)}</strong>
              </div>
            ))}
          </div>

          <div className="ck-payment-status-totals">
            <p><span>Items total ({itemCount} items)</span><strong>{formatRupees(subtotal)}</strong></p>
            <p><span>Delivery fee</span><strong>{formatRupees(30)}</strong></p>
            <p><span>GST &amp; other charges</span><strong>{formatCartAmountForCheckout(25.3)}</strong></p>
            <p className="ck-payment-status-paid"><strong>Total paid</strong><strong>{formatCartAmountForCheckout(total)}</strong></p>
          </div>
        </article>
      </section>

      <section className="ck-payment-status-progress" aria-live="polite">
        <h2>Payment Status</h2>
        <ol>
          <li className="is-complete"><span><CheckIcon /></span><strong>Payment<br />received</strong><small>01:02 PM</small></li>
          <li className="is-complete"><span><CheckIcon /></span><strong>Order<br />confirmed</strong><small>01:02 PM</small></li>
          <li className="is-current"><span>↻</span><strong>Generating<br />your bill...</strong></li>
          <li><span><NoteIcon /></span><strong>Bill<br />ready</strong></li>
        </ol>
        <p>Please keep this screen open while we prepare your invoice</p>
      </section>
    </main>
  );
}

function PreparingInvoicePage({ bag, onComplete }: { bag: BagLine[]; onComplete: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 3500);
    return () => window.clearTimeout(timer);
  }, [onComplete]);

  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const total = subtotal + 23;

  return (
    <main className="ck-main ck-invoice-main">
      <header className="ck-invoice-heading">
        <h1>Preparing your invoice</h1>
        <p>Your payment is successful. Please wait while we generate your bill.</p>
      </header>
      <section className="ck-invoice-card" aria-live="polite">
        <div className="ck-invoice-printer">
          <div className="ck-printer-slot" />
          <article className="ck-invoice-paper">
            <strong className="ck-invoice-logo">aahaa</strong>
            <b>Aahaa Order Invoice</b>
            <small>Your food, fresh and on time</small>
            <p><span>Order ID</span><strong>#AHA-728361</strong></p>
            <div className="ck-invoice-table-head"><span>Item</span><span>Qty</span><span>Price</span></div>
            {bag.map(({ meal, qty }) => (
              <div className="ck-invoice-line" key={meal.id}>
                <img src={meal.photo} alt="" />
                <span><strong>{meal.name}</strong><small>{meal.pack ?? `${qty} serving${qty === 1 ? "" : "s"}`}</small></span>
                <span>{qty}</span>
                <strong>{formatRupees(meal.price * qty)}</strong>
              </div>
            ))}
            <div className="ck-invoice-charges">
              <p><span>Subtotal</span><strong>{formatRupees(subtotal)}</strong></p>
              <p><span>Pickup service</span><strong>{formatRupees(15)}</strong></p>
              <p><span>Taxes</span><strong>{formatRupees(8)}</strong></p>
            </div>
            <p className="ck-invoice-total"><strong>Total</strong><strong>{formatRupees(total)}</strong></p>
          </article>
        </div>
        <div className="ck-invoice-generating">
          <span className="ck-invoice-spinner" />
          <span><strong>Generating bill...</strong><small>This may take a few seconds.</small></span>
        </div>
      </section>
      <ol className="ck-invoice-progress" aria-label="Order progress">
        <li className="is-complete"><span><CheckIcon /></span><strong>Payment received</strong><small>01:24 PM</small></li>
        <li className="is-current"><span><NoteIcon /></span><strong>Generating invoice</strong><small>Just a moment...</small></li>
        <li><span><BoxIcon /></span><strong>Confirming order</strong><small>—</small></li>
        <li><span><DeliveryIcon /></span><strong>Order confirmed</strong><small>—</small></li>
      </ol>
      <p className="ck-invoice-warning"><AlertIcon /><span><strong>Please don't refresh or close this page.</strong><small>We're finalizing your invoice and order details.</small></span></p>
    </main>
  );
}

function OrderSummaryPage({
  bag,
  journey,
  stop,
  pickupName,
  pickupPhone,
  paymentMethod,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  pickupName: string;
  pickupPhone: string;
  paymentMethod: PaymentMethod;
}) {
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const total = subtotal + 23;
  const date = formatBarDate(journey.date);
  const paymentLabel = paymentMethod === "google-pay"
    ? "Google Pay"
    : paymentMethod === "phonepe"
      ? "PhonePe"
      : paymentMethod === "paytm"
        ? "Paytm"
        : "UPI";

  return (
    <main className="ck-main ck-order-summary-main">
      <MobileOrderComplete
        bag={bag}
        stop={stop}
        subtotal={subtotal}
        total={subtotal + 55.3}
        date={date}
      />
      <header className="ck-order-success-heading">
        <span><CheckIcon /></span>
        <div><h1>Your order summary</h1><p>Payment successful! Your order has been confirmed.</p></div>
      </header>
      <div className="ck-order-summary-layout">
        <section className="ck-order-invoice-card">
          <header className="ck-order-invoice-header">
            <NoteIcon />
            <span><strong>Aahaa Order Invoice</strong><small>Your food, fresh and on time</small></span>
            <span className="ck-order-invoice-id"><small>Order ID</small><strong>#AHA-728361</strong></span>
          </header>
          <div className="ck-order-invoice-table">
            <div className="ck-order-invoice-table-head"><span>Item</span><span>Qty</span><span>Price</span></div>
            {bag.map(({ meal, qty }) => (
              <div className="ck-order-invoice-line" key={meal.id}>
                <img src={meal.photo} alt="" />
                <span><strong>{meal.name}</strong><small>{meal.pack ?? `${qty} serving${qty === 1 ? "" : "s"}`}</small></span>
                <span>{qty}</span>
                <strong>{formatRupees(meal.price * qty)}</strong>
              </div>
            ))}
          </div>
          <div className="ck-order-invoice-totals">
            <p><span>Subtotal</span><strong>{formatRupees(subtotal)}</strong></p>
            <p><span>Pickup service <HelpIcon /></span><strong>{formatRupees(15)}</strong></p>
            <p><span>Taxes <HelpIcon /></span><strong>{formatRupees(8)}</strong></p>
            <p className="ck-order-invoice-total"><strong>Total</strong><strong>{formatRupees(total)}</strong></p>
          </div>
          <div className="ck-order-payment">
            <span className="ck-order-upi-logo">UPI</span>
            <span><small>Payment method</small><strong>{paymentLabel}</strong></span>
            <strong className="ck-order-paid"><CheckIcon /> Paid</strong>
          </div>
          <section className="ck-order-status">
            <h2>Order status</h2>
            <ol>
              <li className="is-complete"><span><CheckIcon /></span><strong>Order confirmed</strong><small>12:42 PM</small><p>Your order has been received.</p></li>
              <li className="is-current"><span><NoteIcon /></span><strong>Preparing</strong><small>01:00 PM</small><p>Home cook is preparing your food.</p></li>
              <li><span><BoxIcon /></span><strong>Packed &amp; ready</strong><small>—</small><p>Your food will be packed shortly.</p></li>
              <li><span><BusIcon /></span><strong>Pickup at {stop.name} bus stand</strong><small>—</small><p>Delivery partner will pick up at your selected stop.</p></li>
            </ol>
          </section>
          <div className="ck-order-actions">
            <button type="button" className="ck-order-download" onClick={() => window.print()}><DownloadIcon />Download invoice</button>
            <button type="button" className="ck-order-track-button" onClick={() => navigate(PATHS.trackOrder)}><PinIcon />Track your order</button>
          </div>
        </section>

        <aside className="ck-order-summary-sidebar">
          <section className="ck-order-pickup-card">
            <h2><NoteIcon />Order &amp; Pickup Summary</h2>
            <OrderDetail icon={<ProfileIcon />} label="Collector name" value={pickupName} />
            <OrderDetail icon={<PhoneIcon />} label="Mobile number" value={pickupPhone} />
            <OrderDetail
              icon={<PinIcon />}
              label="Pickup location"
              value={`${stop.name} bus stand`}
              action={<button type="button" onClick={() => navigate(PATHS.confirmPickup)}>Change</button>}
            />
            <OrderDetail icon={<ClockIcon />} label="Pickup time" value={stop.time} />
            <OrderDetail icon={<BusIcon />} label="Journey" value={`${journey.from} → ${journey.to}`} />
            <OrderDetail icon={<CalendarIcon />} label="Date" value={date} />
          </section>
          <section className="ck-order-help-card">
            <span><HeadsetIcon /></span>
            <div><strong>Need help with your order?</strong><small>Our support team is here to help you with any order issues.</small><button className="ck-checkout-help" type="button"><HelpIcon />Help &amp; support</button></div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function MobileOrderComplete({
  bag,
  stop,
  subtotal,
  total,
  date,
}: {
  bag: BagLine[];
  stop: ReturnType<typeof pickupMeta>;
  subtotal: number;
  total: number;
  date: string;
}) {
  const itemCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const journeyDate = `${date.split("-").join(" ")}, 01:02 PM`;

  return (
    <div className="ck-mobile-order-complete">
      <header className="ck-mobile-complete-header">
        <button type="button" aria-label="Back to home cooks" onClick={() => navigate(PATHS.cooks)}>
          <BackChevronIcon />
        </button>
        <span className="ck-wordmark">a<span className="ck-mark-aa">ahaa<SmileIcon /></span></span>
      </header>

      <section className="ck-mobile-complete-success">
        <img src={paymentCompleteSuccess} alt="" />
        <div>
          <h1>Payment Completed!</h1>
          <p>Your order has been confirmed.</p>
          <small>Transaction ID: AAH20737389383 <NoteIcon /></small>
        </div>
        <img src={paymentCompleteInvoice} alt="" />
      </section>

      <section className="ck-mobile-complete-card" aria-label="Order details">
        <div className="ck-mobile-complete-kitchen">
          <img src={paymentKitchen} alt="" />
          <div>
            <strong>From Lakshmi’s Kitchen</strong>
            <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
            <small>{itemCount} items - {bag.map(({ meal }) => meal.name).join(", ")}</small>
          </div>
        </div>
        <div className="ck-mobile-complete-meta">
          <small>Order ID: AAH20346389383-001</small>
          <small>{journeyDate}</small>
        </div>
        <div className="ck-mobile-complete-pickup">
          <span><PinIcon /><small>Pickup point</small><strong>{stop.name}</strong></span>
          <span><ClockIcon /><small>Pickup time</small><strong>{stop.time}</strong></span>
        </div>
        <div className="ck-mobile-complete-items">
          <div className="ck-mobile-complete-table-head"><span>Item</span><span>Qty</span><span>Amount</span></div>
          {bag.map(({ meal, qty }) => (
            <div className="ck-mobile-complete-item" key={meal.id}>
              <img src={meal.photo} alt="" />
              <span><strong>{meal.name}</strong><small>{meal.description}</small></span>
              <span>{qty}</span>
              <strong>{formatRupees(meal.price * qty)}</strong>
            </div>
          ))}
        </div>
        <div className="ck-mobile-complete-totals">
          <p><span>Items total ({itemCount} items)</span><strong>{formatRupees(subtotal)}</strong></p>
          <p><span>Delivery fee</span><strong>{formatRupees(30)}</strong></p>
          <p><span>GST &amp; other charges</span><strong>{formatCartAmountForCheckout(25.3)}</strong></p>
          <p className="ck-mobile-complete-paid"><strong>Total paid</strong><strong>{formatCartAmountForCheckout(total)}</strong></p>
        </div>
      </section>

      <section className="ck-mobile-complete-status">
        <h2>Order status</h2>
        <ol>
          <li className="is-complete"><span><CheckIcon /></span><strong>Payment<br />confirmed</strong></li>
          <li className="is-current"><span><NoteIcon /></span><strong>Preparing<br />order</strong></li>
          <li><span><BoxIcon /></span><strong>Ready for<br />pickup</strong></li>
          <li><span><DeliveryIcon /></span><strong>Order<br />completed</strong></li>
        </ol>
      </section>

      <button className="ck-mobile-complete-track" type="button" onClick={() => navigate(PATHS.trackOrder)}>
        <span><PinIcon /></span>
        <span><strong>Track your order</strong><small>Get real-time updates on your order status</small></span>
        <PaymentChevronIcon />
      </button>

      <footer className="ck-mobile-complete-actions">
        <button type="button" onClick={() => navigate(PATHS.invoice)}><DownloadIcon />View invoice</button>
        <button type="button" onClick={() => navigate(PATHS.helpSupport)}><HelpIcon />Need help?</button>
      </footer>
    </div>
  );
}

function formatCartAmountForCheckout(value: number) {
  return Number.isInteger(value) ? formatRupees(value) : `₹${value.toFixed(2)}`;
}

function MobileOrderInvoice({
  bag,
  journey,
  stop,
  paymentMethod,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  paymentMethod: PaymentMethod;
}) {
  const [shareMessage, setShareMessage] = useState("");
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const itemCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const total = subtotal + 55.3;
  const paymentLabel = paymentMethod === "google-pay"
    ? "Google Pay"
    : paymentMethod === "phonepe"
      ? "PhonePe"
      : paymentMethod === "paytm"
        ? "Paytm"
        : "UPI";
  const invoiceDate = journey.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  async function shareInvoice() {
    if (!navigator.share) {
      setShareMessage("Sharing isn't available on this device.");
      return;
    }

    try {
      await navigator.share({
        title: "Aahaa Order Invoice",
        text: "Your Aahaa order invoice (#AAH20261018-001).",
      });
      setShareMessage("");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Unable to share the invoice. Please try again.");
    }
  }

  return (
    <main className="ck-mobile-invoice">
      <header className="ck-mobile-invoice-header">
        <button type="button" aria-label="Back to order summary" onClick={() => navigate(PATHS.orderSummary)}>
          <BackChevronIcon />
        </button>
        <span className="ck-wordmark">a<span className="ck-mark-aa">ahaa<SmileIcon /></span></span>
        <h1>Order Invoice</h1>
        <button type="button" aria-label="Share invoice" onClick={() => void shareInvoice()}><ShareIcon /></button>
      </header>

      <section className="ck-mobile-invoice-success">
        <span><CheckIcon /></span>
        <div><strong>Payment successful!</strong><small>Your order has been confirmed.</small><small>Transaction ID: AAH2073789838</small></div>
        <NoteIcon />
      </section>

      <article className="ck-mobile-invoice-card">
        <header className="ck-mobile-invoice-brand">
          <strong>aahaa<span>⌣</span></strong>
          <div><b>TAX INVOICE</b><small>Homemade Food For Your Journey</small></div>
        </header>
        <dl className="ck-mobile-invoice-meta">
          <div><dt>Invoice Number</dt><dd>AAH20261018-001</dd></div>
          <div><dt>Order ID</dt><dd>AAH20346389383-001</dd></div>
          <div><dt>Order Date</dt><dd>{invoiceDate}, 01:02 PM</dd></div>
          <div><dt>Payment Method</dt><dd>{paymentLabel}</dd></div>
        </dl>
        <div className="ck-mobile-invoice-kitchen">
          <img src={imgKitchenLakshmi} alt="" />
          <div>
            <strong>From Lakshmi’s Kitchen</strong>
            <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
            <small>{itemCount} items - {bag.map(({ meal }) => meal.name).join(", ")}</small>
          </div>
        </div>
        <div className="ck-mobile-invoice-pickup">
          <span><PinIcon /><small>Pickup point</small><strong>{stop.name}</strong></span>
          <span><ClockIcon /><small>Pickup time</small><strong>{stop.time}</strong></span>
        </div>
        <div className="ck-mobile-invoice-items">
          <div className="ck-mobile-invoice-table-head"><span>Item</span><span>Qty</span><span>Amount</span></div>
          {bag.map(({ meal, qty }) => (
            <div className="ck-mobile-invoice-item" key={meal.id}>
              <img src={meal.photo} alt="" />
              <span><strong>{meal.name}</strong><small>{meal.description}</small></span>
              <span>{qty}</span>
              <strong>{formatRupees(meal.price * qty)}</strong>
            </div>
          ))}
        </div>
        <div className="ck-mobile-invoice-totals">
          <p><span>Items total ({itemCount} items)</span><strong>{formatRupees(subtotal)}</strong></p>
          <p><span>Delivery fee</span><strong>{formatRupees(30)}</strong></p>
          <p><span>GST &amp; other charges</span><strong>{formatCartAmountForCheckout(25.3)}</strong></p>
          <p className="ck-mobile-invoice-paid"><strong>Total paid</strong><strong>{formatCartAmountForCheckout(total)}</strong></p>
        </div>
      </article>

      <div className="ck-mobile-invoice-actions">
        <button type="button" onClick={() => window.print()}><DownloadIcon />Download invoice</button>
        <button type="button" onClick={() => void shareInvoice()}><ShareIcon />Share invoice</button>
      </div>
      {shareMessage ? <p className="ck-mobile-invoice-share-message" role="status">{shareMessage}</p> : null}
    </main>
  );
}

function OrderDetail({
  icon,
  label,
  value,
  action,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  action?: ReactNode;
}) {
  return (
    <div className="ck-order-detail">
      <span className="ck-order-detail-icon">{icon}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
      {action}
    </div>
  );
}

function TrackOrderPage({ bag, stop, journey }: {
  bag: BagLine[];
  stop: ReturnType<typeof pickupMeta>;
  journey: JourneyChoice;
}) {
  const total = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0) + 23;
  const firstLine = bag[0];
  const orderDate = `${journey.date.getDate()} ${journey.date.toLocaleString("en", { month: "short" })} ${journey.date.getFullYear()}`;

  return (
    <main className="ck-main ck-track-order-main">
      <section className="ck-mobile-journey">
        <header className="ck-mobile-journey-heading">
          <h1>Track Journey</h1>
          <p>Stay updated on your food pickup</p>
        </header>
        {firstLine ? (
          <article className="ck-mobile-journey-order">
            <img src={firstLine.meal.photo} alt="" />
            <div className="ck-mobile-journey-order-info">
              <strong>Lakshmi’s Kitchen</strong>
              <small>Everyday South Indian comfort food</small>
              <small><CalendarIcon />{orderDate} · {stop.time} Pickup</small>
              <b>{formatRupees(firstLine.meal.price * firstLine.qty)}</b>
            </div>
            <span className="ck-mobile-journey-veg"><VegMark /> Vegetarian</span>
            <button type="button" onClick={() => navigate(PATHS.orderSummary)}>View details <span>›</span></button>
          </article>
        ) : null}
        <section className="ck-mobile-journey-tracking">
          <div className="ck-mobile-journey-status">
            <strong><span aria-hidden="true">🛵</span> On the way to pickup stop</strong>
            <span>ETA at pickup stop<b>11:45 AM</b></span>
          </div>
          <div className="ck-mobile-journey-map">
            <img src={trackMapBase} alt="" />
            <div className="ck-mobile-journey-map-hint">Ramesh is on the way<br />to the pickup stop</div>
            <img className="ck-mobile-journey-rider" src={a.imgCuteCourierOnAMintScooter1} alt="Delivery partner riding to the pickup stop" />
            <span className="ck-mobile-journey-stop-icon"><BusIcon /></span>
            <span className="ck-mobile-journey-stop-label">Pickup stop<br /><small>{stop.name}</small></span>
          </div>
          <div className="ck-mobile-journey-progress">
            <span className="ck-mobile-journey-progress-icon"><DeliveryIcon /></span>
            <div><strong>On the way</strong><small>Partner is heading to<br />the pickup stop.</small></div>
            <span className="ck-mobile-journey-progress-line" aria-hidden="true" />
            <span className="ck-mobile-journey-progress-next"><BusIcon /></span>
            <div><strong>Ready for pickup</strong><small>Collect your order at<br />the pickup stop.</small></div>
          </div>
        </section>
        <section className="ck-mobile-journey-card ck-mobile-partner">
          <h2>Delivery Partner</h2>
          <div>
            <img src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />
            <span><strong>Ramesh</strong><small>★ 4.8 (320+ deliveries)</small></span>
            <a href="tel:+919876543210" aria-label="Call delivery partner"><PhoneIcon /></a>
            <a href="sms:+919876543210" aria-label="Message delivery partner"><ChatBubbleIcon /></a>
          </div>
        </section>
        <section className="ck-mobile-journey-card ck-mobile-bike">
          <h2>Bike details</h2>
          <div>
            <img src={a.imgCuteCourierOnAMintScooter1} alt="" />
            <span><strong>TVS Jupiter</strong><small>TN 70 AB 1234</small></span>
            <b>🛵&nbsp; aahaa Partner</b>
          </div>
        </section>
        <section className="ck-mobile-journey-card ck-mobile-pickup">
          <span className="ck-mobile-pickup-icon"><BusIcon /></span>
          <div><strong>Pickup stop</strong><small>Hosur · Food pickup stop</small><small><RoutePin color="#ff4b2b" />{stop.detail}</small></div>
          <button type="button" onClick={() => navigate(PATHS.trackOrder)}><RoutePin color="#ff4b2b" /> View on map</button>
        </section>
      </section>
      <header className="ck-track-heading">
        <button type="button" aria-label="Back to order summary" onClick={() => navigate(PATHS.orderSummary)}><BackChevronIcon /></button>
        <div><h1>Track your order</h1><p>Order ID: #AHA-728361</p></div>
        <strong className="ck-track-live"><span />On the way</strong>
      </header>
      <div className="ck-track-layout">
        <aside className="ck-track-sidebar">
          <section className="ck-track-items">
            <h2><BagIcon />Order items</h2>
            {bag.map(({ meal, qty }) => (
              <div className="ck-track-item" key={meal.id}>
                <img src={meal.photo} alt="" />
                <span><strong>{meal.name}</strong><small>{meal.pack ?? `${qty} serving${qty === 1 ? "" : "s"}`}</small></span>
                <strong>{formatRupees(meal.price * qty)}</strong>
              </div>
            ))}
            <p><strong>Total amount</strong><strong>{formatRupees(total)}</strong></p>
          </section>
          <section className="ck-track-partner">
            <img src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />
            <span><small>Delivery partner</small><strong>Arun Kumar</strong><small className="ck-track-rating">★ 4.8&nbsp; | &nbsp;1,250+ deliveries</small></span>
            <a href="tel:+919876543210" aria-label="Call delivery partner"><PhoneIcon /></a>
          </section>
        </aside>
        <section className="ck-track-map" aria-label={`Delivery route to ${stop.name} bus stand`}>
          <img className="ck-track-map-base" src={trackMapBase} alt="" />
          <div className="ck-map-place ck-map-place--north">Denkanikottai</div>
          <div className="ck-map-place ck-map-place--east">Shoolagiri</div>
          <div className="ck-map-place ck-map-place--south">Kelamangalam</div>
          <div className="ck-map-place ck-map-place--west">Anekal</div>
          <svg className="ck-map-route" viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
            <path d="M110 245 C245 255 310 325 470 315 S700 245 820 260" fill="none" stroke="#fff" strokeWidth="12" strokeLinecap="round" />
            <path d="M110 245 C245 255 310 325 470 315 S700 245 820 260" fill="none" stroke="#ff541f" strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="ck-map-cook">
            <span><img src={cookLakshmiMenu} alt="" /></span>
            <span><strong>Cook’s kitchen</strong><small>Velandipalayam</small></span>
          </div>
          <span className="ck-map-point ck-map-point--start" />
          <span className="ck-map-rider" aria-label="Delivery partner on the way"><img src={a.imgCuteCourierOnAMintScooter1} alt="" /></span>
          <span className="ck-map-arrival">Arriving in<strong>18 mins</strong></span>
          <span className="ck-map-point ck-map-point--stop"><BusIcon /></span>
          <div className="ck-map-stop-card"><span><BusIcon /></span><strong>{stop.name} bus stand</strong><img src={imgBusStop} alt="" /></div>
          <div className="ck-map-controls" aria-hidden="true"><span>◎</span><span>＋</span><span>−</span></div>
        </section>
      </div>
      <ol className="ck-track-timeline">
        <li className="is-complete"><span><CheckIcon /></span><strong>Order confirmed</strong><small>12:42 PM</small><p>Your order has been received.</p></li>
        <li className="is-complete"><span><CheckIcon /></span><strong>Preparing</strong><small>01:00 PM</small><p>Home cook is preparing your food.</p></li>
        <li className="is-current"><span><DeliveryIcon /></span><strong>On the way</strong><small>01:25 PM</small><p>Your order is on the way from the cook’s kitchen to {stop.name} bus stand.</p></li>
        <li><span><BusIcon /></span><strong>Arriving at pickup point</strong><small>~ 01:43 PM</small><p>We will notify you once it reaches the pickup point.</p></li>
      </ol>
    </main>
  );
}

function MealCard({
  meal,
  qty,
  onAdd,
  onQty,
}: {
  meal: Meal;
  qty: number;
  onAdd: () => void;
  onQty: (qty: number) => void;
}) {
  const openDetail = meal.id === "lemon-rice" ? () => navigate(PATHS.lemonRice) : undefined;

  return (
    <article className="ck-meal-card">
      <div className={openDetail ? "ck-meal-photo ck-meal-photo--link" : "ck-meal-photo"}>
        {openDetail ? (
          <button type="button" className="ck-meal-photo-btn" aria-label={`Open ${meal.name}`} onClick={openDetail}>
            <img src={meal.photo} alt="" />
          </button>
        ) : (
          <img src={meal.photo} alt="" />
        )}
        <VegMark />
      </div>
      <h3>{meal.name}</h3>
      <p>{meal.description}</p>
      <p className="ck-meal-meta">
        <StarIcon />
        {meal.rating} ({meal.reviews}) · 1 serving
      </p>
      <p className="ck-meal-price">{formatRupees(meal.price)}</p>
      <div className="ck-meal-actions">
        <button className="ck-details" type="button" onClick={openDetail}>
          View details
        </button>
        {qty > 0 ? <Stepper name={meal.name} qty={qty} onQty={onQty} /> : <AddButton onClick={onAdd} />}
      </div>
    </article>
  );
}

function SnackCard({
  meal,
  qty,
  onAdd,
  onQty,
}: {
  meal: Meal;
  qty: number;
  onAdd: () => void;
  onQty: (qty: number) => void;
}) {
  return (
    <article className="ck-snack-card">
      <div className="ck-snack-photo">
        <img src={meal.photo} alt="" />
      </div>
      <div>
        <div className="ck-snack-top">
          <h3>{meal.name}</h3>
          <VegMark />
        </div>
        <p>{meal.pack}</p>
        <p className="ck-meal-meta">
          <StarIcon />
          {meal.rating} ({meal.reviews})
        </p>
        <p className="ck-meal-price">{formatRupees(meal.price)}</p>
        <div className="ck-meal-actions">
          <button className="ck-details" type="button">
            View details
          </button>
          {qty > 0 ? <Stepper name={meal.name} qty={qty} onQty={onQty} /> : <AddButton onClick={onAdd} />}
        </div>
      </div>
    </article>
  );
}

function SnackSideRow({
  meal,
  qty,
  onAdd,
  onQty,
}: {
  meal: Meal;
  qty: number;
  onAdd: () => void;
  onQty: (qty: number) => void;
}) {
  return (
    <article className="ck-snack-side">
      <img src={meal.photo} alt="" />
      <div className="ck-snack-side-copy">
        <strong>{meal.name}</strong>
        <p>
          {meal.pack ? `${meal.pack} · ` : null}
          {formatRupees(meal.price)}
        </p>
      </div>
      {qty > 0 ? <Stepper name={meal.name} qty={qty} onQty={onQty} /> : <AddButton onClick={onAdd} />}
    </article>
  );
}

function Stepper({ name, qty, onQty }: { name: string; qty: number; onQty: (qty: number) => void }) {
  return (
    <div className="ck-stepper">
      <button type="button" aria-label={`Remove ${name}`} onClick={() => onQty(qty - 1)}>
        −
      </button>
      <span>{qty}</span>
      <button type="button" aria-label={`Add ${name}`} onClick={() => onQty(qty + 1)}>
        +
      </button>
    </div>
  );
}

function AddButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="ck-add" type="button" onClick={onClick}>
      Add +
    </button>
  );
}

function LemonRiceDetail({
  bag,
  addMeal,
  setQty,
  journey,
  stop,
}: {
  bag: BagLine[];
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
}) {
  const meal = LAKSHMI_MEALS.find((item) => item.id === "lemon-rice") ?? LAKSHMI_MEALS[1];
  const qty = bag.find((line) => line.meal.id === meal.id)?.qty ?? 0;
  const displayQty = qty > 0 ? qty : 1;
  const [activeThumb, setActiveThumb] = useState(0);
  const gallery = [lemonHeroMain, lemonThumb2, lemonThumb3];
  const thumbs = [lemonThumb1, lemonThumb2, lemonThumb3];

  return (
    <main className="ck-main ck-main--meal">
      <div className="ck-crumbs">
        <button type="button" onClick={() => navigate(PATHS.cooks)}>
          Home cooks
        </button>
        <span>/</span>
        <button type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>
          Lakshmi’s Kitchen
        </button>
        <span>/</span>
        <strong className="ck-crumb-current">Lemon rice & potato fry</strong>
        <button className="ck-back" type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>
          ← Back to menu
        </button>
      </div>

      <section className="ck-meal-detail">
        <div className="ck-meal-gallery">
          <img className="ck-meal-hero" src={gallery[activeThumb]} alt="" />
          <div className="ck-meal-thumbs">
            {thumbs.map((src, index) => (
              <button
                key={index}
                type="button"
                className={index === activeThumb ? "is-on" : undefined}
                onClick={() => setActiveThumb(index)}
              >
                <img src={src} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="ck-meal-info">
          <em className="ck-meal-veg">
            <LeafIcon />
            Vegetarian
          </em>
          <h1>Lemon rice & potato fry</h1>
          <button className="ck-meal-by" type="button" onClick={() => navigate(PATHS.lakshmiMenu)}>
            By Lakshmi’s Kitchen
          </button>
          <p className="ck-rating">
            <StarIcon />
            4.7 · 38 reviews
          </p>
          <p className="ck-meal-lead">Tangy lemon rice with a comforting side of potato fry.</p>

          <div className="ck-meal-price-row">
            <strong className="ck-meal-detail-price">{formatRupees(meal.price)}</strong>
            <span className="ck-meal-price-rule" aria-hidden="true" />
            <p className="ck-meal-serve">
              <img className="ck-meal-cloche" src={serveCloche} alt="" />
              <span>
                <b>1 serving</b>
                Perfect for one
              </span>
            </p>
          </div>

          <div className="ck-meal-includes">
            <span>Included in this meal</span>
            <div>
              <figure>
                <img src={lemonIncRice} alt="" />
                <figcaption>Lemon rice</figcaption>
              </figure>
              <figure>
                <img src={lemonIncPotato} alt="" />
                <figcaption>Potato fry</figcaption>
              </figure>
              <figure>
                <img src={lemonIncPickle} alt="" />
                <figcaption>Pickle</figcaption>
              </figure>
            </div>
          </div>

          <div className="ck-meal-facts">
            <div className="ck-meal-facts-top">
              <p>
                <strong>Ingredients</strong>
                Rice, lemon, peanuts, curry leaves, mustard seeds, turmeric, potato
              </p>
              <div className="ck-meal-allergen-block">
                <strong>Allergen information</strong>
                <p className="ck-meal-allergen">
                  <AlertIcon />
                  Contains peanuts and mustard
                </p>
              </div>
            </div>
            <p className="ck-meal-spice">
              <span className="ck-meal-spice-label">Spice level</span>
              <em className="ck-meal-spice-badge">
                <span className="ck-meal-chili" aria-hidden="true">
                  🌶️
                </span>
                Mild
              </em>
            </p>
          </div>

          <div className="ck-meal-cta">
            <p className="ck-meal-cta-stop">
              <BannerPinIcon />
              <span>
                <strong>Pickup at {stop.name} bus stand</strong>
                <em>
                  {formatBannerDate(journey.date)} · {stop.time}
                </em>
              </span>
            </p>
            <label className="ck-meal-qty">
              <span>Quantity</span>
              <div className="ck-meal-qty-box">
                <button type="button" aria-label={`Remove ${meal.name}`} onClick={() => setQty(meal.id, Math.max(0, displayQty - 1))}>
                  −
                </button>
                <em>{displayQty}</em>
                <button
                  type="button"
                  aria-label={`Add ${meal.name}`}
                  onClick={() => (qty > 0 ? setQty(meal.id, qty + 1) : addMeal(meal))}
                >
                  +
                </button>
              </div>
            </label>
            <button
              className="ck-meal-addbag"
              type="button"
              onClick={() => (qty > 0 ? setQty(meal.id, qty + 1) : addMeal(meal))}
            >
              Add to meal bag · {formatRupees(meal.price)}
            </button>
          </div>
        </div>
      </section>

      <div className="ck-meal-panels">
        <article className="ck-meal-about">
          <BookIcon />
          <div>
            <h2>About this meal</h2>
            <p>
              A traditional South Indian lemon rice made with ponni rice, fresh lemon, roasted peanuts, curry leaves and a
              blend of homemade spices. Light, flavourful and perfect for your journey.
            </p>
          </div>
        </article>
        <article className="ck-meal-pickup-note">
          <BannerPinIcon />
          <div>
            <strong>Pickup information</strong>
            <p>
              Collect near the main entrance, {stop.name} bus stand. Check your order for pickup updates before arrival.
            </p>
          </div>
        </article>
      </div>

      <section className="ck-meal-reviews">
        <h2>
          <StarIcon />
          4.7 / 38 reviews
        </h2>
        <div className="ck-meal-review-grid">
          <article>
            <strong>Ananya</strong>
            <p className="ck-rating">
              <StarIcon />
              5.0
            </p>
            <p>Fresh, tangy and perfect for the bus ride. The potato fry was crisp.</p>
          </article>
          <article>
            <strong>Ravi</strong>
            <p className="ck-rating">
              <StarIcon />
              4.5
            </p>
            <p>Tastes like home. Mild spice and packed well for pickup.</p>
          </article>
        </div>
      </section>

      <div className="ck-m-meal">
        <img className="ck-m-meal-hero" src={meal.photo} alt="" />
        <div className="ck-m-meal-top">
          <div>
            <h1>Lemon Rice</h1>
            <p>Home made lemon rice with peanuts and mild spices</p>
          </div>
          <button type="button" aria-label="Share" className="ck-m-share">
            <ShareIcon />
          </button>
        </div>
        <div className="ck-m-meal-price-row">
          <strong>{formatRupees(meal.price)}</strong>
          {qty > 0 ? (
            <Stepper name={meal.name} qty={qty} onQty={(next) => setQty(meal.id, next)} />
          ) : (
            <button className="ck-add" type="button" onClick={() => addMeal(meal)}>
              Add +
            </button>
          )}
        </div>
        <div className="ck-m-meal-tags">
          <span>No artificial colours</span>
          <span>Vegetarian</span>
        </div>
        <section>
          <h2>About this item</h2>
          <p>
            A traditional South Indian lemon rice made with ponni rice, fresh lemon, roasted peanuts, curry leaves and a
            blend of homemade spices. Light, flavourful and perfect for your journey.
          </p>
        </section>
        <div className="ck-m-meal-meta">
          <div>
            <img className="ck-m-meal-meta-ico" src={metaChefHat} alt="" />
            <span>
              <small>Food type</small>
              <strong>Rice meal</strong>
            </span>
          </div>
          <div>
            <img className="ck-m-meal-meta-ico" src={metaLeaf} alt="" />
            <span>
              <small>Suitable for</small>
              <strong>Vegetarian</strong>
            </span>
          </div>
          <div>
            <img className="ck-m-meal-meta-ico" src={metaRiceBowl} alt="" />
            <span>
              <small>Portion Size</small>
              <strong>1 Serving</strong>
            </span>
          </div>
          <div>
            <img className="ck-m-meal-meta-ico ck-m-meal-meta-ico--flip" src={metaLeaf} alt="" />
            <span>
              <small>Preparation</small>
              <strong>Freshly made</strong>
            </span>
          </div>
        </div>
        <section className="ck-m-meal-reviews">
          <div className="ck-m-meal-reviews-head">
            <h2>Reviews ( 24 )</h2>
            <p className="ck-rating">
              <StarIcon />
              4.8 ( 120+ )
            </p>
          </div>
          <article>
            <strong>Prasanth S</strong>
            <span>12 Oct 2026</span>
            <p>Very tasty and fresh. Perfect for travel. The lemon rice was flavourful and not too spicy.</p>
          </article>
          <article>
            <strong>Priya A</strong>
            <span>16 Oct 2026</span>
            <p>Very tasty and fresh. Perfect for travel. The lemon rice was flavourful and not too spicy.</p>
          </article>
        </section>
        <div className="ck-m-meal-bar">
          <div>
            <strong>{formatRupees(meal.price)}</strong>
            <small>1 Serving</small>
          </div>
          <button type="button" onClick={() => (qty > 0 ? setQty(meal.id, qty + 1) : addMeal(meal))}>
            <CartIcon />
            Add to cart
          </button>
        </div>
      </div>
    </main>
  );
}

function EditJourney({
  journey,
  setJourney,
  returnTo,
}: {
  journey: JourneyChoice;
  setJourney: Dispatch<SetStateAction<JourneyChoice>>;
  returnTo: string;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const stop = pickupMeta(journey.pickup);
  const [panel, setPanel] = useState<JourneyPanel>(null);
  const [viewMonth, setViewMonth] = useState(() => new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
  const editDate = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!cardRef.current?.contains(event.target as Node)) setPanel(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggle(next: Exclude<JourneyPanel, null>) {
    setPanel(panel === next ? null : next);
    if (next === "date") setViewMonth(new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
  }

  return (
    <main className="ck-main ck-edit-main">
      <section className="ck-edit-card" ref={cardRef}>
        <div className="ck-edit-title">
          <span className="ck-edit-hero-ico" aria-hidden="true">
            <EditTitleCalIcon />
          </span>
          <div>
            <h1>Edit your journey</h1>
            <p>Update your travel details to find home-cooked food at your pickup stop.</p>
          </div>
        </div>

        <div className="ck-ef-row">
          <EditField
            label="From"
            icon={<img src={a.imgMapPointStreamlineSolar} alt="" />}
            value={journey.from}
            open={panel === "from"}
            onToggle={() => toggle("from")}
          >
            {FROM_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                className={city === journey.from ? "is-on" : undefined}
                onClick={() => {
                  setJourney((current) => ({ ...current, from: city }));
                  setPanel(null);
                }}
              >
                {city}
              </button>
            ))}
          </EditField>

          <button
            className="ck-ef-swap"
            type="button"
            aria-label="Swap from and to"
            onClick={() => setJourney((current) => ({ ...current, from: current.to, to: current.from }))}
          >
            <img src={a.imgSortHorizontalStreamlineSolarAr} alt="" />
          </button>

          <EditField
            label="To"
            icon={<img src={a.imgMapPointStreamlineSolar} alt="" />}
            value={journey.to}
            open={panel === "to"}
            onToggle={() => toggle("to")}
          >
            {TO_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                className={city === journey.to ? "is-on" : undefined}
                onClick={() => {
                  setJourney((current) => ({ ...current, to: city }));
                  setPanel(null);
                }}
              >
                {city}
              </button>
            ))}
          </EditField>
        </div>

        <EditField
          label="Pickup point"
          icon={<ShelterIcon />}
          value={journey.pickup}
          open={panel === "pickup"}
          onToggle={() => toggle("pickup")}
          wide
        >
          {PICKUP_STOPS.map((item) => (
            <button
              key={item.name}
              type="button"
              className={item.name === journey.pickup ? "is-on" : undefined}
              onClick={() => {
                setJourney((current) => ({ ...current, pickup: item.name }));
                setPanel(null);
              }}
            >
              <strong>{item.name}</strong>
              <small>{item.time}</small>
            </button>
          ))}
        </EditField>
        <p className="ck-ef-hint">Choose a convenient stop along your route.</p>

        <div className="ck-ef-split">
          <EditField
            label="Date of journey"
            icon={<DateCalIcon />}
            value={editDate}
            open={panel === "date"}
            onToggle={() => toggle("date")}
            wide
          >
            <div className="ck-cal-nav">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <strong>
                {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
              </strong>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>
            <div className="ck-cal">
              {WEEKDAYS.map((day) => (
                <span key={day} className="ck-cal-wd">
                  {day}
                </span>
              ))}
              {monthCells(viewMonth.getFullYear(), viewMonth.getMonth()).map((day, index) => {
                if (!day) return <span key={`e-${index}`} />;
                const cell = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
                return (
                  <button
                    key={cell.toISOString()}
                    type="button"
                    className={sameDay(cell, journey.date) ? "is-on" : undefined}
                    onClick={() => {
                      setJourney((current) => ({ ...current, date: cell }));
                      setPanel(null);
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </EditField>

          <EditField
            label="Pickup time"
            icon={<ClockIcon />}
            value={stop.time}
            open={panel === "time"}
            onToggle={() => toggle("time")}
          >
            {PICKUP_STOPS.map((item) => (
              <button
                key={item.time}
                type="button"
                className={item.time === stop.time ? "is-on" : undefined}
                onClick={() => {
                  setJourney((current) => ({ ...current, pickup: item.name }));
                  setPanel(null);
                }}
              >
                {item.time}
              </button>
            ))}
          </EditField>
        </div>

        <div className="ck-edit-map">
          <img className="ck-edit-shelter" src={editBusStop} alt="" />
          <span className="ck-edit-map-rule" aria-hidden="true" />
          <div className="ck-edit-route">
            <div className="ck-edit-path">
              <div className="ck-edit-stop">
                <RoutePin color="#5cb85c" />
                <strong>{journey.from}</strong>
                <small>From</small>
              </div>
              <div className="ck-edit-stop ck-edit-stop--mid">
                <RoutePin color="#ff4b2b" />
                <span className="ck-edit-pill">{stop.name}</span>
                <small>Pickup point</small>
              </div>
              <div className="ck-edit-stop">
                <RoutePin color="#5cb85c" />
                <strong>{journey.to}</strong>
                <small>To</small>
              </div>
            </div>
            <p className="ck-edit-note">
              <ClocheIcon />
              <span className="ck-edit-note-rule" aria-hidden="true" />
              Home cooks and meals will be shown based on your pickup stop and time.
            </p>
          </div>
        </div>

        <div className="ck-edit-actions">
          <button className="ck-edit-cancel" type="button" onClick={() => navigate(returnTo)}>
            Cancel
          </button>
          <button className="ck-edit-update" type="button" onClick={() => navigate(returnTo)}>
            Update journey
            <ArrowIcon />
          </button>
        </div>
      </section>

      <p className="ck-edit-lock">
        <LockIcon />
        You can update your journey anytime before placing an order.
      </p>
    </main>
  );
}

function EditField({
  label,
  icon,
  value,
  open,
  onToggle,
  wide,
  children,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  open: boolean;
  onToggle: () => void;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={wide ? "ck-ef ck-ef--wide" : "ck-ef"}>
      <span className="ck-ef-label">{label}</span>
      <button className="ck-ef-btn" type="button" aria-expanded={open} aria-haspopup="listbox" onClick={onToggle}>
        {icon}
        <strong>{value}</strong>
        <ChevronIcon />
      </button>
      {open ? <div className="ck-dd">{children}</div> : null}
    </div>
  );
}

function Chip({
  pressed,
  onClick,
  children,
  className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
  className?: string;
}) {
  return (
    <button
      className={[pressed ? "ck-chip is-on" : "ck-chip", className].filter(Boolean).join(" ")}
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function MobileTabBar({ active }: { active: "home" | "orders" | "track" | "profile" }) {
  const items = [
    { id: "home", label: "Home", icon: <HomeNavIcon />, path: PATHS.cooks },
    { id: "orders", label: "My Orders", icon: <OrdersNavIcon />, path: PATHS.myOrders },
    { id: "track", label: "Track Journey", icon: <TrackNavIcon />, path: PATHS.trackOrder },
    { id: "profile", label: "Profile", icon: <ProfileNavIcon />, path: PATHS.profile },
  ] as const;

  return (
    <nav className="ck-m-nav" aria-label="Primary">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={active === item.id ? "is-on" : undefined}
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function CookFooter() {
  return (
    <footer className="ck-footer">
      <p>
        <span className="ck-footer-mark" aria-label="aahaa">
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </span>
        <span className="ck-footer-rule" aria-hidden="true" />
        <span>A little home, along the way.</span>
      </p>
      <p className="ck-footer-links">
        <button type="button">Help & support</button>
        <button type="button" onClick={() => navigate(PATHS.privacy)}>
          Privacy Policy
        </button>
        <button type="button" onClick={() => navigate(PATHS.terms)}>
          Terms
        </button>
      </p>
    </footer>
  );
}

function VegMark() {
  return (
    <span className="ck-veg" aria-label="Vegetarian">
      <span className="ck-veg-dot" aria-hidden="true" />
    </span>
  );
}

function SmileIcon() {
  return (
    <svg className="ck-smile" viewBox="0 0 40 14" fill="none" aria-hidden="true" preserveAspectRatio="none">
      <path d="M3.2 3.2c6.4 9.2 27.2 9.2 33.6 0" stroke="#fd451a" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function BackChevronIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 5.5 8.5 12 15 18.5" stroke="#421406" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="16" cy="5" r="2.2" stroke="#ac9692" strokeWidth="1.5" />
      <circle cx="16" cy="17" r="2.2" stroke="#ac9692" strokeWidth="1.5" />
      <circle cx="6" cy="11" r="2.2" stroke="#ac9692" strokeWidth="1.5" />
      <path d="m8 10 5.5-3.5M8 12l5.5 3.5" stroke="#ac9692" strokeWidth="1.5" />
    </svg>
  );
}

function HomeNavIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M3.5 10.2 11 4l7.5 6.2V18a1.2 1.2 0 0 1-1.2 1.2H4.7A1.2 1.2 0 0 1 3.5 18V10.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M8.5 19.2V12h5v7.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function OrdersNavIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="5" y="3.5" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8h6M8 11.5h6M8 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrackNavIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M11 19s6-5.3 6-10a6 6 0 1 0-12 0c0 4.7 6 10 6 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="11" cy="9" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ProfileNavIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.8 17.5c1.4-3 3.5-4.5 6.2-4.5s4.8 1.5 6.2 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function EditTitleCalIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="7" y="11" width="26" height="24" rx="4" fill="#fff" />
      <path d="M7 11h26v8H7Z" fill="#e24a1a" />
      <rect x="7" y="11" width="26" height="24" rx="4" stroke="#e24a1a" strokeWidth="1.8" />
      <path d="M14 7.5v7M26 7.5v7" stroke="#e24a1a" strokeWidth="2" strokeLinecap="round" />
      <rect x="12" y="23" width="4.2" height="4.2" rx="0.8" fill="#f3d2c0" />
      <rect x="18" y="23" width="4.2" height="4.2" rx="0.8" fill="#f3d2c0" />
      <rect x="24" y="23" width="4.2" height="4.2" rx="0.8" fill="#f3d2c0" />
      <rect x="12" y="29.2" width="4.2" height="4.2" rx="0.8" fill="#f3d2c0" />
      <path d="M29 29 40 40" stroke="#f0b429" strokeWidth="4" strokeLinecap="round" />
      <path d="M38 42 42 38" stroke="#c43d12" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ShelterIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="5.5" rx="1.4" fill="#ff4b2b" />
      <path d="M7.5 11V19.5M16.5 11V19.5" stroke="#ff4b2b" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function DateCalIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3.2" y="5.2" width="15.6" height="13.6" rx="2.4" stroke="#ff4b2b" strokeWidth="1.6" />
      <path d="M3.2 9.2h15.6" stroke="#ff4b2b" strokeWidth="1.6" />
      <path d="M7.2 3.4v3.4M14.8 3.4v3.4" stroke="#ff4b2b" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RoutePin({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11 20s6.4-5.3 6.4-10.1A6.4 6.4 0 0 0 4.6 9.9C4.6 14.7 11 20 11 20Zm0-7.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z"
        fill={color}
      />
    </svg>
  );
}

function ClocheIcon() {
  return (
    <svg className="ck-meal-cloche" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="22.2" rx="9.2" ry="2.1" fill="#f3e6d4" stroke="#5c3b28" strokeWidth="1.3" />
      <path
        d="M5.2 21.4c.4-7.2 3.7-12.2 8.8-12.2s8.4 5 8.8 12.2"
        fill="#f7efe4"
        stroke="#5c3b28"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M9.2 18.8c1.1-3.4 2.8-5.4 4.8-5.4" stroke="#c9b49a" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="14" cy="7.2" r="2.05" fill="#ff4b2b" stroke="#5c3b28" strokeWidth="1.1" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="2.5" y="6" width="9" height="6.5" rx="1.4" stroke="#6aa56a" strokeWidth="1.3" />
      <path d="M4.4 6V4.4a2.6 2.6 0 0 1 5.2 0V6" stroke="#6aa56a" strokeWidth="1.3" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="6.1" r="3.15" fill="currentColor" />
      <path d="M3.1 15.2c.7-3.4 3-5.1 5.9-5.1s5.2 1.7 5.9 5.1" fill="currentColor" />
    </svg>
  );
}

type AccountSection = "profile" | "orders" | "payments" | "notifications" | "settings" | "support" | "about" | "logout";

function AccountSidebar({
  active,
  onPaymentMethods,
  className,
}: {
  active: AccountSection;
  onPaymentMethods?: () => void;
  className?: string;
}) {
  const items: { id: AccountSection; label: string; description: string; path: string; icon: ReactNode; mobileOnly?: boolean }[] = [
    { id: "profile", label: "My Profile", description: "Name, mobile number, email", path: PATHS.profile, icon: <ProfileIcon /> },
    { id: "orders", label: "My Orders", description: "View and track your orders", path: PATHS.myOrders, icon: <OrdersNavIcon /> },
    { id: "payments", label: "Payment methods", description: "Manage cards and UPI", path: PATHS.paymentMethod, icon: <CreditCardIcon />, mobileOnly: true },
    { id: "notifications", label: "Notifications", description: "Order updates and offers", path: PATHS.notifications, icon: <NotificationIcon /> },
    { id: "settings", label: "App settings", description: "Language, privacy and more", path: PATHS.appSettings, icon: <SettingsIcon /> },
    { id: "support", label: "Help & support", description: "Get help with orders, payments and more", path: PATHS.helpSupport, icon: <HelpIcon /> },
    { id: "about", label: "About Aahaa", description: "App version, terms and policies", path: PATHS.about, icon: <InfoIcon /> },
  ];

  return (
    <nav className={["ck-profile-sidebar", className].filter(Boolean).join(" ")} aria-label="Profile menu">
      {items.map((item) => (
        <button
          key={item.id}
          className={[
            item.mobileOnly ? "ck-mobile-account-payment" : "",
            item.id === "orders" ? "ck-account-menu-orders" : "",
            active === item.id ? "is-current" : "",
          ].filter(Boolean).join(" ") || undefined}
          type="button"
          aria-current={active === item.id ? "page" : undefined}
          onClick={() => {
            if (item.id === "payments" && onPaymentMethods) {
              onPaymentMethods();
              return;
            }
            if (item.id === "profile" && window.matchMedia("(max-width: 767px)").matches) {
              navigate(PATHS.accountDetails);
              return;
            }
            navigate(item.path);
          }}
        >
          {item.icon}
          <span className="ck-account-label-desktop">{item.label}</span>
          <span className="ck-account-label-mobile">
            <strong>{item.id === "profile" ? "Account details" : item.label}</strong>
            <small>{item.description}</small>
          </span>
          <span className="ck-account-chevron" aria-hidden="true">›</span>
        </button>
      ))}
      <button
        className={active === "logout" ? "ck-profile-logout is-current" : "ck-profile-logout"}
        type="button"
        aria-current={active === "logout" ? "page" : undefined}
        onClick={() => navigate(PATHS.logout)}
      >
        <LogoutIcon />
        <span className="ck-account-label-desktop">Log out</span>
        <span className="ck-account-label-mobile"><strong>Log out</strong></span>
        <span className="ck-account-chevron" aria-hidden="true">›</span>
      </button>
    </nav>
  );
}

function ProfilePage({ onPaymentMethods }: { onPaymentMethods: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("Saran");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [email, setEmail] = useState("saran@email.com");

  return (
    <main className="ck-main ck-profile-main">
      <header className="ck-mobile-account-heading"><h1>Profile</h1></header>
      <div className="ck-mobile-profile-summary">
        <span className="ck-mobile-profile-avatar"><ProfileIcon /></span>
        <div>
          <strong>{name}</strong>
          <small>{phone}</small>
          <small>{email}</small>
        </div>
      </div>
      <AccountSidebar active="profile" onPaymentMethods={onPaymentMethods} className="ck-account-profile-menu" />
      <section className="ck-profile-content">
        <header className="ck-profile-heading"><h1>My Profile</h1><p>Manage your profile details.</p></header>
        <article className="ck-profile-card">
          <div className="ck-profile-person">
            <span className="ck-profile-photo"><ProfileIcon /><span><CameraIcon /></span></span>
            <div className="ck-profile-primary-data">
              {editing ? (
                <>
                  <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
                  <label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
                  <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                </>
              ) : (
                <>
                  <strong>{name}</strong>
                  <span>{phone}</span>
                  <span>{email}</span>
                </>
              )}
            </div>
            <button className="ck-profile-edit" type="button" onClick={() => setEditing((current) => !current)}>
              <PencilIcon />{editing ? "Save" : "Edit"}
            </button>
          </div>
          {!editing ? (
            <div className="ck-profile-details">
              <p><PhoneIcon /><strong>Mobile number</strong><span>{phone}</span></p>
              <p><EmailIcon /><strong>Email address</strong><span>{email}</span></p>
              <p><ProfileIcon /><strong>Name</strong><span>{name}</span></p>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function AccountDetailsPage() {
  const [name, setName] = useState("Saran");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [email, setEmail] = useState("saran@example.com");
  const [editing, setEditing] = useState({ name: false, phone: false, email: false });

  if (!window.matchMedia("(max-width: 767px)").matches) {
    return <ProfilePage onPaymentMethods={() => navigate(PATHS.paymentMethod)} />;
  }

  function toggleEditing(field: keyof typeof editing) {
    setEditing((current) => ({ ...current, [field]: !current[field] }));
  }

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditing({ name: false, phone: false, email: false });
  }

  return (
    <main className="ck-account-details">
      <header className="ck-account-details-heading">
        <h1>Account details</h1>
        <p>Manage your personal information</p>
      </header>
      <form className="ck-account-details-form" onSubmit={saveDetails}>
        <AccountDetailField
          label="Full name"
          value={name}
          icon={<ProfileIcon />}
          editing={editing.name}
          onChange={setName}
          onEdit={() => toggleEditing("name")}
        />
        <AccountDetailField
          label="Mobile number"
          value={phone}
          icon={<PhoneIcon />}
          verified
          editing={editing.phone}
          onChange={setPhone}
          onEdit={() => toggleEditing("phone")}
        />
        <AccountDetailField
          label="Email address"
          value={email}
          icon={<EmailIcon />}
          verified
          editing={editing.email}
          onChange={setEmail}
          onEdit={() => toggleEditing("email")}
        />
        <p className="ck-account-details-note">
          <InfoIcon />
          <span>Your details help us manage your orders and updates.</span>
        </p>
        <button className="ck-account-details-save" type="submit">Save changes</button>
      </form>
    </main>
  );
}

function AccountDetailField({
  label,
  value,
  icon,
  verified = false,
  editing,
  onChange,
  onEdit,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  verified?: boolean;
  editing: boolean;
  onChange: (value: string) => void;
  onEdit: () => void;
}) {
  return (
    <label className="ck-account-detail-field">
      <span className="ck-account-detail-label">{label}</span>
      <span className="ck-account-detail-control">
        <span className="ck-account-detail-icon">{icon}</span>
        <input
          aria-label={label}
          type={label === "Email address" ? "email" : label === "Mobile number" ? "tel" : "text"}
          value={value}
          readOnly={!editing}
          onChange={(event) => onChange(event.target.value)}
        />
        {verified ? <span className="ck-account-detail-verified"><CheckIcon />Verified</span> : null}
        <button
          className="ck-account-detail-edit"
          type="button"
          aria-label={`${editing ? "Finish editing" : "Edit"} ${label.toLowerCase()}`}
          onClick={onEdit}
        >
          <PencilIcon />
        </button>
      </span>
    </label>
  );
}

type OrderFilter = "All Orders" | "Ongoing" | "Delivered" | "Cancelled";
type OrderStatus = "Delivered" | "Preparing" | "On the way" | "Cancelled";
type MobileOrderFilter = "All Orders" | "Completed" | "Cancelled";
type MobileOrderStatus = "Completed" | "Preparing" | "On the way" | "Cancelled";

function getOrderMealPhoto(id: string) {
  const meal = LAKSHMI_MEALS.find((item) => item.id === id);
  if (!meal) throw new Error(`Unknown order meal: ${id}`);
  return meal.photo;
}

const MY_ORDERS: {
  cook: string;
  category: string;
  image: string;
  item: string;
  date: string;
  time: string;
  price: number;
  status: OrderStatus;
}[] = [
  {
    cook: "Lakshmi’s Kitchen",
    category: "South Indian Meals",
    image: getOrderMealPhoto("veg-lunch"),
    item: "Homestyle veg lunch",
    date: "18 Oct 2026",
    time: "1:00 PM",
    price: 60,
    status: "Delivered",
  },
  {
    cook: "Meena’s Home Food",
    category: "Homemade Meals",
    image: getOrderMealPhoto("curd-rice"),
    item: "Curd rice & pickle",
    date: "16 Oct 2026",
    time: "12:30 PM",
    price: 60,
    status: "Delivered",
  },
  {
    cook: "Agalya’s Kitchen",
    category: "South Indian Comfort Food",
    image: getOrderMealPhoto("idli"),
    item: "Soft idli & chutney",
    date: "14 Oct 2026",
    time: "1:15 PM",
    price: 100,
    status: "Delivered",
  },
  {
    cook: "Padma’s Kitchen",
    category: "Homemade Meals",
    image: getOrderMealPhoto("pulao"),
    item: "Vegetable pulao",
    date: "11 Oct 2026",
    time: "12:45 PM",
    price: 80,
    status: "Delivered",
  },
  {
    cook: "Lakshmi’s Kitchen",
    category: "South Indian Meals",
    image: getOrderMealPhoto("lemon-rice"),
    item: "Lemon rice & potato fry",
    date: "08 Oct 2026",
    time: "1:00 PM",
    price: 70,
    status: "Preparing",
  },
];

const MOBILE_MY_ORDERS: {
  cook: string;
  category: string;
  image: string;
  item: string;
  date: string;
  time: string;
  price: number;
  status: MobileOrderStatus;
}[] = [
  ...MY_ORDERS.map((order) => ({
    ...order,
    status: order.status === "Delivered" ? "Completed" as const : order.status,
  })),
  {
    cook: "Meena’s Home Food",
    category: "Homemade Meals",
    image: getOrderMealPhoto("curd-rice"),
    item: "Curd rice & pickle",
    date: "06 Oct 2026",
    time: "12:30 PM",
    price: 60,
    status: "Cancelled",
  },
];

function MyOrdersPage() {
  const [filter, setFilter] = useState<OrderFilter>("All Orders");
  const [mobileFilter, setMobileFilter] = useState<MobileOrderFilter>("All Orders");
  const filters: OrderFilter[] = ["All Orders", "Ongoing", "Delivered", "Cancelled"];
  const mobileFilters: MobileOrderFilter[] = ["All Orders", "Completed", "Cancelled"];
  const counts: Record<OrderFilter, number> = {
    "All Orders": MY_ORDERS.length,
    Ongoing: MY_ORDERS.filter((order) => order.status === "Preparing" || order.status === "On the way").length,
    Delivered: MY_ORDERS.filter((order) => order.status === "Delivered").length,
    Cancelled: MY_ORDERS.filter((order) => order.status === "Cancelled").length,
  };
  const visibleOrders = MY_ORDERS.filter((order) => {
    if (filter === "All Orders") return true;
    if (filter === "Ongoing") return order.status === "Preparing" || order.status === "On the way";
    return order.status === filter;
  });
  const mobileCounts: Record<MobileOrderFilter, number> = {
    "All Orders": MOBILE_MY_ORDERS.length,
    Completed: MOBILE_MY_ORDERS.filter((order) => order.status === "Completed").length,
    Cancelled: MOBILE_MY_ORDERS.filter((order) => order.status === "Cancelled").length,
  };
  const visibleMobileOrders = MOBILE_MY_ORDERS.filter((order) => (
    mobileFilter === "All Orders" || order.status === mobileFilter
  ));

  return (
    <main className="ck-main ck-profile-main ck-orders-main">
      <AccountSidebar active="orders" />
      <section className="ck-orders-content">
        <header className="ck-profile-heading ck-orders-desktop-heading"><h1>My Orders</h1><p>Track your past and current orders.</p></header>
        <header className="ck-mobile-account-heading"><h1>My Orders</h1></header>
        <div className="ck-orders-filters ck-orders-desktop-filters" role="tablist" aria-label="Filter orders">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={filter === item}
              className={filter === item ? "is-selected" : undefined}
              onClick={() => setFilter(item)}
            >
              {item}<span>{counts[item]}</span>
            </button>
          ))}
        </div>
        <div className="ck-orders-list ck-orders-desktop-list">
          {visibleOrders.map((order) => (
            <article className="ck-order-row" key={`${order.cook}-${order.date}`}>
              <img src={order.image} alt="" />
              <div className="ck-order-row-info">
                <strong>{order.cook}</strong>
                <small>{order.category}</small>
                <small className="ck-order-row-date"><CalendarIcon />{order.date}<span />{order.time}</small>
                <small>{order.item} · {formatRupees(order.price)}</small>
              </div>
              <span className={`ck-order-row-status${order.status === "Preparing" || order.status === "On the way" ? " is-ongoing" : order.status === "Cancelled" ? " is-cancelled" : ""}`}>
                {order.status}
              </span>
              <button
                className="ck-order-row-details"
                type="button"
                onClick={() => navigate(order.status === "Preparing" || order.status === "On the way" ? PATHS.trackOrder : PATHS.orderSummary)}
              >
                View details <span>›</span>
              </button>
            </article>
          ))}
          {visibleOrders.length === 0 ? <p className="ck-orders-empty">No {filter.toLowerCase()} found.</p> : null}
        </div>
        <div className="ck-orders-mobile-filters" role="tablist" aria-label="Filter orders">
          {mobileFilters.map((item) => (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={mobileFilter === item}
              className={mobileFilter === item ? "is-selected" : undefined}
              onClick={() => setMobileFilter(item)}
            >
              {item}<span>{mobileCounts[item]}</span>
            </button>
          ))}
        </div>
        <div className="ck-orders-mobile-list">
          {visibleMobileOrders.map((order) => {
            const cancelled = order.status === "Cancelled";
            const currentStep = order.status === "Completed" ? 4 : order.status === "On the way" ? 3 : 2;
            return (
              <article className={`ck-mobile-order-card${cancelled ? " is-cancelled" : ""}`} key={`${order.cook}-${order.date}`}>
                <div className="ck-mobile-order-top">
                  <img src={order.image} alt="" />
                  <div className="ck-mobile-order-info">
                    <strong>{order.cook}</strong>
                    <small>{order.item}</small>
                    <small>{order.date} · {order.time}</small>
                  </div>
                  <span className="ck-mobile-order-status">{order.status}</span>
                </div>
                <div className="ck-mobile-order-total">
                  <span>{formatRupees(order.price)}</span>
                  <button
                    type="button"
                    onClick={() => navigate(order.status === "Preparing" || order.status === "On the way" ? PATHS.trackOrder : PATHS.orderSummary)}
                  >
                    View details <span aria-hidden="true">›</span>
                  </button>
                </div>
                {cancelled ? (
                  <p className="ck-mobile-order-cancel-note">This order was cancelled</p>
                ) : (
                  <ol className="ck-mobile-order-progress" aria-label={`Order ${order.status.toLowerCase()}`}>
                    {["Order placed", "Preparing", "On the way", "Delivered"].map((step, index) => (
                      <li className={index < currentStep ? "is-done" : ""} key={step}>{step}</li>
                    ))}
                  </ol>
                )}
              </article>
            );
          })}
          {visibleMobileOrders.length === 0 ? <p className="ck-orders-empty">No {mobileFilter.toLowerCase()} found.</p> : null}
        </div>
      </section>
    </main>
  );
}

type AccountNotification = {
  title: string;
  description: string;
  time: string;
  icon: "meal" | "gift" | "order" | "cook" | "bell" | "offer" | "info";
  read: boolean;
};

const INITIAL_NOTIFICATIONS: AccountNotification[] = [
  { title: "Your order has been delivered", description: "Your order from Lakshmi’s Kitchen has been delivered successfully.", time: "10 min ago", icon: "meal", read: false },
  { title: "Special offer for you!", description: "Get 10% off on your next order from Meena’s Home Food.", time: "2 hours ago", icon: "gift", read: false },
  { title: "Your order is out for delivery", description: "Your order from Padma’s Kitchen is on the way.", time: "4 hours ago", icon: "order", read: false },
  { title: "New home cook near your route", description: "Agalya’s Kitchen is now available at Hosur bus stop.", time: "1 day ago", icon: "cook", read: false },
  { title: "Order confirmed", description: "Your order from Meena’s Home Food has been confirmed.", time: "2 days ago", icon: "bell", read: false },
  { title: "Weekend special!", description: "Enjoy homemade meals with exclusive offers this weekend.", time: "3 days ago", icon: "offer", read: false },
  { title: "Welcome to aahaa!", description: "Thank you for joining aahaa. Start exploring homemade meals now!", time: "5 days ago", icon: "info", read: false },
];

function NotificationArt({ type }: { type: AccountNotification["icon"] }) {
  const icon = {
    meal: null,
    gift: <GiftIcon />,
    order: <MenuIcon />,
    cook: <StepCookIcon />,
    bell: <NotificationIcon />,
    offer: <span className="ck-notification-percent">%</span>,
    info: <InfoIcon />,
  }[type];
  return (
    <span className="ck-notification-art">
      {type === "meal" ? <img src={getOrderMealPhoto("veg-lunch")} alt="" /> : icon}
    </span>
  );
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  function updateNotification(index: number, update: (notification: AccountNotification) => AccountNotification) {
    setNotifications((current) => current.map((notification, itemIndex) => itemIndex === index ? update(notification) : notification));
    setOpenMenu(null);
  }

  return (
    <main className="ck-main ck-profile-main ck-notifications-main">
      <AccountSidebar active="notifications" />
      <section className="ck-profile-content ck-account-content ck-notifications-desktop">
        <header className="ck-account-title-row">
          <div className="ck-profile-heading">
            <h1>Notifications</h1>
            <p>Stay updated with your orders, offers and important updates.</p>
          </div>
          <button
            className="ck-notifications-read-all"
            type="button"
            onClick={() => setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))}
          >
            Mark all as read
          </button>
        </header>
        <div className="ck-notifications-list">
          {notifications.map((notification, index) => (
            <article className={`ck-notification-card${notification.read ? " is-read" : ""}`} key={notification.title}>
              {!notification.read ? <span className="ck-notification-unread" aria-label="Unread" /> : <span className="ck-notification-unread-placeholder" />}
              <NotificationArt type={notification.icon} />
              <div className="ck-notification-copy">
                <strong>{notification.title}</strong>
                <p>{notification.description}</p>
              </div>
              <time>{notification.time}</time>
              <div className="ck-notification-actions">
                <button
                  type="button"
                  aria-label={`Options for ${notification.title}`}
                  aria-expanded={openMenu === index}
                  onClick={() => setOpenMenu((current) => current === index ? null : index)}
                >
                  <span aria-hidden="true">⋮</span>
                </button>
                {openMenu === index ? (
                  <div className="ck-notification-menu">
                    <button type="button" onClick={() => updateNotification(index, (item) => ({ ...item, read: true }))}>Mark as read</button>
                    <button type="button" onClick={() => { setNotifications((current) => current.filter((_, itemIndex) => itemIndex !== index)); setOpenMenu(null); }}>Remove</button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
          {notifications.length === 0 ? <p className="ck-settings-empty">You’re all caught up.</p> : null}
        </div>
      </section>
      <MobileNotificationPreferences />
    </main>
  );
}

const MOBILE_NOTIFICATION_GROUPS = [
  {
    title: "Order updates",
    options: [
      { id: "order-status", title: "Order status updates", description: "Get notified about order confirmation, preparation, and delivery", icon: "bell", enabled: true },
      { id: "kitchen", title: "Kitchen updates", description: "Get notified about menu updates, availability and special items", icon: "chef", enabled: true },
      { id: "offers", title: "Offers and discounts", description: "Get notified about exclusive offers and deals", icon: "tag", enabled: true },
    ],
  },
  {
    title: "Recommendations",
    options: [
      { id: "recommended-kitchens", title: "Recommended kitchens", description: "Get suggestions based on your taste and location", icon: "star", enabled: true },
      { id: "food-menu", title: "Food and menu updates", description: "Get notified about new kitchens and new menu items", icon: "menu", enabled: false },
    ],
  },
  {
    title: "Account and security",
    options: [
      { id: "account-alerts", title: "Account alerts", description: "Get notified about important account and security updates", icon: "shield", enabled: true },
      { id: "app-updates", title: "App updates", description: "Get notified about new features and improvements", icon: "megaphone", enabled: false },
    ],
  },
] as const;

type MobileNotificationOption = (typeof MOBILE_NOTIFICATION_GROUPS)[number]["options"][number];

function MobileNotificationIcon({ type }: { type: MobileNotificationOption["icon"] }) {
  const paths = {
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /><path d="M12 3V2" /></>,
    chef: <><path d="M6 19h12v-8a4 4 0 0 0-1.6-3.2A4.5 4.5 0 0 0 8 6.5 3.5 3.5 0 0 0 6 13v6Z" /><path d="M6 15h12M9 19v2m6-2v2" /></>,
    tag: <><path d="m3 12 9 9 9-9-9-9H3v9Z" /><circle cx="7.5" cy="7.5" r="1" /></>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
    menu: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8m-8 4h8m-8 4h5" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
    megaphone: <><path d="m3 11 18-5v12L3 13v-2Z" /><path d="M11 15.2 13 21H8l-1.5-6.8M21 10v4" /></>,
  } satisfies Record<MobileNotificationOption["icon"], ReactNode>;

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function MobileNotificationPreferences() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(MOBILE_NOTIFICATION_GROUPS.flatMap((group) => group.options.map((option) => [option.id, option.enabled])))
  ));

  return (
    <section className="ck-mobile-notifications">
      <header className="ck-mobile-notifications-header">
        <button type="button" aria-label="Back to profile" onClick={() => navigate(PATHS.profile)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <div className="ck-mobile-notifications-title">
        <h1>Notifications</h1>
        <p>Manage your notifications and stay updated</p>
      </div>
      {MOBILE_NOTIFICATION_GROUPS.map((group) => (
        <section className="ck-mobile-notification-group" key={group.title}>
          <h2>{group.title}</h2>
          <div className="ck-mobile-notification-card">
            {group.options.map((option) => (
              <div className="ck-mobile-notification-option" key={option.id}>
                <span className="ck-mobile-notification-icon"><MobileNotificationIcon type={option.icon} /></span>
                <span className="ck-mobile-notification-copy">
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <button
                  className={`ck-settings-switch${enabled[option.id] ? " is-on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={enabled[option.id]}
                  aria-label={option.title}
                  onClick={() => setEnabled((current) => ({ ...current, [option.id]: !current[option.id] }))}
                >
                  <span />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

const SETTING_OPTIONS = [
  { id: "orders", title: "Order updates", description: "Get notified about order confirmation, preparation, out for delivery and delivery.", icon: "bell" },
  { id: "offers", title: "Offers and promotions", description: "Receive updates about discounts and special offers.", icon: "tag" },
  { id: "cooks", title: "New home cooks nearby", description: "Get notified when new home cooks are available at your route.", icon: "cook" },
  { id: "general", title: "General updates", description: "Important announcements and app updates.", icon: "info" },
] as const;

function AppSettingsPage() {
  const [enabled, setEnabled] = useState<Record<(typeof SETTING_OPTIONS)[number]["id"], boolean>>({
    orders: true,
    offers: true,
    cooks: true,
    general: true,
  });
  const [language, setLanguage] = useState("English");

  return (
    <main className="ck-main ck-profile-main ck-app-settings-main">
      <AccountSidebar active="settings" />
      <section className="ck-profile-content ck-account-content">
        <header className="ck-profile-heading">
          <h1>App settings</h1>
          <p>Customize your app experience.</p>
        </header>
        <section className="ck-settings-card">
          <header className="ck-settings-card-heading">
            <h2>Notifications</h2>
            <p>Choose what updates you want to receive.</p>
          </header>
          <div className="ck-settings-options">
            {SETTING_OPTIONS.map((option) => (
              <div className="ck-settings-option" key={option.id}>
                <span className="ck-settings-icon">
                  {option.icon === "bell" ? <NotificationIcon /> : option.icon === "tag" ? <TagIcon /> : option.icon === "cook" ? <ShelterIcon /> : <InfoIcon />}
                </span>
                <div className="ck-settings-option-copy">
                  <strong>{option.title}</strong>
                  <p>{option.description}</p>
                </div>
                <button
                  className={`ck-settings-switch${enabled[option.id] ? " is-on" : ""}`}
                  type="button"
                  role="switch"
                  aria-checked={enabled[option.id]}
                  aria-label={option.title}
                  onClick={() => setEnabled((current) => ({ ...current, [option.id]: !current[option.id] }))}
                >
                  <span />
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="ck-settings-language">
          <div>
            <strong>Language</strong>
            <p>Choose your preferred language.</p>
          </div>
          <span className="ck-settings-icon"><GlobeIcon /></span>
          <label className="ck-settings-select">
            <span className="ck-visually-hidden">Preferred language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>English</option>
              <option>தமிழ்</option>
              <option>हिन्दी</option>
            </select>
            <ChevronIcon />
          </label>
        </section>
        <button className="ck-settings-privacy" type="button" onClick={() => navigate(PATHS.privacy)}>
          <span className="ck-settings-icon"><ShieldIcon /></span>
          <span><strong>Data and privacy</strong><small>Manage your data and privacy preferences.</small></span>
          <span className="ck-settings-arrow">›</span>
        </button>
      </section>
      <MobileAppSettings language={language} setLanguage={setLanguage} />
    </main>
  );
}

function MobileAppSettings({
  language,
  setLanguage,
}: {
  language: string;
  setLanguage: Dispatch<SetStateAction<string>>;
}) {
  return (
    <section className="ck-mobile-app-settings">
      <header className="ck-mobile-app-settings-header">
        <button type="button" aria-label="Back to profile" onClick={() => navigate(PATHS.profile)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <div className="ck-mobile-app-settings-title">
        <h1>App settings</h1>
        <p>Manage your app preferences</p>
      </div>

      <section className="ck-mobile-app-settings-group">
        <h2>Language</h2>
        <div className="ck-mobile-app-settings-card">
          <div className="ck-mobile-app-settings-row">
            <span className="ck-mobile-app-settings-icon"><GlobeIcon /></span>
            <span className="ck-mobile-app-settings-copy">
              <strong>App language</strong>
              <small>Choose your preferred language</small>
            </span>
            <label className="ck-mobile-app-language">
              <span className="ck-visually-hidden">App language</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option>English</option>
                <option>தமிழ்</option>
                <option>हिन्दी</option>
              </select>
              <ChevronIcon />
            </label>
          </div>
        </div>
      </section>

      <section className="ck-mobile-app-settings-group">
        <h2>Privacy</h2>
        <div className="ck-mobile-app-settings-card">
          <button className="ck-mobile-app-settings-row" type="button" onClick={() => navigate(PATHS.privacy)}>
            <span className="ck-mobile-app-settings-icon"><ShieldIcon /></span>
            <span className="ck-mobile-app-settings-copy">
              <strong>Privacy settings</strong>
              <small>Manage your data and privacy</small>
            </span>
            <span className="ck-mobile-app-settings-arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </section>

      <section className="ck-mobile-app-settings-group">
        <h2>Notifications</h2>
        <div className="ck-mobile-app-settings-card">
          <button className="ck-mobile-app-settings-row" type="button" onClick={() => navigate(PATHS.notifications)}>
            <span className="ck-mobile-app-settings-icon"><NotificationIcon /></span>
            <span className="ck-mobile-app-settings-copy">
              <strong>Notification settings</strong>
              <small>Manage what you want to be notified about</small>
            </span>
            <span className="ck-mobile-app-settings-arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </section>

      <section className="ck-mobile-app-settings-group">
        <h2>About</h2>
        <div className="ck-mobile-app-settings-card">
          <button className="ck-mobile-app-settings-row" type="button" onClick={() => navigate(PATHS.about)}>
            <span className="ck-mobile-app-settings-icon"><InfoIcon /></span>
            <span className="ck-mobile-app-settings-copy">
              <strong>App version</strong>
              <small>Current version of Aahaa</small>
            </span>
            <span className="ck-mobile-app-settings-value">v1.0.0</span>
            <span className="ck-mobile-app-settings-arrow" aria-hidden="true">›</span>
          </button>
          <button className="ck-mobile-app-settings-row" type="button" onClick={() => navigate(PATHS.terms)}>
            <span className="ck-mobile-app-settings-icon"><MenuIcon /></span>
            <span className="ck-mobile-app-settings-copy">
              <strong>Terms and policies</strong>
              <small>Terms of service, privacy policy and more</small>
            </span>
            <span className="ck-mobile-app-settings-arrow" aria-hidden="true">›</span>
          </button>
        </div>
      </section>
    </section>
  );
}

const SUPPORT_FAQS = [
  { question: "How can I track my order?", answer: "Open My Orders and select View details on an ongoing order to see its latest status." },
  { question: "Can I cancel my order?", answer: "If your order is still being prepared, open its details and contact support for help with cancellation." },
  { question: "What payment methods are accepted?", answer: "You can pay using UPI apps such as Google Pay, PhonePe and Paytm, or enter another UPI ID." },
  { question: "How do I contact a home cook?", answer: "Open your order details to find the pickup information and available order support options." },
];

function HelpSupportPage({
  bag,
  journey,
  stop,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
}) {
  const [query, setQuery] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactNotice, setContactNotice] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  const [mobileNotice, setMobileNotice] = useState("");
  const filteredFaqs = SUPPORT_FAQS.filter((faq) => `${faq.question} ${faq.answer}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <main className="ck-main ck-profile-main">
      <MobileOrderSupport
        bag={bag}
        journey={journey}
        stop={stop}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        notice={mobileNotice}
        setNotice={setMobileNotice}
      />
      <AccountSidebar active="support" />
      <section className="ck-profile-content ck-account-content">
        <header className="ck-profile-heading ck-support-heading">
          <h1>Help &amp; support</h1>
          <p>Find answers to your questions or get in touch with our support team.</p>
        </header>
        <label className="ck-support-search">
          <SearchIcon />
          <span className="ck-visually-hidden">Search help topics</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for help (e.g., orders, delivery, payments)" />
          <button type="button" onClick={() => setQuery((current) => current.trim())}>Search</button>
        </label>
        <div className="ck-support-body">
          <section className="ck-support-faqs">
            <header>
              <h2>Frequently asked questions</h2>
              <p>Here are some common questions from our users.</p>
            </header>
            <div className="ck-support-faq-list">
              {filteredFaqs.map((faq) => (
                <details key={faq.question}>
                  <summary>{faq.question}<ChevronIcon /></summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
              {filteredFaqs.length === 0 ? <p className="ck-support-no-results">No matching questions. Try another search.</p> : null}
            </div>
          </section>
          <aside className="ck-support-card">
            <div className="ck-support-card-intro">
              <span className="ck-settings-icon"><HeadsetIcon /></span>
              <span><strong>Still need help?</strong><small>Our support team is here to assist you.</small></span>
            </div>
            <button className="ck-support-contact" type="button" onClick={() => { setContactOpen((current) => !current); setContactNotice(false); }}>
              <NoteIcon />Contact support <span>›</span>
            </button>
            {contactOpen ? (
              <div className="ck-support-contact-panel" role="status">
                <p>Our support team is available from 9:00 AM to 9:00 PM, Monday to Sunday.</p>
                <button type="button" onClick={() => setContactNotice(true)}>Got it</button>
                {contactNotice ? <small>We’re here to help during support hours.</small> : null}
              </div>
            ) : null}
            <div className="ck-support-hours">
              <ClockIcon />
              <span><strong>Support hours</strong><small>9:00 AM – 9:00 PM (Mon – Sun)</small></span>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function MobileOrderSupport({
  bag,
  journey,
  stop,
  selectedTopic,
  setSelectedTopic,
  notice,
  setNotice,
}: {
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  selectedTopic: string;
  setSelectedTopic: (topic: string) => void;
  notice: string;
  setNotice: (notice: string) => void;
}) {
  const itemCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const date = journey.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const topics = [
    { title: "Track my order", detail: "Current status: Preparing order", icon: <PinIcon />, onClick: () => navigate(PATHS.trackOrder) },
    { title: "Pickup location or timing", detail: "Check or change pickup details", icon: <ClockIcon />, onClick: () => navigate(PATHS.confirmPickup) },
    { title: "Missing or incorrect item", detail: "Report missing or wrong items", icon: <BagIcon /> },
    { title: "Payment or refund", detail: "Get help with payment issues or refunds", icon: <CreditCardIcon /> },
    { title: "Cancel my order", detail: "Request to cancel this order", icon: <CloseCircleIcon /> },
    { title: "Other issue", detail: "Tell us more about your problem", icon: <HelpIcon /> },
  ];

  return (
    <section className="ck-mobile-order-support">
      <header className="ck-mobile-support-header">
        <button type="button" aria-label="Back to order summary" onClick={() => navigate(PATHS.orderSummary)}>
          <BackChevronIcon />
        </button>
        <span className="ck-wordmark">a<span className="ck-mark-aa">ahaa<SmileIcon /></span></span>
      </header>
      <div className="ck-mobile-support-title">
        <div><h1>Help &amp; Support</h1><h2>How can we help?</h2><p>We’re here to make your journey smoother.</p></div>
        <span><HeadsetIcon /></span>
      </div>
      <section className="ck-mobile-support-order">
        <div className="ck-mobile-support-kitchen">
          <img src={imgKitchenLakshmi} alt="" />
          <div>
            <strong>From Lakshmi’s Kitchen</strong>
            <small>Order ID: AAH20346389383-001</small>
            <small>{itemCount} items · {bag.map(({ meal, qty }) => `${meal.name} × ${qty}`).join(", ")}</small>
          </div>
        </div>
        <div className="ck-mobile-support-meta">
          <span><PinIcon /><small>Pickup point</small><strong>{stop.name}</strong></span>
          <span><CalendarIcon /><small>{date}</small><strong>{journey.date.toLocaleDateString("en", { weekday: "long" })}</strong></span>
          <span><ClockIcon /><small>Pickup time</small><strong>{stop.time}</strong></span>
        </div>
      </section>
      <div className="ck-mobile-support-topics">
        {topics.map((topic) => (
          <button
            type="button"
            key={topic.title}
            aria-pressed={selectedTopic === topic.title}
            onClick={() => {
              setSelectedTopic(topic.title);
              setNotice(topic.onClick ? "" : `We’ll help you with: ${topic.title}.`);
              topic.onClick?.();
            }}
          >
            <span className="ck-mobile-support-topic-icon">{topic.icon}</span>
            <span><strong>{topic.title}</strong><small>{topic.detail}</small></span>
            <PaymentChevronIcon />
          </button>
        ))}
      </div>
      <div className="ck-mobile-support-contact">
        <button type="button" onClick={() => setNotice("Aahaa Support chat is ready to help with your order.")}>
          <ChatBubbleIcon />Chat with Aahaa Support<PaymentChevronIcon />
        </button>
        <button type="button" onClick={() => setNotice("Please keep your order ID handy when contacting support.")}>
          <PhoneIcon />Call support<PaymentChevronIcon />
        </button>
      </div>
      {notice ? <p className="ck-mobile-support-notice" role="status">{notice}</p> : null}
      <p className="ck-mobile-support-footnote"><HelpIcon /> Please keep your order ID handy.</p>
    </section>
  );
}

function AboutAahaaPage() {
  const features = [
    { title: "Home-cooked meals", description: "Fresh and tasty meals made with care.", icon: <HomeNavIcon /> },
    { title: "Along your route", description: "Find home cooks at your pickup stops.", icon: <PinIcon /> },
    { title: "Variety of options", description: "Choose from a wide range of homemade meals.", icon: <LeafIcon /> },
    { title: "Support local home cooks", description: "Helping home cooks and small kitchens grow.", icon: <PeopleIcon /> },
  ];

  return (
    <main className="ck-main ck-profile-main">
      <AccountSidebar active="about" />
      <section className="ck-profile-content ck-account-content ck-about-content">
        <header className="ck-profile-heading">
          <h1>About Aahaa</h1>
          <p>A little home, along the way.</p>
        </header>
        <section className="ck-about-hero">
          <div className="ck-about-hero-copy">
            <strong className="ck-about-wordmark">aahaa<span aria-hidden="true">⌣</span></strong>
            <h2>Home-cooked meals<br />for your journey.</h2>
            <p>Aahaa connects travellers with home cooks along the way, so you can enjoy fresh, tasty and homemade meals at your selected pickup stops.</p>
          </div>
          <img src={a.imgImage59} alt="A home cook preparing a fresh meal" />
        </section>
        <section className="ck-about-mission">
          <h2>Our mission</h2>
          <p>To make every journey better by providing easy access to<br className="ck-about-desktop-break" /> healthy, home-cooked meals from local home cooks.</p>
        </section>
        <section className="ck-about-features">
          <h2>What makes aahaa special</h2>
          <div>
            {features.map((feature) => (
              <article key={feature.title}>
                <span>{feature.icon}</span>
                <strong>{feature.title}</strong>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="ck-about-vision">
          <div>
            <h2>Our vision</h2>
            <p>To become the most trusted platform for homemade meals for every traveller across India.</p>
          </div>
          <img src={a.imgAahaaMealBoxWithCurryTray1} alt="" />
        </section>
      </section>
    </main>
  );
}

type LinkedPhone = { number: string; label: string };

function LogoutPage() {
  const [phones, setPhones] = useState<LinkedPhone[]>([
    { number: "+91 98765 43210", label: "Primary number" },
    { number: "+91 91234 56789", label: "Secondary number" },
  ]);
  const [addingPhone, setAddingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  function addPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = newPhone.trim();
    const digits = number.replace(/\D/g, "");
    if (!/^\+?[0-9 ]{8,20}$/.test(number) || digits.length < 8 || digits.length > 15) {
      setPhoneError("Enter a valid phone number with 8 to 15 digits.");
      return;
    }
    setPhones((current) => [...current, { number, label: "Secondary number" }]);
    setNewPhone("");
    setPhoneError("");
    setAddingPhone(false);
  }

  return (
    <main className="ck-main ck-profile-main">
      <AccountSidebar active="logout" />
      <section className="ck-profile-content ck-account-content ck-logout-content">
        <header className="ck-profile-heading">
          <h1>Log out</h1>
          <p>Manage your account and devices.</p>
        </header>
        <section className="ck-logout-account-card">
          <div className="ck-logout-account-person">
            <span className="ck-logout-avatar"><ProfileIcon /></span>
            <span><strong>Saran G</strong><small>+91 98765 43210</small></span>
          </div>
          <div className="ck-logout-linked">
            <h2>Linked phones</h2>
            <p>Manage the phone numbers linked to your aahaa account.</p>
            <div className="ck-logout-phone-list">
              {phones.map((phone, index) => (
                <div className="ck-logout-phone" key={phone.number}>
                  <span className="ck-logout-phone-icon"><PhoneIcon /></span>
                  <span className="ck-logout-phone-copy"><strong>{phone.number}</strong><small>{index === 0 ? "Primary number" : phone.label}</small></span>
                  {index === 0 ? (
                    <span className="ck-logout-current">Current</span>
                  ) : (
                    <button className="ck-logout-remove" type="button" onClick={() => setPhones((current) => current.filter((_, phoneIndex) => phoneIndex !== index))}>
                      <TrashIcon />Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            {addingPhone ? (
              <form className="ck-logout-add-form" onSubmit={addPhone}>
                <label htmlFor="ck-new-linked-phone">Phone number</label>
                <div>
                  <input
                    id="ck-new-linked-phone"
                    type="tel"
                    autoComplete="tel"
                    pattern="[+0-9 ]{8,20}"
                    value={newPhone}
                    onChange={(event) => { setNewPhone(event.target.value); setPhoneError(""); }}
                    required
                    placeholder="+91 98765 43210"
                    aria-invalid={Boolean(phoneError)}
                    aria-describedby={phoneError ? "ck-new-linked-phone-error" : undefined}
                  />
                  <button type="submit">Add number</button>
                  <button type="button" onClick={() => { setAddingPhone(false); setNewPhone(""); setPhoneError(""); }}>Cancel</button>
                </div>
                {phoneError ? <small id="ck-new-linked-phone-error" role="alert">{phoneError}</small> : null}
              </form>
            ) : (
              <button className="ck-logout-add-phone" type="button" onClick={() => setAddingPhone(true)}>
                <span>+</span>Add another number
              </button>
            )}
          </div>
        </section>
        <section className="ck-logout-action-card">
          <span className="ck-settings-icon"><LogoutIcon /></span>
          <span><strong>Log out</strong><small>You will be signed out from this device. Your account and saved data<br className="ck-about-desktop-break" /> will remain safe.</small></span>
          <button type="button" onClick={() => navigate(PATHS.home)}>Log out</button>
        </section>
      </section>
    </main>
  );
}

function NotificationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.8 12h16.4M12 3.5c2.2 2.4 3.2 5.2 3.2 8.5s-1 6.1-3.2 8.5c-2.2-2.4-3.2-5.2-3.2-8.5s1-6.1 3.2-8.5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m9.5 3 .5 2a7 7 0 0 1 4 0l.5-2 2.4 1-.7 2a7 7 0 0 1 2.8 2.8l2-.7 1 2.4-2 .5a7 7 0 0 1 0 4l2 .5-1 2.4-2-.7a7 7 0 0 1-2.8 2.8l.7 2-2.4 1-.5-2a7 7 0 0 1-4 0l-.5 2-2.4-1 .7-2A7 7 0 0 1 5 16l-2 .7-1-2.4 2-.5a7 7 0 0 1 0-4l-2-.5 1-2.4 2 .7a7 7 0 0 1 2.8-2.8l-.7-2L9.5 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5m0-8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5m5-4 4-4-4-4m4 4H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 6h3l1.2-2h5.6L14 6h3v10H3V6Z" fill="currentColor" />
      <circle cx="10" cy="10.5" r="2.8" fill="#fff" />
      <circle cx="10" cy="10.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m4 6 7 6 7-6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12.2 12.2 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 16s5.5-4.6 5.5-8.4A5.5 5.5 0 0 0 3.5 7.6C3.5 11.4 9 16 9 16Z" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="9" cy="7.4" r="1.7" fill="currentColor" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5.2 2.8h2.1l1 3-1.6 1.5a11 11 0 0 0 4 4l1.5-1.6 3 1v2.1c0 1-.8 1.8-1.8 1.8A11.4 11.4 0 0 1 3.4 4.6c0-1 .8-1.8 1.8-1.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2.5v8m0 0 3-3m-3 3-3-3M3.5 12.5v2h11v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BannerPinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11 19.6s6.4-5.3 6.4-10.1A6.4 6.4 0 0 0 4.6 9.5C4.6 14.3 11 19.6 11 19.6Zm0-7.2a2.9 2.9 0 1 0 0-5.8 2.9 2.9 0 0 0 0 5.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CaretIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M4.1 2.2 9.2 6 4.1 9.8Z" fill="currentColor" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 5h1.4l1.2 9h9.6l1.6-6.4H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="9.2" cy="17.2" r="1.1" fill="currentColor" />
      <circle cx="15.4" cy="17.2" r="1.1" fill="currentColor" />
    </svg>
  );
}

function BusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="16" height="10" rx="2.5" stroke="#ff4b2b" strokeWidth="1.4" />
      <path d="M3 11h16M7 15.5v1.5M15 15.5v1.5" stroke="#ff4b2b" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2.5" y="4" width="13" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2.5 7.5h13M6 2.5v3M12 2.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 5.8V9l2.4 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BarClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="11" fill="#ff4b2b" />
      <path d="M14 8.5V14.2l4 2.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M12.4 3.6 18.4 9.6 8.2 19.8H2.2V13.8Z" fill="#f0c14b" stroke="#e24a1a" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M12.4 3.6 18.4 9.6" stroke="#fff" strokeWidth="1.2" />
      <path d="M2.2 19.8 5.4 16.6" stroke="#e24a1a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M3.5 5.2 7 8.8l3.5-3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M3 10h18M7 15h3" />
    </svg>
  );
}

function BankOutlineIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m3 9 9-6 9 6M5 10h14M6 10v9m4-9v9m4-9v9m4-9v9M3 21h18" />
    </svg>
  );
}

function PaymentChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m6 3 5 5-5 5" />
    </svg>
  );
}

function CloseCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6m0-6-6 6" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
      <path d="M8 11h.01M12 11h.01M16 11h.01" />
    </svg>
  );
}

function ViewMenuArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.2 8h10.4M9.2 4.2 13.4 8 9.2 11.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="14.4" cy="7.2" r="2.2" fill="currentColor" />
      <path d="M10.8 16.8c.3-2.6 1.8-4 3.6-4s3.3 1.4 3.6 4" fill="currentColor" />
      <circle cx="8.2" cy="6.6" r="2.7" fill="currentColor" />
      <path d="M3.2 16.8c.5-3.4 2.4-5.2 5-5.2s4.5 1.8 5 5.2" fill="currentColor" />
    </svg>
  );
}

function LeafIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.2 3.1C8.8 3.2 4.2 6.7 4 12c5 .3 9-4 9.2-8.9Z" fill="currentColor" />
      <path d="M6.1 9.6c1.3-1.2 3.1-2.6 5.1-4.1" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function StatLeafIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M18.2 4.2C12.2 4.4 5.8 9.2 5.6 16.4c6.8.4 12.4-5.4 12.6-12.2Z" fill="currentColor" />
      <path d="M8.4 13.2c1.8-1.6 4.2-3.6 7-5.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="3.4" y="9.2" width="15.2" height="8.8" rx="1.6" fill="currentColor" />
      <path d="M3.4 12.4h15.2M11 9.2v8.8" stroke="#fff" strokeWidth="1.5" />
      <path d="M6.6 6.2c1-.9 2.7-.4 3.4 1.1.7-1.5 2.4-2 3.4-1.1.7.7.3 2-1.1 3H7.7C6.3 8.2 5.9 6.9 6.6 6.2Z" fill="currentColor" />
    </svg>
  );
}

function TiffinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="10" height="8" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 5V3.8A2.5 2.5 0 0 1 10.5 3.8V5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.8 8.6 7.4 13.2a1.2 1.2 0 0 0 1.7 0l4.1-4.1V2.8H8.9L4.8 6.9a1.2 1.2 0 0 0 0 1.7Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="10.2" cy="5.2" r="0.8" fill="currentColor" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="4" y="3" width="10" height="12" rx="1.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 7h5M6.5 9.5h5M6.5 12h3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function StepCookIcon() {
  return (
    <svg className="ck-step-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="18.2" cy="8.6" r="2.7" fill="currentColor" />
      <path d="M13.6 20.6c.35-3.1 2.1-4.8 4.6-4.8 2.5 0 4.25 1.7 4.6 4.8" fill="currentColor" />
      <circle cx="10" cy="8" r="3.35" fill="currentColor" />
      <path d="M3.6 20.6c.5-4.05 2.85-6.15 6.4-6.15 3.55 0 5.9 2.1 6.4 6.15" fill="currentColor" />
    </svg>
  );
}

function StepMenuIcon() {
  return (
    <svg className="ck-step-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M8 3.8h8.6L21 8.4v15.8H8V3.8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M16.5 3.8v4.8H21" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11.2 13.4h6.6M11.2 17h6.6M11.2 20.6h4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function StepStopIcon() {
  return (
    <svg className="ck-step-icon" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4.6 12.4 7 6.4h14l2.4 6V22.8H4.6V12.4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4.6 12.4h18.8" stroke="currentColor" strokeWidth="2" />
      <path d="M7.2 9.4h2.4M11.4 9.4h2.4M15.6 9.4h2.4M19.8 9.4h1.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 22.8v-5.6h4v5.6" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StepArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 9h11.2M10.6 5.2 14.4 9l-3.8 3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M3.2 9.2 5.4 4.8h11.2l2.2 4.4v8.2H3.2V9.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M3.2 9.2h15.6M8.4 17.4v-4.2h5.2v4.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.2 7.1a1.8 1.8 0 1 1 2.5 1.7c-.5.3-.9.7-.9 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="13.1" r="0.7" fill="currentColor" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 1.8 8.5 5h3.4L9.7 7.2 11 10.4 7 8.5 3 10.4l1.3-3.2L2.1 5h3.4L7 1.8Z" fill="#f5a524" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" fill="#e53935" />
      <path d="M8 4.4v4.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="11.2" r="0.9" fill="#fff" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M4.2 4.6h6.4c1.2 0 2.2.9 2.2 2.1v10.1H6.3A2.1 2.1 0 0 1 4.2 14.7V4.6Z"
        stroke="#ff4b2b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M17.8 4.6h-6.4c-1.2 0-2.2.9-2.2 2.1v10.1h6.5a2.1 2.1 0 0 0 2.1-2.1V4.6Z"
        stroke="#ff4b2b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11 6.8v10" stroke="#ff4b2b" strokeWidth="1.5" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.2 6.2h9.6l-.7 8.1H4.9L4.2 6.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.4 6.2V4.8A2.6 2.6 0 0 1 11.6 4.8v1.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h9M6 4.5V3h4v1.5m1.7 0-.5 8H4.8l-.5-8M6.6 7v3.5m2.8-3.5v3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 4.5h14v10H8l-4.5 3v-13Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6 8h8M6 11h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2.5 16 5v4.4c0 3.8-2.4 6.3-6 8.1-3.6-1.8-6-4.3-6-8.1V5l6-2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m7.5 9.8 1.7 1.7 3.4-3.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg width="27" height="27" viewBox="0 0 27 27" fill="none" aria-hidden="true">
      <path d="M3 3h8v8H3zM16 3h8v8h-8zM3 16h8v8H3z" stroke="currentColor" strokeWidth="2" />
      <path d="M6 6h2v2H6zM19 6h2v2h-2zM6 19h2v2H6zM16 16h3v3h-3zM22 16v3h-3M22 22h2M16 22v2M22 19v3" fill="currentColor" />
    </svg>
  );
}

function HeadsetIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M4.5 15v-2a9.5 9.5 0 0 1 19 0v2M4.5 14.5H8v7H6a1.5 1.5 0 0 1-1.5-1.5v-5.5ZM23.5 14.5H20v7h2a1.5 1.5 0 0 0 1.5-1.5v-5.5ZM20 21c-1 2-3 3-6 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="m4 9.2 3.2 3.1L14 5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="m9 2.5 6 3.2v6.6l-6 3.2-6-3.2V5.7l6-3.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m3.3 5.8 5.7 3 5.7-3M9 8.8v6.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function DeliveryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 4.5h9v8H2zM11 7h3l2 2.2v3.3h-5V7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="5" cy="13.5" r="1.5" fill="currentColor" />
      <circle cx="13.5" cy="13.5" r="1.5" fill="currentColor" />
    </svg>
  );
}
