// @ts-nocheck — kept as a visual/behavior reference after consolidation into LandingPage.tsx
import { useEffect, useState } from "react";
import * as existing from "./assets/landing";
import { FIXED_PICKUP_POINT, isBengaluruPlace, journeyPickName, normalizeJourneySearch } from "./cookData";
import { useLocationRecents } from "./lib/useLocationRecents";
import { useLocationSuggest, type LocationSuggestStatus } from "./lib/useLocationSuggest";
import { navigate, PATHS } from "./navigation";
import { getFaqsForSurface } from "./faqContent";
import imgAahaaBannerSoftTheme from "./assets/mobile-landing/imgAahaaBannerSoftTheme.png";
import imgImage111 from "./assets/mobile-landing/imgImage111.png";
import imgImage130 from "./assets/mobile-landing/imgImage130.png";
import imgImage160 from "./assets/mobile-landing/imgImage160.png";
import imgAahaaBusStopDeliveryScene3 from "./assets/mobile-landing/imgAahaaBusStopDeliveryScene3.png";
import imgFriendlyBusStopParcelHandoff3 from "./assets/mobile-landing/imgFriendlyBusStopParcelHandoff3.png";
import imgOrnateFloralMandalaWheel3 from "./assets/mobile-landing/imgOrnateFloralMandalaWheel3.png";
import imgRetroOrangeCreamBusSticker3 from "./assets/mobile-landing/imgRetroOrangeCreamBusSticker3.png";
import "./styles/mobile-landing.css";

const Y = (figmaTop: number) => figmaTop - 48;

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

const faqs = getFaqsForSurface("landing");

export function MobileLandingPage() {
  const [openFaq, setOpenFaq] = useState(0);
  const [panel, setPanel] = useState<JourneyPanel>(null);
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [pickup, setPickup] = useState<string | null>(FIXED_PICKUP_POINT);
  const [date, setDate] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [draftPickup, setDraftPickup] = useState<string | null>(FIXED_PICKUP_POINT);
  const [draftDate, setDraftDate] = useState(() => new Date(2026, 9, 12));
  const [viewMonth, setViewMonth] = useState(() => new Date(2026, 9, 1));
  const [suggest, setSuggest] = useState<"from" | "to" | null>(null);
  const [typed, setTyped] = useState(false);
  const fromRecentsState = useLocationRecents("from");
  const toRecentsState = useLocationRecents("to");
  const fromSuggest = useLocationSuggest(
    "from_locality",
    fromCity,
    typed && suggest === "from" && Boolean(fromCity.trim()),
  );
  const toSuggest = useLocationSuggest(
    "to_destination",
    toCity,
    typed && suggest === "to" && Boolean(toCity.trim()),
  );
  const showFromSuggest =
    suggest === "from" && (typed ? Boolean(fromCity.trim()) : fromRecentsState.recents.length > 0);
  const showToSuggest =
    suggest === "to" && (typed ? Boolean(toCity.trim()) : toRecentsState.recents.length > 0);

  function openPanel(next: Exclude<JourneyPanel, null>) {
    setDraftFrom(fromCity);
    setDraftTo(toCity);
    setDraftPickup(FIXED_PICKUP_POINT);
    setPickup(FIXED_PICKUP_POINT);
    const nextDate = date ?? new Date(2026, 9, 12);
    setDraftDate(nextDate);
    setViewMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    setQuery("");
    setPanel(next);
  }

  function closePanel() {
    setPanel(null);
    setQuery("");
  }

  useEffect(() => {
    if (!panel && !suggest) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closePanel();
      setSuggest(null);
      setTyped(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel, suggest]);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".mlp-page");
    const shell = document.querySelector<HTMLElement>(".mlp-scale");
    const apply = () => {
      const vw = window.innerWidth;
      const scale = vw <= 500 ? vw / 390 : 1;
      if (page) {
        page.style.transform = `scale(${scale})`;
      }
      if (shell) {
        shell.style.width = vw <= 500 ? "100%" : "";
        shell.style.height = vw <= 500 ? `${3748 * scale}px` : "";
        shell.style.margin = vw <= 500 ? "0" : "";
        shell.style.overflow = vw <= 500 ? "hidden" : "";
      }
      const overlay = document.querySelector<HTMLElement>(".mlp-overlay");
      if (overlay) {
        overlay.style.transform = `scale(${scale})`;
        overlay.style.transformOrigin = "top left";
        overlay.style.left = scale === 1 ? "" : "0px";
        overlay.style.marginLeft = scale === 1 ? "" : "0px";
        overlay.style.width = "390px";
        overlay.style.height = scale === 1 ? "" : `${window.innerHeight / scale}px`;
        overlay.style.bottom = scale === 1 ? "" : "auto";
      }
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [panel]);

  return (
    <>
    <div className="mlp-scale">
    <main className="mlp-page">
      <header className="mlp-abs mlp-row" style={{ left: 16, top: Y(58), width: 358, justifyContent: "space-between" }}>
        <div className="mlp-wordmark">
          <div className="mlp-wordmark-seal">
            <div className="mlp-wordmark-circle">
              <img src={existing.imgEllipse1712} alt="" />
            </div>
          </div>
          <span>aahaa</span>
        </div>
        <div className="mlp-row" style={{ gap: 20 }}>
          <button className="mlp-login" type="button" aria-disabled="true">
            Log in
          </button>
          <div className="mlp-burger" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </header>

      <p className="mlp-abs" style={{ left: "50%", top: Y(146), margin: 0, width: 156, transform: "translate(-50%, -100%)", color: "#290600", fontSize: 10, fontWeight: 500, letterSpacing: 2, lineHeight: 1.45, textAlign: "center" }}>
        FROM HOME KICTHENS, WITH LOVE
      </p>
      <div className="mlp-abs" style={{ left: "50%", top: Y(144), width: 390, height: 99, transform: "translateX(-50%)", overflow: "hidden" }}>
        <img src={imgAahaaBannerSoftTheme} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </div>

      <div className="mlp-abs" style={{ left: "50%", top: Y(231), width: 358, height: 290, transform: "translateX(-50%)", background: "#fefefe", borderRadius: 12, boxShadow: "0px 2px 6px 0px rgba(124,113,113,0.07)" }} />
      <JourneyField
        left={34}
        top={Y(249)}
        width={268}
        label="From"
        value={fromCity}
        icon={existing.imgBoardingTheCityBus11}
        iconW={24}
        iconH={19}
        iconLeft={3}
        iconTop={5}
        editable
        onFocus={() => {
          setSuggest("from");
          setTyped(false);
        }}
        onChange={(next) => {
          setFromCity(next);
          setSuggest("from");
          setTyped(true);
        }}
      />
      <hr className="mlp-abs mlp-hairline" style={{ left: 34, top: Y(293), width: 277 }} />
      <JourneyField
        left={34}
        top={Y(303)}
        width={268}
        label="To"
        value={toCity}
        icon={existing.imgBusExitAdventure1}
        iconW={24}
        iconH={19}
        iconLeft={-2}
        iconTop={3}
        boxed
        editable
        onFocus={() => {
          setSuggest("to");
          setTyped(false);
        }}
        onChange={(next) => {
          setToCity(next);
          setSuggest("to");
          setTyped(true);
        }}
      />
      <button className="mlp-abs mlp-swap" type="button" aria-disabled="true" style={{ left: 320, top: Y(276) }}>
        <img src={existing.imgSortHorizontalStreamlineSolarAr} width={20} height={20} alt="" />
      </button>
      <div className="mlp-abs mlp-hairline-v" style={{ left: 311, top: Y(249), height: 98 }} />
      <hr className="mlp-abs mlp-hairline" style={{ left: 34, top: Y(347), width: 322 }} />
      <JourneyField
        left={34}
        top={Y(357)}
        width={322}
        label="Pickup point"
        value={FIXED_PICKUP_POINT}
        icon={existing.imgRedHattedDeliveryRiderWithParcel1}
        iconW={24}
        iconH={21}
        iconLeft={1}
        iconTop={3}
        boxed
        editable
        onFocus={() => {
          setSuggest(null);
          setTyped(false);
          setPickup(FIXED_PICKUP_POINT);
        }}
        onChange={() => {
          setPickup(FIXED_PICKUP_POINT);
          setSuggest(null);
          setTyped(false);
        }}
      />
      <hr className="mlp-abs mlp-hairline" style={{ left: 34, top: Y(401), width: 322 }} />
      <JourneyField left={34} top={Y(411)} width={322} label="Date of journey" value={date ? formatBarDate(date) : "Select date"} icon={existing.imgColorfulCalendarIconWithCheckmark1} iconW={18} iconH={17} iconLeft={6} iconTop={5} boxed expanded={panel === "date"} onOpen={() => openPanel("date")} />
      <button className="mlp-abs mlp-search" type="button" aria-disabled="true" style={{ left: 34, top: Y(459) }}>
        <img src={existing.imgMagniferStreamlineSolarAr} width={20} height={20} alt="" />
        Search Amma food
      </button>
      {showFromSuggest ? (
        <SuggestMenu
          className="mlp-suggest--from"
          top={Y(293)}
          left={16}
          query={typed ? fromCity : ""}
          recents={fromRecentsState.recents}
          popularTitle="Popular Boarding Points near you"
          popular={typed ? fromSuggest.items : []}
          popularMeta="Board at"
          remoteStatus={typed && fromCity.trim() ? fromSuggest.status : undefined}
          onClearRecents={fromRecentsState.clear}
          onPick={(name) => {
            fromRecentsState.remember(name);
            setFromCity(name);
            setSuggest(null);
            setTyped(false);
          }}
        />
      ) : null}
      {showToSuggest ? (
        <SuggestMenu
          className="mlp-suggest--to"
          top={Y(347)}
          left={16}
          query={typed ? toCity : ""}
          recents={toRecentsState.recents}
          popularTitle="Popular Dropping Points near you"
          popular={typed ? toSuggest.items : []}
          popularMeta="Drop at"
          remoteStatus={typed && toCity.trim() ? toSuggest.status : undefined}
          excludeBengaluru
          onClearRecents={toRecentsState.clear}
          onPick={(name) => {
            toRecentsState.remember(name);
            setToCity(name);
            setSuggest(null);
            setTyped(false);
          }}
        />
      ) : null}

      <div className="mlp-abs" style={{ left: "50%", top: Y(533), width: 390, height: 382, transform: "translateX(-50%)", overflow: "hidden" }}>
        <img src={imgImage130} alt="" style={{ position: "absolute", height: "114.92%", left: "-0.02%", top: "-14.92%", width: "100.04%", maxWidth: "none" }} />
      </div>

      <div className="mlp-abs" style={{ left: "50%", top: Y(925), width: 225, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, width: "100%" }}>
          <div className="mlp-row" style={{ gap: 14, width: "100%", justifyContent: "center" }}>
            <img src={existing.imgVector2704} alt="" style={{ width: 40, height: 1 }} />
            <p style={{ margin: 0, color: "#052617", fontSize: 12, fontWeight: 500, letterSpacing: 2.4, lineHeight: 1.09, whiteSpace: "nowrap" }}>HOW IT WORKS</p>
            <img src={existing.imgVector2704} alt="" style={{ width: 40, height: 1 }} />
          </div>
          <p style={{ margin: 0, width: 173, color: "#1b513f", fontSize: 18, fontWeight: 600, letterSpacing: -0.54, lineHeight: 1.09, textAlign: "center" }}>Home - cooked comfort.</p>
        </div>
        <p style={{ margin: 0, width: "100%", color: "#603811", fontFamily: '"Plus Jakarta Sans", "Segoe UI", sans-serif', fontSize: 16, letterSpacing: -0.48, lineHeight: 1.09, textAlign: "center" }}>Four simple steps.</p>
      </div>

      <div className="mlp-abs mlp-road-stage" style={{ left: 16, top: Y(1049), width: 358, height: 473 }}>
        <img src={imgImage111} alt="" />
        <img className="mlp-bus-road" src={imgRetroOrangeCreamBusSticker3} alt="" width={72} height={35} />
      </div>
      <Step n="01" title="Plan your journey" left={16} top={Y(1034)} width={126} />
      <Step n="02" title="Choose a home cook" left={222} top={Y(1179)} width={112} nowrap />
      <Step n="03" title="Pick your meal" left={87} top={Y(1297)} width={85} />
      <Step n="04" title="Collect and continue" left={16} top={Y(1418)} width={126} />

      <div className="mlp-abs" style={{ left: 16, top: Y(1548), width: 337, display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, color: "#421406", fontSize: 16, fontWeight: 600, lineHeight: 1.09 }}>Choose your home cook</h2>
        <p style={{ margin: 0, color: "#ac9692", fontSize: 12, lineHeight: 1.09 }}>Discover home kitchens serving your selected pickup stop.</p>
        <p style={{ margin: 0, color: "#006233", fontSize: 12, fontWeight: 500, lineHeight: 1.09 }}>Only Veg</p>
      </div>
      <div className="mlp-abs" style={{ left: "50%", top: Y(1617), width: 390, height: 546, transform: "translateX(-50%)", overflow: "hidden" }}>
        <img src={imgImage160} alt="Lakshmi’s Kitchen, Meena’s Home Food, Padma’s Kitchen, and Prema’s Kitchen" style={{ position: "absolute", height: "101.51%", left: 0, top: "-0.02%", width: "100%", maxWidth: "none" }} />
      </div>

      <div className="mlp-abs" style={{ left: 1, top: Y(2163), display: "flex" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 105, height: 23, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "relative", width: 23, height: 105, transform: "rotate(-90deg)", overflow: "hidden", opacity: 0.9 }}>
              <img src={existing.imgOrnateLotusLaceBorder1} alt="" style={{ position: "absolute", height: "104.07%", left: "-84.44%", top: "-2.04%", width: "273.33%", maxWidth: "none" }} />
            </div>
          </div>
        ))}
      </div>
      <img className="mlp-abs" src={existing.imgSymmetricalCoralAndOliveRangoliOrnament1} alt="" style={{ left: 16, top: Y(2200), width: 23, height: 27, objectFit: "cover" }} />
      <img className="mlp-abs" src={existing.imgSymmetricalCoralAndOliveRangoliOrnament1} alt="" style={{ left: 352, top: Y(2201), width: 22, height: 25, objectFit: "cover" }} />
      <p className="mlp-abs" style={{ left: "calc(50% - 54px)", top: Y(2213), margin: 0, transform: "translateY(-100%)", color: "#052617", fontSize: 12, fontWeight: 500, letterSpacing: 2.4, lineHeight: 1.09, whiteSpace: "nowrap" }}>
        HERE TO HELP
      </p>
      <div className="mlp-abs" style={{ left: 16, top: Y(2243), display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6, fontSize: 20, fontWeight: 500, letterSpacing: -0.6, lineHeight: 1.09 }}>
          <span>A Few things</span>
          <span style={{ color: "#ff4b2b" }}>before you travel.</span>
        </h2>
        <p style={{ margin: 0, color: "#421406", fontSize: 14, lineHeight: 1.09 }}>Helpfull answer for a smoother pickup</p>
      </div>
      <img className="mlp-abs" src={imgAahaaBusStopDeliveryScene3} alt="" style={{ left: "50%", top: Y(2334), width: 221, height: 132, transform: "translateX(-50%)", objectFit: "cover" }} />

      {faqs.map((faq, index) => {
        const tops = [2480, 2589, 2638, 2687, 2736, 2785];
        const open = openFaq === index;
        return (
          <button
            key={faq.id}
            className={`mlp-abs mlp-faq ${open ? "mlp-faq--open" : "mlp-faq--closed"}`}
            type="button"
            style={{ left: index === 3 || index === 4 ? 17 : 16, top: Y(tops[index]) }}
            aria-expanded={open}
            onClick={() => setOpenFaq(open ? -1 : index)}
          >
            <div style={{ flex: 1 }}>
              <p className="mlp-faq-q">{faq.question}</p>
              {open && faq.answer ? <p className="mlp-faq-a">{faq.answer}</p> : null}
            </div>
            {open ? <span className="mlp-minus" style={{ position: "absolute", right: 16, top: 16 }} /> : <img src={existing.imgAkarIconsPlus} width={20} height={20} alt="" />}
          </button>
        );
      })}

      <div className="mlp-abs" style={{ left: 16, top: Y(2844), display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, color: "#421406", fontSize: 14, lineHeight: 1.09 }}>Need more help !</p>
        <button className="mlp-cta-outline" type="button" aria-disabled="true">
          Contact support
          <img src={existing.imgArrow4} width={18} height={13} alt="" />
        </button>
      </div>

      <div className="mlp-abs" style={{ left: "50%", top: Y(2929), width: 70, height: 13, transform: "translateX(-50%)", overflow: "hidden", opacity: 0.52 }}>
        <img src={existing.imgElegantSymmetricalBlackFlourishDivider12} alt="" style={{ width: "100.49%", height: "183.78%", marginTop: "-48.65%", marginLeft: "-0.25%", maxWidth: "none", display: "block" }} />
      </div>
      <div className="mlp-abs" style={{ left: 16, top: Y(2954), width: 358, height: 310, background: "#edefe2", borderRadius: 12 }} />
      <div className="mlp-abs" style={{ left: 34, top: Y(2972), width: 322, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ width: 209, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <img src={imgFriendlyBusStopParcelHandoff3} alt="" style={{ width: 162, height: 108, objectFit: "cover" }} />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 400, letterSpacing: -0.6, lineHeight: 1.09, textAlign: "center" }}>Taking a journey soon ?</h2>
          <p style={{ margin: 0, color: "#806f6c", fontSize: 14, lineHeight: 1.28, textAlign: "center" }}>Find a pickup point , then discover what’s cooking nearby.</p>
        </div>
        <button className="mlp-cta-fill" type="button" aria-disabled="true">
          Find your pickup point
        </button>
      </div>

      <div className="mlp-abs mlp-wordmark mlp-wordmark--footer" style={{ left: 19, top: Y(3273) }}>
        <div className="mlp-wordmark-seal">
          <div className="mlp-wordmark-circle">
            <img src={existing.imgEllipse1713} alt="" />
          </div>
        </div>
        <span>aahaa</span>
      </div>
      <p className="mlp-abs" style={{ left: 16, top: Y(3374), margin: 0, transform: "translateY(-100%)", color: "#806f6c", fontSize: 14, lineHeight: 1.09, whiteSpace: "nowrap" }}>
        A little home , alone the way
      </p>
      <div className="mlp-abs mlp-row" style={{ left: 16, top: Y(3390), gap: 22 }}>
        <img src={existing.imgGroup} width={20} height={20} alt="" />
        <img src={existing.imgInstagram201651} width={20} height={20} alt="" />
        <img src={existing.imgX21} width={20} height={18} alt="" />
      </div>
      <hr className="mlp-abs mlp-hairline" style={{ left: 16, top: Y(3428), width: 358 }} />
      <div className="mlp-abs" style={{ left: 16, top: Y(3446), display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: 1.09 }}>Explore</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "#a68882", fontSize: 14, lineHeight: 1.09 }}>
          <span>Our story</span>
          <span>How it works</span>
        </div>
      </div>
      <div className="mlp-abs mlp-hairline-v" style={{ left: "calc(50% - 52px)", top: Y(3451), height: 57 }} />
      <div className="mlp-abs" style={{ left: 186, top: Y(3446), width: 175, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: 1.09 }}>Work with us</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, color: "#a68882", fontSize: 14, lineHeight: 1.09 }}>
          <button type="button" onClick={() => navigate(PATHS.becomeCook)} style={{ border: 0, background: "transparent", color: "inherit", font: "inherit", textAlign: "left", padding: 0, cursor: "pointer" }}>
            Become a cook
          </button>
          <button type="button" onClick={() => navigate(PATHS.becomeDeliveryPartner)} style={{ border: 0, background: "transparent", color: "inherit", font: "inherit", textAlign: "left", padding: 0, cursor: "pointer" }}>
            Become a delivery partner
          </button>
        </div>
      </div>
      <hr className="mlp-abs mlp-hairline" style={{ left: 16, top: Y(3531), width: 358 }} />
      <div className="mlp-abs" style={{ left: 16, top: Y(3549), width: 351, display: "flex", flexDirection: "column", gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, lineHeight: 1.09 }}>Contact us</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p className="mlp-row" style={{ gap: 14, margin: 0, color: "#a68882", fontSize: 14, lineHeight: 1.09 }}>
            <img src={existing.imgLetterStreamlineSolarAr} width={20} height={20} alt="" />
            contact@aahaa.com
          </p>
          <p className="mlp-row" style={{ gap: 14, margin: 0, color: "#a68882", fontSize: 14, lineHeight: 1.09 }}>
            <img src={existing.imgPhoneCallingStreamlineSolarAr} width={20} height={20} alt="" />
            7382987332
          </p>
        </div>
      </div>
      <hr className="mlp-abs mlp-hairline" style={{ left: 16, top: Y(3652), width: 358 }} />

      <div className="mlp-abs" style={{ left: "calc(50% + 3.48px)", top: Y(3711), width: 222.956, height: 222.956, transform: "translateX(-50%)", pointerEvents: "none" }} aria-hidden="true">
        <img className="mlp-abs mlp-mandala" src={imgOrnateFloralMandalaWheel3} alt="" style={{ left: 10.6, top: 10.6, width: 201.672, height: 201.672, opacity: 0.3 }} />
      </div>
      <div className="mlp-abs" style={{ left: "50%", top: Y(3670), width: 252, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, zIndex: 1 }}>
        <div className="mlp-row" style={{ gap: 12, color: "#a68882", fontSize: 12, lineHeight: 1.09 }}>
          <span>Privacy Policy</span>
          <span>Terma & Conditions</span>
        </div>
        <p className="mlp-row" style={{ gap: 12, margin: 0, color: "#a68882", fontSize: 12, lineHeight: 1.09 }}>
          <img src={existing.imgCopyrightStreamlineSolarAr} width={20} height={20} alt="" />
          2026 Aahaa Pvt Ltd . All rights reserved.
        </p>
      </div>
    </main>
    </div>
      <JourneyOverlay
        panel={panel}
        query={query}
        setQuery={setQuery}
        draftFrom={draftFrom}
        setDraftFrom={setDraftFrom}
        draftTo={draftTo}
        setDraftTo={setDraftTo}
        draftPickup={draftPickup}
        setDraftPickup={setDraftPickup}
        draftDate={draftDate}
        setDraftDate={setDraftDate}
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        onClose={closePanel}
        onSaveFrom={() => {
          setFromCity(draftFrom);
          closePanel();
        }}
        onSaveTo={() => {
          setToCity(draftTo);
          closePanel();
        }}
        onSavePickup={() => {
          setPickup(FIXED_PICKUP_POINT);
          setDraftPickup(FIXED_PICKUP_POINT);
          closePanel();
        }}
        onSaveDate={() => {
          setDate(startOfDay(draftDate));
          closePanel();
        }}
      />
    </>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.25" stroke="#FF4B2B" strokeWidth="1.5" />
      <path d="M12 7.75V12.1L15.1 14.15" stroke="#FF4B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SuggestMenu({
  top,
  left = 16,
  className,
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
  top: number;
  left?: number;
  className?: string;
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
    <div
      className={["mlp-abs", "mlp-suggest", className].filter(Boolean).join(" ")}
      style={{ left, top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {recentHits.length > 0 ? (
        <div className="mlp-from-section">
          <div className="mlp-from-section-head">
            <p>Recent searches</p>
            <button type="button" onClick={onClearRecents}>
              Clear all
            </button>
          </div>
          {recentHits.map((item) => (
            <button key={item.title} type="button" className="mlp-from-row" onClick={() => onPick(journeyPickName(item.title))}>
              <span className="mlp-from-row-icon">
                <ClockIcon />
              </span>
              <span className="mlp-from-row-title">{item.title}</span>
              {item.action ? <span className="mlp-from-row-meta">{item.action}</span> : null}
              <img className="mlp-from-row-chevron" src={existing.imgAltArrowDownStreamlineSolarAr} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {showLoading ? (
        <div className="mlp-from-section">
          <div className="mlp-from-section-head">
            <p>Searching…</p>
          </div>
        </div>
      ) : null}
      {showError ? (
        <div className="mlp-from-section">
          <div className="mlp-from-section-head">
            <p>Unable to load places</p>
          </div>
        </div>
      ) : null}
      {showEmpty ? (
        <div className="mlp-from-section">
          <div className="mlp-from-section-head">
            <p>No matching places</p>
          </div>
        </div>
      ) : null}
      {popularHits.length > 0 ? (
        <div className="mlp-from-section">
          <div className="mlp-from-section-head">
            <p>{popularTitle}</p>
          </div>
          {popularHits.map((item) => (
            <button key={item.title} type="button" className="mlp-from-row mlp-from-row--stop" onClick={() => onPick(item.title)}>
              <span className="mlp-from-row-icon">
                <img src={existing.imgMapPointStreamlineSolar} alt="" />
              </span>
              <span className="mlp-from-row-copy">
                <strong>{item.title}</strong>
                <small>{item.city}</small>
              </span>
              <span className="mlp-from-row-meta">{popularMeta}</span>
              <img className="mlp-from-row-chevron" src={existing.imgAltArrowDownStreamlineSolarAr} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function JourneyField({
  left,
  top,
  width,
  label,
  value,
  placeholder,
  icon,
  iconW,
  iconH,
  iconLeft,
  iconTop,
  boxed,
  expanded,
  editable,
  onOpen,
  onFocus,
  onChange,
}: {
  left: number;
  top: number;
  width: number;
  label: string;
  value: string;
  placeholder?: string;
  icon: string;
  iconW: number;
  iconH: number;
  iconLeft: number;
  iconTop: number;
  boxed?: boolean;
  expanded?: boolean;
  editable?: boolean;
  onOpen?: () => void;
  onFocus?: () => void;
  onChange?: (value: string) => void;
}) {
  return (
    <div className="mlp-abs mlp-row mlp-field-btn" style={{ left, top, width, justifyContent: "space-between" }} onClick={editable ? undefined : onOpen}>
      <div className="mlp-row" style={{ gap: 16, minWidth: 0, flex: 1 }}>
        <div style={{ position: "relative", width: 30, height: boxed ? 32 : 29, flex: "none" }}>
          <img src={icon} alt="" style={{ position: "absolute", left: iconLeft, top: iconTop, width: iconW, height: iconH, objectFit: "cover" }} />
        </div>
        {editable ? (
          <label className="mlp-field-copy">
            <span>{label}</span>
            <input value={value} placeholder={placeholder} aria-label={label} onFocus={onFocus} onChange={(event) => onChange?.(event.target.value)} />
          </label>
        ) : (
          <button className="mlp-field-copy mlp-field-copy--btn" type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={onOpen}>
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        )}
      </div>
      <img src={existing.imgAltArrowDownStreamlineSolarAr} width={20} height={20} alt="" />
    </div>
  );
}

function JourneyOverlay({
  panel,
  draftDate,
  setDraftDate,
  viewMonth,
  setViewMonth,
  onClose,
  onSaveDate,
}: {
  panel: JourneyPanel;
  query: string;
  setQuery: (value: string) => void;
  draftFrom: string;
  setDraftFrom: (value: string) => void;
  draftTo: string;
  setDraftTo: (value: string) => void;
  draftPickup: string | null;
  setDraftPickup: (value: string | null) => void;
  draftDate: Date;
  setDraftDate: (value: Date) => void;
  viewMonth: Date;
  setViewMonth: (value: Date) => void;
  onClose: () => void;
  onSaveFrom: () => void;
  onSaveTo: () => void;
  onSavePickup: () => void;
  onSaveDate: () => void;
}) {
  if (panel !== "date") return null;

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const cells = monthCells(viewMonth.getFullYear(), viewMonth.getMonth());

  return (
    <div className="mlp-overlay" onClick={onClose} role="presentation">
      <div
        className="mlp-sheet mlp-sheet--date"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <h2>Choose your journey date</h2>
        <div className="mlp-date-chips">
          <button
            className="mlp-date-chip"
            type="button"
            onClick={() => {
              setDraftDate(today);
              setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));
            }}
          >
            Today
          </button>
          <button
            className="mlp-date-chip"
            type="button"
            onClick={() => {
              setDraftDate(tomorrow);
              setViewMonth(new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1));
            }}
          >
            Tomorrow
          </button>
        </div>
        <div className="mlp-date-nav">
          <button
            className="mlp-date-dir mlp-date-dir--prev"
            type="button"
            aria-label="Previous month"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          >
            <img src={existing.imgAltArrowDownStreamlineSolarAr} alt="" />
          </button>
          <strong>
            {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
          </strong>
          <button
            className="mlp-date-dir mlp-date-dir--next"
            type="button"
            aria-label="Next month"
            onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          >
            <img src={existing.imgAltArrowDownStreamlineSolarAr} alt="" />
          </button>
        </div>
        <div className="mlp-cal">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((label) => (
            <span key={label} className="mlp-cal-wd">
              {label}
            </span>
          ))}
          {cells.map((day, index) => {
            if (!day) return <span key={`empty-${index}`} className="mlp-cal-empty" />;
            const cellDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day);
            const selected = sameDay(cellDate, draftDate);
            const muted = cellDate < today && !selected;
            return (
              <button
                key={day}
                type="button"
                className={`mlp-cal-day${selected ? " is-selected" : ""}${muted ? " is-muted" : ""}`}
                onClick={() => setDraftDate(cellDate)}
              >
                {day}
              </button>
            );
          })}
        </div>
        <p className="mlp-date-selected">{formatSelectedDate(draftDate)}</p>
        <button className="mlp-sheet-confirm" type="button" onClick={onSaveDate}>
          Confirm date
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, left, top, width, nowrap }: { n: string; title: string; left: number; top: number; width: number | string; nowrap?: boolean }) {
  return (
    <div className="mlp-abs mlp-step" style={{ left, top, width }}>
      <div className="mlp-step-seal">
        <img src={existing.imgStepSeal} width={20} height={20} alt="" />
        <span>{n}</span>
      </div>
      <p style={{ margin: 0, color: "#1b513f", fontSize: 11, fontWeight: 500, lineHeight: 1.09, whiteSpace: nowrap ? "nowrap" : undefined }}>{title}</p>
    </div>
  );
}