import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import * as a from "./assets/landing";
import "./styles/landing.css";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollToLandingSection(section: "why" | "how") {
  const useDesktop = window.matchMedia("(min-width: 768px)").matches;
  const target = useDesktop
    ? document.getElementById(section)
    : document.querySelector<HTMLElement>(`.lp-mobile [data-section="${section}"]`);
  target?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

function onSectionNav(event: MouseEvent<HTMLAnchorElement>, section: "why" | "how") {
  event.preventDefault();
  scrollToLandingSection(section);
}

const faqs = [
  {
    q: "Does Aahaa arrange a stop for my bus?",
    a: "No. Choose a supported pickup point where your bus already stops, and confirm the stop with your bus operator.",
  },
  { q: "What if my bus is delayed?", a: null },
  { q: "How do I find my delivery partner?", a: null },
  { q: "Can I change my pickup point?", a: null },
  { q: "Can I cancel my order or request a refund?", a: null },
  { q: "How can I track my food delivery order?", a: null },
];

const FROM_CITIES = [
  { name: "Bengalure", region: "Karnataka" },
  { name: "Hyderabad", region: "Telangana" },
  { name: "Chennai", region: "Tamil Nadu" },
  { name: "Kochi", region: "Kerala" },
  { name: "Coimbatore", region: "Tamil Nadu" },
] as const;

const TO_CITIES = [
  { name: "Salem", region: "Tamil Nadu" },
  { name: "Hyderabad", region: "Telangana" },
  { name: "Chennai", region: "Tamil Nadu" },
  { name: "Kochi", region: "Kerala" },
  { name: "Coimbatore", region: "Tamil Nadu" },
] as const;

const PICKUP_STOPS = [
  { name: "Housr", time: "(1:30)", kind: "Bus stand" },
  { name: "Krishnagiri", time: "(2:30)", kind: "Bus stand" },
  { name: "Vellore", time: "(4:30)", kind: "Bus stand" },
] as const;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type JourneyPanel = "from" | "to" | "pickup" | "date" | null;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatBarDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}-${MONTHS_SHORT[date.getMonth()]}-${date.getFullYear()}`;
}

function formatSelectedDate(date: Date) {
  return `Selected : ${WEEKDAYS[date.getDay()]} , ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function monthCells(year: number, month: number) {
  const weekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array<number | null>(weekday).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
}

function isFromSelected(fromCity: string, name: string) {
  return fromCity === name || (fromCity === "Bangalore" && name === "Bengalure");
}

function useJourneySearch() {
  const [panel, setPanel] = useState<JourneyPanel>(null);
  const [fromCity, setFromCity] = useState("Bangalore");
  const [toCity, setToCity] = useState("Chennai");
  const [pickup, setPickup] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date(2026, 9, 9));
  const [query, setQuery] = useState("");
  const [draftFrom, setDraftFrom] = useState("Bangalore");
  const [draftTo, setDraftTo] = useState("Chennai");
  const [draftPickup, setDraftPickup] = useState<string | null>(null);
  const [draftDate, setDraftDate] = useState(() => new Date(2026, 9, 9));
  const [viewMonth, setViewMonth] = useState(() => new Date(2026, 9, 1));

  function open(next: Exclude<JourneyPanel, null>) {
    setDraftFrom(fromCity);
    setDraftTo(toCity);
    setDraftPickup(pickup);
    setDraftDate(date);
    setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setQuery("");
    setPanel(next);
  }

  function close() {
    setPanel(null);
    setQuery("");
  }

  useEffect(() => {
    if (!panel) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel]);

  return {
    panel,
    open,
    close,
    fromCity,
    toCity,
    pickup,
    date,
    query,
    setQuery,
    draftFrom,
    setDraftFrom,
    draftTo,
    setDraftTo,
    draftPickup,
    setDraftPickup,
    draftDate,
    setDraftDate,
    viewMonth,
    setViewMonth,
    saveFrom: () => {
      setFromCity(draftFrom);
      close();
    },
    saveTo: () => {
      setToCity(draftTo);
      close();
    },
    savePickup: () => {
      setPickup(draftPickup);
      close();
    },
    saveDate: () => {
      setDate(startOfDay(draftDate));
      close();
    },
  };
}

type JourneySearch = ReturnType<typeof useJourneySearch>;

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const journey = useJourneySearch();

  return (
    <div className="lp-root">
      <div className="lp-scale">
        <DesktopLanding openFaq={openFaq} setOpenFaq={setOpenFaq} journey={journey} />
      </div>
      <MobileLanding openFaq={openFaq} setOpenFaq={setOpenFaq} journey={journey} />
      <JourneyOverlay journey={journey} />
    </div>
  );
}

function LaceStoryCard() {
  return (
    <div className="lp-lace-story">
      <div className="lp-abs" style={{ left: 43, top: 84, width: 605 }}>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 500, letterSpacing: 4, color: "#290600", lineHeight: 1.09 }}>AAHAA / FOOD FOR THE JOURNEY</p>
        <h2 style={{ margin: "24px 0 0", fontSize: 72, fontWeight: 600, color: "#421406", lineHeight: 1.09 }}>
          A little home,
          <br />
          wherever
          <br />
          you go.
        </h2>
        <p style={{ margin: "40px 0 0", fontSize: 20, fontWeight: 300, color: "#002400", lineHeight: 1.6, maxWidth: 454 }}>
          Long journeys take you to new places.
          <br />
          A familiar meal brings you a little closer to home
        </p>
        <div style={{ position: "relative", width: 200, height: 19, margin: "40px 0 0 45px", overflow: "hidden" }}>
          <img src={a.imgMinimalistOrangeFloralDivider1} alt="" style={{ position: "absolute", left: "-0.29%", top: "-131.25%", width: "100.58%", height: "362.5%", maxWidth: "none" }} />
        </div>
        <p style={{ margin: "24px 0 0", fontSize: 20, fontWeight: 300, color: "#002400", lineHeight: 1.6, maxWidth: 454 }}>
          Aahaa brings together local home cooks and travellers, with comforting meals and simple snacks available for pickup along the way.
        </p>
        <p style={{ margin: "40px 0 0", fontSize: 24, fontWeight: 500, color: "#ff4b2b", lineHeight: 1.75, display: "flex", alignItems: "center", gap: 14 }}>
          Our story
          <img src={a.imgArrow4} width={20} height={15} alt="" />
        </p>
      </div>
      <div className="lp-abs" style={{ left: 680, top: 54, width: 507, height: 650, background: "#fdd39a", border: "2px solid #ff4b2b", boxSizing: "border-box" }} />
      <div className="lp-abs" style={{ left: 686, top: 60, width: 495, height: 638, border: "2px solid #ff4b2b", boxSizing: "border-box", pointerEvents: "none" }} />
      <img className="lp-abs" src={a.imgBrightOrangeAbstractPetalEmblem1} alt="" style={{ left: 692, top: 67, width: 28, height: 28 }} />
      <img className="lp-abs" src={a.imgBrightOrangeAbstractPetalEmblem1} alt="" style={{ left: 1138, top: 655, width: 32, height: 32, transform: "rotate(180deg)" }} />
      <div className="lp-abs" style={{ left: 866, top: 42, width: 135, height: 125 }}>
        <div style={{ position: "absolute", left: 4, top: 0, width: 125, height: 125, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 89, height: 89, transform: "rotate(50.18deg)", position: "relative" }}>
            <img src={a.imgEllipse1712} alt="" style={{ position: "absolute", left: "51.25%", top: "41.74%", width: 44, height: 52 }} />
          </div>
        </div>
        <span style={{ position: "absolute", left: 0, top: 34, width: 135, fontFamily: '"Baloo 2", "Plus Jakarta Sans", sans-serif', fontWeight: 600, fontSize: 51, lineHeight: 1.09, color: "#fd451a", textAlign: "center" }}>aahaa</span>
      </div>
      <div className="lp-abs" style={{ left: 870, top: 226, width: 125, height: 12, overflow: "hidden" }}>
        <img src={a.imgMinimalistOrangeFloralDivider1} alt="" style={{ position: "absolute", left: "-0.29%", top: "-131.25%", width: "100.58%", height: "362.5%", maxWidth: "none" }} />
      </div>
      <p className="lp-abs" style={{ left: 809, top: 171, margin: 0, fontSize: 24, fontWeight: 500, color: "#421406", lineHeight: 1.09 }}>Made for your journey</p>
      <img className="lp-abs" src={a.imgSteamingRusticRiceBowlSticker1} alt="" style={{ left: 707, top: 224, width: 103, height: 95 }} />
      <p className="lp-abs" style={{ left: 839, top: 267, margin: 0, fontSize: 20, fontWeight: 500, color: "#421406", lineHeight: 1.09 }}>Familiar flavours</p>
      <div className="lp-abs" style={{ left: 709, top: 329, width: 448, height: 0, borderTop: "1px dotted #c48a58" }} />
      <img className="lp-abs" src={a.imgDecoratedTerracottaPotWithLid1} alt="" style={{ left: 712, top: 338, width: 94, height: 85 }} />
      <p className="lp-abs" style={{ left: 839, top: 369, margin: 0, fontSize: 20, fontWeight: 500, color: "#421406", lineHeight: 1.09 }}>Prepared by home cooks</p>
      <div className="lp-abs" style={{ left: 709, top: 432, width: 448, height: 0, borderTop: "1px dotted #c48a58" }} />
      <img className="lp-abs" src={a.imgKraftPaperGiftBoxWithGreenBow1} alt="" style={{ left: 707, top: 441, width: 109, height: 73 }} />
      <p className="lp-abs" style={{ left: 839, top: 466, margin: 0, fontSize: 20, fontWeight: 500, color: "#421406", lineHeight: 1.09 }}>Thoughtfully packed</p>
      <div className="lp-abs" style={{ left: 709, top: 525, width: 448, height: 0, borderTop: "1px dotted #c48a58" }} />
      <img className="lp-abs" src={a.imgOliveGreenLeatherTrimmedTravelDuffel1} alt="" style={{ left: 704, top: 535, width: 106, height: 68 }} />
      <p className="lp-abs" style={{ left: 839, top: 558, margin: 0, fontSize: 20, fontWeight: 500, color: "#421406", lineHeight: 1.09 }}>A little comfort on the road</p>
      <div className="lp-abs" style={{ left: 1144, top: 37, width: 253, height: 189, transform: "rotate(4.49deg)" }}>
        <div style={{ width: 240, height: 171, background: "#fef5dd", border: "1px solid #632508", overflow: "hidden", padding: 7, boxSizing: "border-box" }}>
          <div style={{ width: "100%", height: "100%", border: "1px solid #813206", overflow: "hidden" }}>
            <img src={a.imgImage59} alt="" style={{ width: "103%", height: "100%", objectFit: "cover", display: "block" }} />
          </div>
        </div>
      </div>
      <img className="lp-abs" src={a.imgTiffinFeastAndTravelEssentials1} alt="" style={{ left: 607, top: 581, width: 396, height: 198 }} />
    </div>
  );
}

function Wordmark({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "lp-wordmark lp-wordmark--large" : "lp-wordmark"}>
      <div className="lp-wordmark-seal">
        <div className="lp-wordmark-circle">
          <img src={large ? a.imgEllipse1713 : a.imgEllipse1712} alt="" />
        </div>
      </div>
      <span>aahaa</span>
    </div>
  );
}

function FaqItemBody({ open, question }: { open: boolean; question: string }) {
  return (
    <>
      <div className="lp-faq-head">
        <h3>{question}</h3>
        {open ? <img src={a.imgLine9} width={21} height={3} alt="" /> : <img src={a.imgAkarIconsPlus} width={30} height={30} alt="" />}
      </div>
    </>
  );
}

function FaqList({
  openFaq,
  setOpenFaq,
}: {
  openFaq: number;
  setOpenFaq: (index: number) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {faqs.map((item, index) => {
        const interactive = Boolean(item.a);
        const open = openFaq === index && interactive;
        const body: ReactNode = (
          <>
            <FaqItemBody open={open} question={item.q} />
            {open && item.a ? <p>{item.a}</p> : null}
          </>
        );

        if (!interactive) {
          return (
            <div key={item.q} className="lp-faq-item lp-faq-item--static">
              {body}
            </div>
          );
        }

        return (
          <button
            key={item.q}
            type="button"
            className={open ? "lp-faq-item open" : "lp-faq-item"}
            aria-expanded={open}
            onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

function DesktopLanding({
  openFaq,
  setOpenFaq,
  journey,
}: {
  openFaq: number;
  setOpenFaq: (index: number) => void;
  journey: JourneySearch;
}) {
  const laceRef = useRef<HTMLDivElement>(null);
  const pairRef = useRef<HTMLDivElement>(null);
  const travellerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const lace = laceRef.current;
    const pair = pairRef.current;
    const desk = lace?.closest(".lp-desktop");
    if (!lace || !pair || !(desk instanceof HTMLElement)) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const traveller = travellerRef.current;
    let frame = 0;
    let started = false;
    let lastY = window.scrollY;
    let scrollDir = 0;
    const pinSpan = 360;

    let trip: Animation | null = null;
    const tripFrames: Keyframe[] = [
      { "--lp-lace-x": "0px", "--lp-bus-exit": "0", offset: 0 },
      { "--lp-lace-x": "2246px", "--lp-bus-exit": "0", offset: 0.7 },
      { "--lp-lace-x": "2246px", "--lp-bus-exit": "1", offset: 1 },
    ];

    const begin = () => {
      if (started || motion.matches) return;
      started = true;
      trip?.cancel();
      trip = pair.animate(tripFrames, { duration: 17000, easing: "linear", fill: "both" });
    };

    const apply = () => {
      frame = 0;
      if (motion.matches) {
        trip?.cancel();
        trip = null;
        started = false;
      }
      const view = traveller?.getBoundingClientRect();
      const inView = !!(view && view.width > 0 && view.top < window.innerHeight && view.bottom > 0);
      if (inView) begin();

      if (scrollDir < 0 && trip && trip.playState === "finished" && (trip.currentTime ?? 0) > 0) {
        trip.cancel();
        started = false;
        begin();
      }
      scrollDir = 0;

      const bounds = lace.getBoundingClientRect();
      if (bounds.width === 0) return;

      let pinY = 0;
      if (!motion.matches) {
        const startAt = window.innerHeight - bounds.height;
        pinY = Math.min(pinSpan, Math.max(0, startAt - bounds.top));
      }
      desk.style.setProperty("--lp-pin-y", `${pinY}px`);
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y < lastY - 2) scrollDir = -1;
      else if (y > lastY + 2) scrollDir = 1;
      lastY = y;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const observer = traveller
      ? new IntersectionObserver(
          (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) begin();
          },
          { threshold: 0 },
        )
      : null;
    if (traveller && observer) observer.observe(traveller);

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    motion.addEventListener("change", apply);
    return () => {
      observer?.disconnect();
      trip?.cancel();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      motion.removeEventListener("change", apply);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main className="lp-desktop">
      <div className="lp-abs" style={{ left: 0, top: 0, width: 1440, height: 821, overflow: "hidden" }}>
        <img src={a.imgImage98} alt="" style={{ width: "100.03%", height: "103.53%", display: "block" }} />
      </div>

      <header className="lp-abs" style={{ left: 40, top: 10, width: 1360, height: 84, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Wordmark />
        <nav className="lp-nav">
          <a href="#why" onClick={(event) => onSectionNav(event, "why")}>
            Why aahaa
          </a>
          <a className="lp-active" href="#how" onClick={(event) => onSectionNav(event, "how")}>
            How its works
          </a>
          <button className="lp-login" type="button" aria-disabled="true">
            Log in
          </button>
        </nav>
      </header>

      <div className="lp-abs" style={{ left: "50%", top: 149, transform: "translateX(-50%)", textAlign: "center" }}>
        <p className="lp-eyebrow">FROM HOME KICTHENS , WITH LOVE</p>
        <h1 className="lp-hero-title" style={{ marginTop: 20 }}>
          A taste of home.
          <br />
          <em>For the road ahead.</em>
        </h1>
      </div>

      <img className="lp-abs lp-motion-bus-hero" src={a.imgRetroOrangeCreamBusSticker1} alt="" style={{ left: 73, top: 331, width: 102, height: 51 }} />
      <img className="lp-abs lp-motion-scooter" src={a.imgCuteCourierOnAMintScooter1} alt="" style={{ left: 545, top: 328, width: 79, height: 52 }} />

      <div className="lp-abs" style={{ left: 60, top: 378 }}>
        <div className="lp-journey">
          <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "from"} onClick={() => journey.open("from")}>
            <img className="icon" src={a.imgBoardingTheCityBus11} alt="" />
            <span className="lp-field-copy">
              <small>From</small>
              <span>{journey.fromCity}</span>
            </span>
          </button>
          <div style={{ position: "relative", width: 36, height: 76, display: "grid", placeItems: "center" }}>
            <div className="lp-vline" style={{ position: "absolute" }} />
            <div className="lp-swap">
              <img src={a.imgSortHorizontalStreamlineSolarAr} alt="" />
            </div>
          </div>
          <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "to"} onClick={() => journey.open("to")}>
            <img className="icon" src={a.imgBusExitAdventure1} alt="" />
            <span className="lp-field-copy">
              <small>To</small>
              <span>{journey.toCity}</span>
            </span>
          </button>
          <div className="lp-vline" />
          <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "pickup"} onClick={() => journey.open("pickup")}>
            <img className="icon" src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />
            <span className="lp-field-copy">
              <small>Pickup point</small>
              <span>{journey.pickup ?? "Choose your stop"}</span>
            </span>
            <img src={a.imgAltArrowDownStreamlineSolarAr} width={24} height={24} alt="" />
          </button>
          <div className="lp-vline" />
          <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "date"} onClick={() => journey.open("date")}>
            <img className="icon" src={a.imgColorfulCalendarIconWithCheckmark1} alt="" />
            <span className="lp-field-copy">
              <small>Date of journey</small>
              <span>{formatBarDate(journey.date)}</span>
            </span>
          </button>
          <div className="lp-vline" />
          <button className="lp-find" type="button" aria-disabled="true">
            Find food
            <span className="lp-find-icon">
              <img src={a.imgGrommetIconsLinkNext} alt="" />
            </span>
          </button>
        </div>
      </div>

      <div className="lp-abs" style={{ left: "50%", top: 547, transform: "translateX(-50%)", width: 591, height: 272, overflow: "hidden" }}>
        <img src={a.imgImage100} alt="" style={{ width: 591, height: 577, marginTop: 11, display: "block" }} />
      </div>
      <img className="lp-abs" src={a.imgObject} alt="" style={{ left: 1165, top: 523, width: 161, height: 199 }} />

      <div className="lp-abs lp-feature-row" style={{ left: "50%", top: 836, transform: "translateX(-50%)" }}>
        <article className="lp-feature">
          <img className="lp-abs" src={a.imgEllipse1714} alt="" style={{ left: 20, top: 17, width: 114, height: 99 }} />
          <img className="lp-abs" src={a.imgIndianWomanCookingWithSteamingPot1} alt="" style={{ left: -33, top: 3, width: 214, height: 143 }} />
          <div className="lp-feature-copy">
            <h3>Local home cooks</h3>
            <p>Authentic, homely meals made by trusted home cooks in your city.</p>
          </div>
        </article>
        <article className="lp-feature">
          <img className="lp-abs" src={a.imgEllipse1715} alt="" style={{ left: 20, top: 12, width: 117, height: 100 }} />
          <img className="lp-abs" src={a.imgVibrantSouthIndianBananaLeafThali1} alt="" style={{ left: 0, top: 18, width: 162, height: 108 }} />
          <div className="lp-feature-copy">
            <h3>Choose your meal</h3>
            <p>Browse a variety of home-cooked meals and pick what you love for your journey.</p>
          </div>
        </article>
        <article className="lp-feature">
          <img className="lp-abs" src={a.imgEllipse1716} alt="" style={{ left: 3, top: 9, width: 86, height: 81 }} />
          <img className="lp-abs" src={a.imgFriendlyBusStopMealHandover1} alt="" style={{ left: -14, top: 11, width: 190, height: 126 }} />
          <div className="lp-feature-copy">
            <h3>Collect at your stop</h3>
            <p>Pick up your freshly prepared meal at your selected stop during your bus journey.</p>
          </div>
        </article>
      </div>

      <div className="lp-abs" style={{ left: "50%", top: 996, width: 167, height: 30, transform: "translateX(-50%)", overflow: "hidden", opacity: 0.52 }}>
        <img src={a.imgElegantSymmetricalBlackFlourishDivider12} alt="" style={{ width: "100.49%", height: "183.78%", marginTop: "-14.6px", display: "block" }} />
      </div>
      <div className="lp-abs" style={{ left: 345, top: 1074, width: 81, height: 81, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img src={a.imgTraditionalIndianFishThaliTray1} alt="" style={{ width: 52, height: 62, transform: "rotate(45.78deg)" }} />
      </div>

      <section id="why" className="lp-abs" style={{ left: 60, top: 1049, width: 1320 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <p className="lp-eyebrow" style={{ letterSpacing: 3.49, fontSize: 17.5 }}>
              WHY AAHAA
            </p>
            <h2 style={{ margin: "25px 0 0", fontSize: 44, fontWeight: 500, lineHeight: 1.09 }}>
              Familiar food
              <br />
              Thoughtfully prepared.
            </h2>
          </div>
          <p style={{ width: 314, fontSize: 23, lineHeight: 1.32, margin: 0 }}>A little comfort , wherever your journey takes you</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: 12, height: 500, marginTop: 40 }}>
          <article style={{ gridRow: "1 / span 2", background: "#e5ead5", borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <img className="lp-abs" src={a.imgEmbroideredGreenAndCreamBorder1} alt="" style={{ left: -35, top: -31, width: 91, height: 562 }} />
            <img className="lp-abs" src={a.imgAahaaMealBoxWithCurryTray1} alt="" style={{ left: 140, top: 194, width: 400, height: 267 }} />
          </article>
          <article style={{ background: "#f1e8d7", borderRadius: 16, overflow: "hidden", position: "relative" }}>
            <div style={{ padding: "49px 39px 0" }}>
              <h3 style={{ margin: 0, fontSize: 31, fontWeight: 500, lineHeight: 1.09 }}>Planned for your journey</h3>
              <p style={{ margin: "16px 0 0", fontSize: 19, lineHeight: 1.47, maxWidth: 424 }}>Choose your stop and arrival time to see available meals</p>
            </div>
            <img className="lp-abs" src={a.imgMonochromeTiffinAndClockIcon1} alt="" style={{ left: 459, top: 65, width: 167, height: 141 }} />
          </article>
          <article style={{ background: "#1b513f", borderRadius: 16, overflow: "hidden", position: "relative", color: "#fff" }}>
            <div style={{ padding: "46px 47px 0" }}>
              <h3 style={{ margin: 0, fontSize: 36, fontWeight: 500, lineHeight: 1.09 }}>A Clear place to collect.</h3>
              <p style={{ margin: "16px 0 0", fontSize: 19, lineHeight: 1.47, maxWidth: 390 }}>Pickup instructions and deliverey updates , all in one place.</p>
            </div>
            <img className="lp-abs" src={a.imgHandGraspingTakeoutBagWithRoutePin1} alt="" style={{ left: 437, top: 39, width: 175, height: 125 }} />
            <img className="lp-abs" src={a.imgWhiteGeometricOrnamentalBorder1} alt="" style={{ left: 533, top: 182, width: 157, height: 52 }} />
          </article>
        </div>
      </section>

      <div className="lp-abs" style={{ left: 152, top: 1286, width: 536 }}>
        <p style={{ margin: 0, letterSpacing: 3.6, fontSize: 18, fontWeight: 500 }}>FROM HOME KITCHENS</p>
        <h3 style={{ margin: "20px 0 16px", fontSize: 34, fontWeight: 500, lineHeight: 1.09 }}>Made with a familiar touch</h3>
        <p style={{ margin: 0, fontSize: 20, lineHeight: 1.09 }}>Everyday meals , prepared by local home cooks</p>
      </div>

      <section id="how" className="lp-abs" style={{ left: 0, top: 1795, width: 1440, height: 781, overflow: "hidden", background: "#fef9f3" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
            <img src={a.imgVector2704} width={49} height={2} alt="" />
            <p style={{ letterSpacing: 3.6, color: "#052617", fontWeight: 500, fontSize: 18, margin: 0 }}>HOW IT WORKS</p>
            <img src={a.imgVector2704} width={49} height={2} alt="" />
          </div>
          <h2 style={{ margin: "12px 0 0", fontSize: 54, fontWeight: 600, color: "#1b513f", letterSpacing: -1.62, lineHeight: 1.09 }}>Home - cooked comfort.</h2>
          <p style={{ margin: 8, fontFamily: '"Nothing You Could Do", cursive', fontSize: 54, color: "#603811", lineHeight: 1.09 }}>Four simple steps.</p>
        </div>
        <img className="lp-abs" src={a.imgChatGptImageOct102026031608Pm1} alt="" style={{ left: 222, top: 188, width: 922, height: 615 }} />
        <img className="lp-abs lp-motion-bus-road" src={a.imgRetroOrangeCreamBusSticker1} alt="" />
        <img className="lp-abs" src={a.imgVector2706} alt="" style={{ left: 338, top: 384, width: 603, height: 286 }} />
        <Step n="01" title="Plan your journey" body="Choose your start, destination and pickup stop." left={60} top={100} />
        <Step n="02" title="Choose a home cook" body="See cooks available near your chosen stop." left={1128} top={100} />
        <Step n="03" title="Pick your meal" body="Browse your cook’s menu and place your order." left={60} top={540} />
        <Step n="04" title="Collect and continue" body="Meet your delivery partner at the pickup point." left={1133} top={540} />
      </section>

      <div className="lp-abs lp-traveller-flourish" style={{ left: "50%", top: 2596, width: 203, height: 37, overflow: "hidden", opacity: 0.7 }}>
        <img src={a.imgElegantSymmetricalBlackFlourishDivider12} alt="" style={{ width: "100.49%", height: "183.78%", marginTop: "-18px", display: "block" }} />
      </div>

      <section ref={travellerRef} className="lp-abs lp-pin" style={{ left: 40, top: 2660, width: 1360, textAlign: "center" }}>
        <p style={{ letterSpacing: 3.6, color: "#052617", fontWeight: 500, fontSize: 18, margin: 0 }}>FOR EVERY KIND OF TRAVELLER</p>
        <h2 style={{ fontSize: 60, fontWeight: 500, letterSpacing: -1.8, margin: "22px 0 0", lineHeight: 1.09 }}>
          A little comfort,
          <br />
          <span style={{ color: "#ff4b2b" }}>whoever you travel with.</span>
        </h2>
        <p style={{ color: "#5e5f61", fontSize: 20, maxWidth: 1046, margin: "18px auto 52px", lineHeight: 1.09 }}>
          Travelling alone , heading home or taking a family trip - make familiar food part of your journey.
        </p>
        <div style={{ display: "flex", gap: 50, justifyContent: "center" }}>
          <Traveller src={a.imgFriendlyBusStopBagExchange11} bg="#fee5d3" title="On your own" body="A comforting meal for your solo journey" imgW={256} imgH={237} imgTop={40} imgLeft={39} />
          <Traveller src={a.imgIndianFamilysBusStopDeliveryMoment1} bg="#e9ead7" title="With family" body="Explore meals and snaks for everyone travelling together." imgW={265} imgH={221} imgTop={56} imgLeft={42} />
          <Traveller src={a.imgDeliveryExchangeAtTheBusStop1} bg="#fff1cd" title="With friends" body="Pick your favourites and enjoy a meal along the way" imgW={255} imgH={196} imgTop={72} imgLeft={47} />
        </div>
      </section>

      {[
        { left: -34, width: 214 },
        { left: 180, width: 210 },
        { left: 390, width: 210 },
        { left: 600, width: 210 },
        { left: 810, width: 210 },
        { left: 1020, width: 210 },
        { left: 1230, width: 210 },
      ].map((item) => (
        <div key={item.left} className="lp-abs lp-pin" style={{ left: item.left, top: 3382, width: item.width, height: 45, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.9 }}>
          <img src={a.imgOrnateLotusLaceBorder1} alt="" style={{ width: 45, height: item.width, transform: "rotate(-90deg)" }} />
        </div>
      ))}
      <div ref={laceRef} className="lp-abs" style={{ left: 0, top: 3382, width: 1440, height: 45, pointerEvents: "none" }} aria-hidden="true" />
      <div ref={pairRef} className="lp-abs lp-motion-lace-pair" aria-hidden="true">
        <LaceStoryCard />
        <div className="lp-motion-bus-lace">
          <img src={a.imgChatGptImageOct82026121808Pm1} alt="" />
        </div>
      </div>

      <p className="lp-abs" style={{ left: "50%", top: 3839, transform: "translate(-50%, -100%)", letterSpacing: 3.6, color: "#052617", fontWeight: 500, fontSize: 18, margin: 0 }}>
        HERE TO HELP
      </p>
      <img className="lp-abs lp-pin" src={a.imgSymmetricalCoralAndOliveRangoliOrnament1} alt="" style={{ left: 40, top: 3438, width: 59, height: 69 }} />
      <img className="lp-abs lp-pin" src={a.imgSymmetricalCoralAndOliveRangoliOrnament1} alt="" style={{ left: 1341, top: 3438, width: 59, height: 69 }} />

      <section className="lp-abs" style={{ left: 60, top: 3901, width: 510 }}>
        <h2 style={{ fontSize: 60, fontWeight: 500, letterSpacing: -1.8, margin: 0, lineHeight: 1.09 }}>
          A Few things
          <br />
          <span style={{ color: "#ff4b2b" }}>before you travel.</span>
        </h2>
        <p style={{ color: "#421406", fontSize: 22, margin: "26px 0 0", lineHeight: 1.09 }}>Helpfull answer for a smoother pickup</p>
      </section>
      <img className="lp-abs" src={a.imgAahaaBusStopDeliveryScene1} alt="" style={{ left: 60, top: 4117, width: 469, height: 282 }} />
      <div className="lp-abs" style={{ left: 60, top: 4426 }}>
        <p style={{ color: "#421406", fontSize: 20, margin: "0 0 20px", lineHeight: 1.09 }}>Need more help !</p>
        <button className="lp-support" type="button" aria-disabled="true">
          Contact support
          <img src={a.imgArrow4} width={18} height={13} alt="" />
        </button>
      </div>
      <div className="lp-abs" style={{ left: 644, top: 3956 }}>
        <FaqList openFaq={openFaq} setOpenFaq={setOpenFaq} />
      </div>

      <div className="lp-abs" style={{ left: "50%", top: 4555, width: 185, height: 34, transform: "translateX(-50%)", overflow: "hidden", opacity: 0.7 }}>
        <img src={a.imgSymmetricalFloralScrollDivider1} alt="" style={{ width: "100.27%", height: "181.16%", marginTop: "-14px", display: "block" }} />
      </div>
      <div className="lp-abs" style={{ left: 60, top: 4615, width: 1320, height: 260, background: "#edefe2", borderRadius: 12 }} />
      <img className="lp-abs" src={a.imgFriendlyBusStopParcelHandoff2} alt="" style={{ left: 84, top: 4657, width: 287, height: 191 }} />
      <img className="lp-abs" src={a.imgLine10} alt="" style={{ left: 471, top: 4656, width: 1, height: 173 }} />
      <div className="lp-abs" style={{ left: 526, top: 4658, width: 768 }}>
        <h2 style={{ fontSize: 38, fontWeight: 400, letterSpacing: -1.14, margin: 0, lineHeight: 1.09 }}>Taking a journey soon ?</h2>
        <p style={{ color: "#806f6c", fontSize: 18, margin: "26px 0 30px", lineHeight: 1.09 }}>Find a pickup point , then discover what’s cooking nearby.</p>
        <button className="lp-cta" type="button" aria-disabled="true">
          Find your pickup point
        </button>
      </div>
      <img className="lp-abs" src={a.imgElegantGoldenFloralCornerOrnament1} alt="" style={{ left: 1273, top: 4790, width: 89, height: 67, opacity: 0.74 }} />
      <div className="lp-footer-chakra" aria-hidden="true">
        <img className="lp-abs lp-motion-mandala" src={a.imgOrnateFloralMandalaWheel1} alt="" style={{ left: 71, top: 71, width: 400, height: 400, opacity: 0.3 }} />
      </div>

      <footer className="lp-abs" style={{ left: 60, top: 4911, width: 340 }}>
        <Wordmark large />
        <p style={{ color: "#806f6c", fontSize: 22, margin: 0, lineHeight: 1.09 }}>A little home , alone the way</p>
        <div style={{ display: "flex", gap: 22, marginTop: 28 }}>
          <img src={a.imgGroup} width={24} height={24} alt="" />
          <img src={a.imgInstagram201651} width={24} height={24} alt="" />
          <img src={a.imgX21} width={24} height={22} alt="" />
        </div>
      </footer>
      <div className="lp-abs" style={{ left: 406, top: 4933, display: "flex", gap: 37, alignItems: "flex-start" }}>
        <img src={a.imgLine11} alt="" style={{ width: 1, height: 179 }} />
        <FooterCol title="Explore" items={["Our story", "How it works"]} width={135} />
        <img src={a.imgLine11} alt="" style={{ width: 1, height: 179 }} />
        <div style={{ width: 406 }}>
          <h3 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 24px", lineHeight: 1.09 }}>Contact us</h3>
          <p style={{ display: "flex", gap: 14, alignItems: "center", color: "#a68882", fontSize: 18, margin: "0 0 20px" }}>
            <img src={a.imgLetterStreamlineSolarAr} width={24} height={24} alt="" />
            contact@aahaa.com
          </p>
          <p style={{ display: "flex", gap: 14, alignItems: "center", color: "#a68882", fontSize: 18, margin: 0 }}>
            <img src={a.imgPhoneCallingStreamlineSolarAr} width={24} height={24} alt="" />
            7382987332
          </p>
        </div>
        <img src={a.imgLine13} alt="" style={{ width: 1, height: 179 }} />
        <FooterCol title="Work with us" items={["Become a cook", "Become a delivery partner"]} width={248} />
      </div>
      <p className="lp-abs" style={{ left: 60, top: 5268, display: "flex", gap: 12, alignItems: "center", margin: 0, color: "#a68882", fontSize: 17, lineHeight: 1.09 }}>
        <img src={a.imgCopyrightStreamlineSolarAr} width={24} height={24} alt="" />
        2026 Aahaa Pvt Ltd . All rights reserved.
      </p>
      <p className="lp-abs" style={{ left: 1089, top: 5271, display: "flex", gap: 24, margin: 0, color: "#a68882", fontSize: 17, lineHeight: 1.09 }}>
        <span>Privacy Policy</span>
        <span>Terms & Conditions</span>
      </p>
    </main>
  );
}

function Step({ n, title, body, left, top }: { n: string; title: string; body: string; left: number; top: number }) {
  return (
    <div className="lp-abs" style={{ left, top, width: 275 }}>
      <div style={{ position: "relative", width: 40, height: 40, marginBottom: 16 }}>
        <img src={a.imgStepSeal} width={40} height={40} alt="" />
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", fontSize: 16, fontWeight: 500 }}>{n}</span>
      </div>
      <h3 style={{ margin: 0, color: "#1b513f", fontSize: 22, fontWeight: 500, lineHeight: 1.09 }}>{title}</h3>
      <p style={{ margin: "12px 0 0", color: "#615f5e", fontSize: 18, lineHeight: 1.09 }}>{body}</p>
    </div>
  );
}

function Traveller({
  src,
  bg,
  title,
  body,
  imgW,
  imgH,
  imgTop,
  imgLeft,
}: {
  src: string;
  bg: string;
  title: string;
  body: string;
  imgW: number;
  imgH: number;
  imgTop: number;
  imgLeft: number;
}) {
  return (
    <article style={{ width: 391, textAlign: "center" }}>
      <div style={{ height: 294, overflow: "hidden" }}>
        <div style={{ position: "relative", width: 350, height: 695, margin: "0 auto", borderRadius: 449, background: bg, overflow: "hidden" }}>
          <img src={src} alt="" style={{ position: "absolute", width: imgW, height: imgH, top: imgTop, left: imgLeft, objectFit: "cover" }} />
        </div>
      </div>
      <img src={a.imgLine6} alt="" style={{ width: 384, height: 1, display: "block", margin: "0 auto" }} />
      <h3 style={{ margin: "24px 0 0", fontSize: 28, fontWeight: 600, lineHeight: 1.09 }}>{title}</h3>
      <p style={{ margin: "11px auto 0", maxWidth: 308, color: "#5e5f61", fontSize: 19, lineHeight: 1.25 }}>{body}</p>
    </article>
  );
}

function FooterCol({ title, items, width }: { title: string; items: string[]; width?: number }) {
  return (
    <div style={{ minWidth: 135, width }}>
      <h3 style={{ fontSize: 20, fontWeight: 500, margin: "0 0 24px", lineHeight: 1.09 }}>{title}</h3>
      {items.map((item) => (
        <p key={item} style={{ color: "#a68882", fontSize: 18, margin: "0 0 20px", lineHeight: 1.09, whiteSpace: "nowrap" }}>
          {item}
        </p>
      ))}
    </div>
  );
}

function MobileLanding({
  openFaq,
  setOpenFaq,
  journey,
}: {
  openFaq: number;
  setOpenFaq: (index: number) => void;
  journey: JourneySearch;
}) {
  return (
    <main className="lp-mobile">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Wordmark />
        <button className="lp-login" type="button" aria-disabled="true" style={{ padding: "10px 20px" }}>
          Log in
        </button>
      </header>
      <p className="lp-eyebrow" style={{ marginTop: 28, textAlign: "center" }}>
        FROM HOME KICTHENS , WITH LOVE
      </p>
      <h1 style={{ textAlign: "center" }}>
        A taste of home.
        <br />
        <em>For the road ahead.</em>
      </h1>
      <img className="full" src={a.imgImage100} alt="" />
      <div className="lp-journey" style={{ marginTop: 20 }}>
        <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "from"} onClick={() => journey.open("from")}>
          <img className="icon" src={a.imgBoardingTheCityBus11} alt="" />
          <span className="lp-field-copy">
            <small>From</small>
            <span>{journey.fromCity}</span>
          </span>
        </button>
        <div className="lp-vline" />
        <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "to"} onClick={() => journey.open("to")}>
          <img className="icon" src={a.imgBusExitAdventure1} alt="" />
          <span className="lp-field-copy">
            <small>To</small>
            <span>{journey.toCity}</span>
          </span>
        </button>
        <div className="lp-vline" />
        <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "pickup"} onClick={() => journey.open("pickup")}>
          <img className="icon" src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />
          <span className="lp-field-copy">
            <small>Pickup point</small>
            <span>{journey.pickup ?? "Choose your stop"}</span>
          </span>
          <img src={a.imgAltArrowDownStreamlineSolarAr} width={24} height={24} alt="" />
        </button>
        <div className="lp-vline" />
        <button className="lp-field" type="button" aria-haspopup="dialog" aria-expanded={journey.panel === "date"} onClick={() => journey.open("date")}>
          <img className="icon" src={a.imgColorfulCalendarIconWithCheckmark1} alt="" />
          <span className="lp-field-copy">
            <small>Date of journey</small>
            <span>{formatBarDate(journey.date)}</span>
          </span>
        </button>
        <button className="lp-find" type="button" aria-disabled="true">
          Find food
          <span className="lp-find-icon">
            <img src={a.imgGrommetIconsLinkNext} alt="" />
          </span>
        </button>
      </div>

      <section>
        <article className="lp-feature">
          <img className="lp-abs" src={a.imgIndianWomanCookingWithSteamingPot1} alt="" style={{ left: -20, top: 4, width: 140, height: 94 }} />
          <div className="lp-feature-copy">
            <h3>Local home cooks</h3>
            <p>Authentic, homely meals made by trusted home cooks in your city.</p>
          </div>
        </article>
        <article className="lp-feature">
          <img className="lp-abs" src={a.imgVibrantSouthIndianBananaLeafThali1} alt="" style={{ left: 0, top: 12, width: 120, height: 80 }} />
          <div className="lp-feature-copy">
            <h3>Choose your meal</h3>
            <p>Browse a variety of home-cooked meals and pick what you love for your journey.</p>
          </div>
        </article>
        <article className="lp-feature">
          <img className="lp-abs" src={a.imgFriendlyBusStopMealHandover1} alt="" style={{ left: -12, top: 8, width: 140, height: 93 }} />
          <div className="lp-feature-copy">
            <h3>Collect at your stop</h3>
            <p>Pick up your freshly prepared meal at your selected stop during your bus journey.</p>
          </div>
        </article>
      </section>

      <section data-section="why">
        <p className="lp-section-label">WHY AAHAA</p>
        <h2>
          Familiar food
          <br />
          Thoughtfully prepared.
        </h2>
        <p>A little comfort , wherever your journey takes you</p>
        <div className="lp-why-card" style={{ background: "#e5ead5" }}>
          <p className="lp-eyebrow">FROM HOME KITCHENS</p>
          <h3>Made with a familiar touch</h3>
          <p>Everyday meals , prepared by local home cooks</p>
          <img className="full" src={a.imgAahaaMealBoxWithCurryTray1} alt="" />
        </div>
        <div className="lp-why-card" style={{ background: "#f1e8d7" }}>
          <h3>Planned for your journey</h3>
          <p>Choose your stop and arrival time to see available meals</p>
          <img className="full" src={a.imgMonochromeTiffinAndClockIcon1} alt="" />
        </div>
        <div className="lp-why-card" style={{ background: "#1b513f", color: "#fff" }}>
          <h3>A Clear place to collect.</h3>
          <p>Pickup instructions and deliverey updates , all in one place.</p>
          <img className="full" src={a.imgHandGraspingTakeoutBagWithRoutePin1} alt="" />
        </div>
      </section>

      <section data-section="how">
        <p className="lp-section-label">HOW IT WORKS</p>
        <h2 style={{ color: "#1b513f" }}>Home - cooked comfort.</h2>
        <p style={{ fontFamily: '"Nothing You Could Do", cursive', fontSize: 32, color: "#603811" }}>Four simple steps.</p>
        <img className="full" src={a.imgChatGptImageOct102026031608Pm1} alt="" />
        <div className="lp-steps">
          <MobileStep n="01" title="Plan your journey" body="Choose your start, destination and pickup stop." />
          <MobileStep n="02" title="Choose a home cook" body="See cooks available near your chosen stop." />
          <MobileStep n="03" title="Pick your meal" body="Browse your cook’s menu and place your order." />
          <MobileStep n="04" title="Collect and continue" body="Meet your delivery partner at the pickup point." />
        </div>
      </section>

      <section>
        <p className="lp-section-label" style={{ textAlign: "center" }}>
          FOR EVERY KIND OF TRAVELLER
        </p>
        <h2 style={{ textAlign: "center" }}>
          A little comfort,
          <br />
          <span style={{ color: "#ff4b2b" }}>whoever you travel with.</span>
        </h2>
        <p style={{ color: "#5e5f61", textAlign: "center" }}>Travelling alone , heading home or taking a family trip - make familiar food part of your journey.</p>
        <div className="lp-traveller">
          <img className="full" src={a.imgFriendlyBusStopBagExchange11} alt="" />
          <h3>On your own</h3>
          <p>A comforting meal for your solo journey</p>
        </div>
        <div className="lp-traveller">
          <img className="full" src={a.imgIndianFamilysBusStopDeliveryMoment1} alt="" />
          <h3>With family</h3>
          <p>Explore meals and snaks for everyone travelling together.</p>
        </div>
        <div className="lp-traveller">
          <img className="full" src={a.imgDeliveryExchangeAtTheBusStop1} alt="" />
          <h3>With friends</h3>
          <p>Pick your favourites and enjoy a meal along the way</p>
        </div>
      </section>

      <section>
        <p className="lp-section-label" style={{ textAlign: "center" }}>
          HERE TO HELP
        </p>
        <h2>
          A Few things
          <br />
          <span style={{ color: "#ff4b2b" }}>before you travel.</span>
        </h2>
        <p style={{ color: "#421406" }}>Helpfull answer for a smoother pickup</p>
        <img className="full" src={a.imgAahaaBusStopDeliveryScene1} alt="" />
        <div style={{ marginTop: 20 }}>
          <FaqList openFaq={openFaq} setOpenFaq={setOpenFaq} />
        </div>
        <p style={{ color: "#421406" }}>Need more help !</p>
        <button className="lp-support" type="button" aria-disabled="true">
          Contact support
          <img src={a.imgArrow4} width={18} height={13} alt="" />
        </button>
      </section>

      <section className="lp-cta-band">
        <img className="full" src={a.imgFriendlyBusStopParcelHandoff2} alt="" />
        <h2>Taking a journey soon ?</h2>
        <p style={{ color: "#806f6c" }}>Find a pickup point , then discover what’s cooking nearby.</p>
        <button className="lp-cta" type="button" aria-disabled="true">
          Find your pickup point
        </button>
      </section>

      <section className="lp-footer-grid">
        <div>
          <Wordmark large />
          <p style={{ color: "#806f6c" }}>A little home , alone the way</p>
        </div>
        <FooterCol title="Explore" items={["Our story", "How it works"]} />
        <div>
          <h3>Contact us</h3>
          <p style={{ color: "#a68882" }}>contact@aahaa.com</p>
          <p style={{ color: "#a68882" }}>7382987332</p>
          <p style={{ color: "#a68882" }}>RR Complex, No. 32, K No. 1146/50/32,1st Floor, Chikkabegur Gate,Hosur Main Road,Bengaluru, Karnataka, India</p>
        </div>
        <FooterCol title="Work with us" items={["Become a cook", "Become a delivery partner"]} />
        <p style={{ color: "#a68882" }}>2026 Aahaa Pvt Ltd . All rights reserved.</p>
        <p style={{ color: "#a68882" }}>Privacy Policy · Terma & Conditions</p>
      </section>
    </main>
  );
}

function MobileStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div>
      <div style={{ position: "relative", width: 40, height: 40, marginBottom: 12 }}>
        <img src={a.imgStepSeal} width={40} height={40} alt="" />
        <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", fontSize: 16, fontWeight: 500 }}>{n}</span>
      </div>
      <h3 style={{ margin: 0, color: "#1b513f", fontSize: 22, fontWeight: 500 }}>{title}</h3>
      <p style={{ margin: "8px 0 0", color: "#615f5e" }}>{body}</p>
    </div>
  );
}

function PlaceRow({
  selected,
  title,
  subtitle,
  onSelect,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={selected ? "lp-place is-selected" : "lp-place"} onClick={onSelect}>
      <img src={selected ? a.imgMapPointStreamlineSolar : a.imgMapPointStreamlineSolarMuted} alt="" />
      <span className="lp-place-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      {selected ? <img className="lp-place-check" src={a.imgCheckCircleStreamlineSolar} alt="" /> : null}
    </button>
  );
}

function JourneyOverlay({ journey }: { journey: JourneySearch }) {
  const filteredFrom = useMemo(
    () => FROM_CITIES.filter((city) => `${city.name} ${city.region}`.toLowerCase().includes(journey.query.trim().toLowerCase())),
    [journey.query],
  );
  const filteredTo = useMemo(
    () => TO_CITIES.filter((city) => `${city.name} ${city.region}`.toLowerCase().includes(journey.query.trim().toLowerCase())),
    [journey.query],
  );
  const filteredStops = useMemo(
    () => PICKUP_STOPS.filter((stop) => `${stop.name} ${stop.time} ${stop.kind}`.toLowerCase().includes(journey.query.trim().toLowerCase())),
    [journey.query],
  );

  if (!journey.panel) return null;

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const cells = monthCells(journey.viewMonth.getFullYear(), journey.viewMonth.getMonth());

  return (
    <div className="lp-overlay" onClick={journey.close} role="presentation">
      <div
        className={`lp-sheet ${journey.panel === "date" ? "lp-sheet--date" : journey.panel === "pickup" ? "lp-sheet--pickup" : "lp-sheet--city"}`}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {journey.panel === "from" ? (
          <>
            <h2>Where are you travelling from ?</h2>
            <label className="lp-sheet-search">
              <img src={a.imgMagniferStreamlineSolarAr} alt="" />
              <input value={journey.query} onChange={(event) => journey.setQuery(event.target.value)} placeholder="Search pickup points" autoFocus />
            </label>
            <p className="lp-sheet-label">Suggested cities</p>
            <div className="lp-place-list">
              {filteredFrom.map((city) => (
                <PlaceRow
                  key={city.name}
                  selected={isFromSelected(journey.draftFrom, city.name)}
                  title={city.name}
                  subtitle={city.region}
                  onSelect={() => journey.setDraftFrom(city.name)}
                />
              ))}
            </div>
            <button className="lp-sheet-save" type="button" onClick={journey.saveFrom}>
              Save
            </button>
          </>
        ) : null}

        {journey.panel === "to" ? (
          <>
            <h2>Where are you travelling to ?</h2>
            <label className="lp-sheet-search">
              <img src={a.imgMagniferStreamlineSolarAr} alt="" />
              <input value={journey.query} onChange={(event) => journey.setQuery(event.target.value)} placeholder="Search destination points" autoFocus />
            </label>
            <p className="lp-sheet-label">Suggested cities</p>
            <div className="lp-place-list">
              {filteredTo.map((city) => (
                <PlaceRow
                  key={city.name}
                  selected={journey.draftTo === city.name}
                  title={city.name}
                  subtitle={city.region}
                  onSelect={() => journey.setDraftTo(city.name)}
                />
              ))}
            </div>
            <button className="lp-sheet-save" type="button" onClick={journey.saveTo}>
              Save
            </button>
          </>
        ) : null}

        {journey.panel === "pickup" ? (
          <>
            <h2>Choose your pickup stop</h2>
            <p className="lp-sheet-lead">Select a stop where your bus aldreay stops.</p>
            <label className="lp-sheet-search">
              <img src={a.imgMagniferStreamlineSolarAr} alt="" />
              <input value={journey.query} onChange={(event) => journey.setQuery(event.target.value)} placeholder="Search pickup points" autoFocus />
            </label>
            <div className="lp-place-list lp-place-list--stops">
              {filteredStops.map((stop) => {
                const label = `${stop.name} ${stop.time}`;
                return (
                  <PlaceRow
                    key={stop.name}
                    selected={journey.draftPickup === label}
                    title={label}
                    subtitle={stop.kind}
                    onSelect={() => journey.setDraftPickup(label)}
                  />
                );
              })}
            </div>
            <p className="lp-sheet-note">Example stops for this preview</p>
            <button className="lp-sheet-save" type="button" onClick={journey.savePickup}>
              Save
            </button>
          </>
        ) : null}

        {journey.panel === "date" ? (
          <>
            <h2>Choose your journey date</h2>
            <div className="lp-date-chips">
              <button
                className="lp-date-chip"
                type="button"
                onClick={() => {
                  journey.setDraftDate(today);
                  journey.setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                }}
              >
                Today
              </button>
              <button
                className="lp-date-chip"
                type="button"
                onClick={() => {
                  journey.setDraftDate(tomorrow);
                  journey.setViewMonth(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
                }}
              >
                Tomorrow
              </button>
            </div>
            <div className="lp-date-nav">
              <button
                className="lp-date-dir lp-date-dir--prev"
                type="button"
                aria-label="Previous month"
                onClick={() => journey.setViewMonth(new Date(journey.viewMonth.getFullYear(), journey.viewMonth.getMonth() - 1, 1))}
              >
                <img src={a.imgAltArrowDownStreamlineSolarAr} alt="" />
              </button>
              <strong>
                {MONTHS[journey.viewMonth.getMonth()]} {journey.viewMonth.getFullYear()}
              </strong>
              <button
                className="lp-date-dir lp-date-dir--next"
                type="button"
                aria-label="Next month"
                onClick={() => journey.setViewMonth(new Date(journey.viewMonth.getFullYear(), journey.viewMonth.getMonth() + 1, 1))}
              >
                <img src={a.imgAltArrowDownStreamlineSolarAr} alt="" />
              </button>
            </div>
            <div className="lp-cal">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
                <span key={label} className="lp-cal-wd">
                  {label}
                </span>
              ))}
              {cells.map((day, index) => {
                if (!day) return <span key={`empty-${index}`} className="lp-cal-empty" />;
                const cellDate = new Date(journey.viewMonth.getFullYear(), journey.viewMonth.getMonth(), day);
                const selected = sameDay(cellDate, journey.draftDate);
                const muted = cellDate < today && !selected;
                return (
                  <button
                    key={day}
                    type="button"
                    className={`lp-cal-day${selected ? " is-selected" : ""}${muted ? " is-muted" : ""}`}
                    onClick={() => journey.setDraftDate(cellDate)}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            <p className="lp-date-selected">{formatSelectedDate(journey.draftDate)}</p>
            <button className="lp-sheet-confirm" type="button" onClick={journey.saveDate}>
              Confirm date
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
