import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
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
import "./styles/cook.css";

type CookFilter = "all" | "meals-snacks" | "snacks" | "veg" | "nonveg";
type CookSort = "default" | "price-asc" | "price-desc";
type MenuTab = "all" | MealCategory;
type JourneyPanel = "from" | "to" | "pickup" | "date" | "time" | null;
type BagLine = { meal: Meal; qty: number };

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
  const returnTo = useRef(PATHS.cooks);
  const editing = path === PATHS.editJourney;
  const mealDetail = path === PATHS.lemonRice;
  const onMenu = path === PATHS.lakshmiMenu || mealDetail;

  useEffect(() => {
    if (path === PATHS.cooks || path === PATHS.lakshmiMenu) returnTo.current = path;
  }, [path]);

  const pageClass = mealDetail
    ? "ck-page ck-page--menu ck-page--meal"
    : path === PATHS.lakshmiMenu
      ? "ck-page ck-page--menu"
      : path === PATHS.editJourney
        ? "ck-page ck-page--edit"
        : "ck-page";

  return (
    <div className={pageClass}>
      <CookHeader
        bagCount={onMenu ? bagCount : 0}
        showBack={onMenu}
        listingCart={path === PATHS.cooks}
        backTo={mealDetail ? PATHS.lakshmiMenu : PATHS.cooks}
      />
      {editing ? <div className="ck-edit-hairline" /> : null}
      {editing ? (
        <EditJourney journey={journey} setJourney={setJourney} returnTo={returnTo.current} />
      ) : (
        <>
          <JourneyBar journey={journey} setJourney={setJourney} panel={journeyPanel} setPanel={setJourneyPanel} />
          {mealDetail ? (
            <LemonRiceDetail
              bag={bag}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
            />
          ) : path === PATHS.lakshmiMenu ? (
            <LakshmiMenu bag={bag} addMeal={addMeal} setQty={setQty} journey={journey} stop={stop} />
          ) : (
            <CookListing journey={journey} stop={stop} onChangeStop={() => setJourneyPanel("pickup")} />
          )}
        </>
      )}
      <CookFooter />
      {path === PATHS.cooks ? <MobileTabBar /> : null}
    </div>
  );
}

function CookHeader({
  bagCount,
  showBack = false,
  listingCart = false,
  backTo = PATHS.cooks,
}: {
  bagCount: number;
  showBack?: boolean;
  listingCart?: boolean;
  backTo?: string;
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
        <span
          className={listingCart ? "ck-cart ck-cart--mobile-only" : "ck-cart"}
          aria-label={bagCount > 0 ? `${bagCount} items in meal bag` : "Meal bag"}
        >
          <CartIcon />
          {bagCount > 0 ? <em>{bagCount}</em> : null}
        </span>
        <span className="ck-avatar" aria-hidden="true">
          <ProfileIcon />
        </span>
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
}: {
  bag: BagLine[];
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
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
            <label className="ck-search">
              <SearchIcon />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search this kitchen’s menu" />
            </label>
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
            <button className="ck-continue" type="button" disabled={bag.length === 0}>
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
        <button className="ck-m-cartbar-go" type="button" disabled={bag.length === 0} aria-label="Continue">
          <ArrowIcon />
        </button>
      </div>
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

function MobileTabBar() {
  return (
    <nav className="ck-m-nav" aria-label="Primary">
      <button type="button" className="is-on">
        <HomeNavIcon />
        Home
      </button>
      <button type="button">
        <OrdersNavIcon />
        My Orders
      </button>
      <button type="button">
        <TrackNavIcon />
        Track Journey
      </button>
      <button type="button">
        <ProfileNavIcon />
        Profile
      </button>
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
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 3.5v2.2M11 16.3v2.2M3.5 11h2.2M16.3 11h2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.3" strokeDasharray="2.5 2.5" />
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

function SwapIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M4 3H11M11 3 9 1M11 3 9 5M10 11H3M3 11 5 9M3 11 5 13" stroke="#ff4b2b" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
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
