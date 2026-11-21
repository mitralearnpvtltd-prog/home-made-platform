import { createContext, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import {
  cookLakshmiMenu,
  editBusStop,
  imgBusStop,
  lemonIncPickle,
  lemonIncPotato,
  lemonIncRice,
  metaChefHat,
  metaLeaf,
  metaRiceBowl,
  serveCloche,
} from "./assets/cooks";
import imgKitchenLakshmi from "./assets/mobile-landing/imgKitchenLakshmi.png";
import paymentKitchen from "./assets/payment/payment-kitchen.png";
import paymentCompleteSuccess from "./assets/payment/payment-complete-success.png";
import paymentCompleteInvoice from "./assets/payment/payment-complete-invoice.png";
import * as a from "./assets/landing";
import {
  FIXED_PICKUP_POINT,
  LAKSHMI_MEALS,
  PICKUP_STOPS,
  formatBannerDate,
  formatBarDate,
  formatRupees,
  isBengaluruPlace,
  journeyPickName,
  normalizeJourneySearch,
  pickupMeta,
  type Cook,
  type CookOffer,
  type JourneyChoice,
  type Meal,
  type MealCategory,
} from "./cookData";
import { KitchenHoursNotice } from "./components/KitchenHoursNotice";
import { TrackOrderMap } from "./components/TrackOrderMap";
import { foodDetailGallery } from "./foodDetailGallery";
import {
  missingJourneyCoordLabels,
  resolveOrderJourneyPoints,
} from "./lib/trackingGeo";
import {
  ApiError,
  addCartItem,
  createCashfreePaymentSession,
  createOrder,
  getCart,
  getKitchenDish,
  getMyProfile,
  getNotificationPreferences,
  getUnreadNotificationCount,
  deleteOrder,
  dismissNotification,
  getOrder,
  listNotifications,
  listKitchens,
  listOrders,
  markAllNotificationsRead,
  markNotificationRead,
  removeCartItem,
  updateCartItem,
  updateMyProfile,
  updateNotificationPreferences,
  verifyCashfreePayment,
  type AuthProfile,
  type CustomerNotification,
  type KitchenListItem,
  type NotificationPreferenceCategory,
  type NotificationPreferences,
  type Order,
  type OrderListItem,
  type OrderStatus,
} from "./lib/api";
import {
  clearCheckoutIdempotencyKey,
  getCheckoutIdempotencyKey,
  orderIdFromLocationSearch,
  readActiveOrderId,
  withOrderId,
  writeActiveOrderId,
} from "./lib/activeOrder";
import { openCashfreeHostedCheckout } from "./lib/cashfreeCheckout";
import {
  canRetryPayment,
  isPaymentPaid,
  paymentStatusLabel,
  paymentStatusSummary,
} from "./lib/paymentStatus";
import { readJourneySelection, writeJourneySelection } from "./lib/journeySession";
import {
  FAQ_CATEGORIES,
  getFaqsForSurface,
  type FaqCategory,
  type FaqEntry,
} from "./faqContent";
import {
  SUPPORT_CHAT_QUESTIONS,
  UNSUPPORTED_SUPPORT_CHAT_ANSWER,
} from "./supportChatContent";
import { clearAuthSession, getAccessToken, readCachedProfile, cacheProfile } from "./lib/authSession";
import { cartToBagLines } from "./lib/cartMapping";
import {
  CHECKOUT_DELIVERY_FEE_LIST,
  checkoutGstFromSubtotal,
  checkoutTotalFromSubtotal,
  formatCheckoutMoney,
  formatGstAmount,
} from "./lib/checkoutFees";
import {
  keepServerCartOverGuest,
  mergeGuestCartToServer,
  readGuestCart,
  readGuestCartConflict,
  replaceServerCartWithGuest,
  writeGuestCart,
  type GuestCartConflict,
} from "./lib/guestCart";
import {
  formatProfileEmail,
  formatProfileName,
  formatProfilePhone,
  normalizePhoneDigits,
  profileToFormState,
} from "./lib/profileDisplay";
import { useLocationRecents } from "./lib/useLocationRecents";
import { useLocationSuggest, type LocationSuggestStatus } from "./lib/useLocationSuggest";
import { getKitchenMeals } from "./kitchenMenus";
import {
  mealBagAnimProfile,
  mealBagServingLabel,
  mealBagShowsSteam,
} from "./mealBagFoodImages";
import { MealBagAliveLayers, MealBagThumb } from "./MealBagThumb";
import {
  getMenuKitchenFallback,
  kitchenAllowsMenu,
  kitchenHasReviews,
  kitchenPhoto,
  kitchenRatingDesk,
  kitchenRatingMobile,
  MENU_KITCHEN_FALLBACKS,
  SWATHI_MENU_KITCHEN,
  toMenuKitchen,
  type MenuKitchen,
} from "./menuKitchen";
import {
  kitchenPaths,
  navigate,
  parseKitchenPath,
  PATHS,
  SWATHI_KITCHEN_ID,
  type KitchenPaths,
} from "./navigation";
import { CartPage } from "./CartPage";
import "./styles/cook.css";

type CookFilter = "all" | "meals-snacks" | "snacks";
type CookSort = "default" | "price-asc" | "price-desc";
type MenuTab = "all" | MealCategory;
type JourneyPanel = "from" | "to" | "pickup" | "date" | "time" | null;
type BagLine = { meal: Meal; qty: number; cartItemId?: string };

type KitchenFlowValue = { kitchen: MenuKitchen; routes: KitchenPaths };

const KitchenFlowContext = createContext<KitchenFlowValue>({
  kitchen: SWATHI_MENU_KITCHEN,
  routes: kitchenPaths(SWATHI_KITCHEN_ID),
});

function useKitchenFlow() {
  return useContext(KitchenFlowContext);
}

/** After Cashfree success: desktop Preparing invoice, mobile payment-status, then order summary. */
function postPaymentPreparingRoute(routes: KitchenPaths): string {
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return routes.paymentStatus;
  }
  return routes.invoice;
}

type PaymentMethod = "google-pay" | "phonepe" | "paytm" | "other-upi";


/** Start empty so switching kitchens never inherits another kitchen’s bag. */
const INITIAL_BAG: BagLine[] = [];

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
  const [journey, setJourney] = useState<JourneyChoice>(() => readJourneySelection());
  const [journeyPanel, setJourneyPanel] = useState<JourneyPanel>(null);

  useEffect(() => {
    writeJourneySelection(journey);
  }, [journey]);
  const [kitchenNote, setKitchenNote] = useState("");
  const [pickupName, setPickupName] = useState("");
  const [pickupPhone, setPickupPhone] = useState("");
  const [orderingFor, setOrderingFor] = useState<"myself" | "someone-else" | null>(null);
  const [someoneElseName, setSomeoneElseName] = useState("");
  const [someoneElsePhone, setSomeoneElsePhone] = useState("");
  const [collectionPoint, setCollectionPoint] = useState("Main entrance near bus-stop sign");
  const [busNumber, setBusNumber] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [pickupNote, setPickupNote] = useState("");
  const [pickupConfirmed, setPickupConfirmed] = useState(false);
  const [paymentMethod] = useState<PaymentMethod>("google-pay");
  const [menuKitchen, setMenuKitchen] = useState<MenuKitchen>(SWATHI_MENU_KITCHEN);
  const [kitchenGate, setKitchenGate] = useState<"idle" | "loading" | "ready" | "blocked">("idle");
  const [bagAddedToast, setBagAddedToast] = useState<{ meal: Meal; nonce: number } | null>(null);
  const [bagErrorToast, setBagErrorToast] = useState<{ message: string; nonce: number } | null>(null);
  const [bagThumbPulse, setBagThumbPulse] = useState<Record<string, number>>({});
  const [guestConflict, setGuestConflict] = useState<GuestCartConflict | null>(() => readGuestCartConflict());
  const [guestConflictBusy, setGuestConflictBusy] = useState(false);
  const [guestConflictMessage, setGuestConflictMessage] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placeOrderError, setPlaceOrderError] = useState("");
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  // Pathname-only routing ignores ?orderId=… changes; keep a dedicated search sync.
  const [orderIdParam, setOrderIdParam] = useState(() => orderIdFromLocationSearch());
  const activeKitchenIdRef = useRef<string | null>(null);

  useEffect(() => {
    const syncOrderIdParam = () => setOrderIdParam(orderIdFromLocationSearch());
    window.addEventListener("popstate", syncOrderIdParam);
    return () => window.removeEventListener("popstate", syncOrderIdParam);
  }, []);

  function showBagAddedToast(meal: Meal) {
    const nonce = Date.now();
    setBagErrorToast(null);
    setBagThumbPulse((current) => ({ ...current, [meal.id]: nonce }));
    setBagAddedToast({ meal, nonce });
  }

  function showBagErrorToast(message: string) {
    setBagAddedToast(null);
    setBagErrorToast({ message, nonce: Date.now() });
  }

  function restoreGuestBagForKitchen(kitchenId: string) {
    const guest = readGuestCart();
    if (!guest || guest.kitchenId !== kitchenId) return;
    const meals = getKitchenMeals(kitchenId);
    setBag(
      guest.items
        .map((item) => {
          const meal = meals.find((row) => row.id === item.dishCode);
          return meal ? { meal, qty: item.qty } : null;
        })
        .filter((line): line is BagLine => Boolean(line)),
    );
  }

  function addMealAsGuest(meal: Meal, kitchenId: string) {
    showBagAddedToast(meal);
    setBag((current) => {
      const found = current.find((line) => line.meal.id === meal.id);
      const next = found
        ? current.map((line) => (line.meal.id === meal.id ? { ...line, qty: line.qty + 1 } : line))
        : [...current, { meal, qty: 1 }];
      persistGuestBag(kitchenId, next);
      return next;
    });
  }

  function isAuthFailure(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 401 || error.status === 403);
  }

  const kitchenRoute = parseKitchenPath(path);
  const routeFallback = kitchenRoute ? getMenuKitchenFallback(kitchenRoute.kitchenId) : null;
  // Resolve identity from the URL immediately so switching kitchens never flashes
  // the previous kitchen’s name/catalogue while state catches up.
  const activeKitchen =
    kitchenRoute && routeFallback && menuKitchen.id !== kitchenRoute.kitchenId
      ? routeFallback
      : menuKitchen;
  const routes = useMemo(
    () => kitchenPaths(kitchenRoute?.kitchenId ?? activeKitchen.id ?? SWATHI_KITCHEN_ID),
    [kitchenRoute?.kitchenId, activeKitchen.id],
  );
  const flowValue = useMemo<KitchenFlowValue>(
    () => ({ kitchen: activeKitchen, routes }),
    [activeKitchen, routes],
  );

  function applyCartToBag(kitchenId: string, cart: Awaited<ReturnType<typeof getCart>>) {
    setBag(cartToBagLines(cart, kitchenId));
  }

  function persistGuestBag(kitchenId: string, next: BagLine[]) {
    writeGuestCart(
      kitchenId,
      next.map((line) => ({ dishCode: line.meal.id, qty: line.qty })),
    );
  }

  function keepSavedServerCart() {
    keepServerCartOverGuest();
    setGuestConflict(null);
    setGuestConflictMessage("");
  }

  async function switchToGuestCart() {
    setGuestConflictBusy(true);
    setGuestConflictMessage("");
    const guest = readGuestCart();
    const cart = await replaceServerCartWithGuest();
    setGuestConflictBusy(false);
    if (!cart) {
      setGuestConflictMessage(
        "Could not switch to your guest bag right now. Your guest items are still saved — please try again.",
      );
      setGuestConflict(readGuestCartConflict());
      return;
    }
    setGuestConflict(null);
    if (guest && cart.kitchenId === activeKitchen.id) {
      applyCartToBag(activeKitchen.id, cart);
    } else if (guest) {
      navigate(kitchenPaths(guest.kitchenId).menu);
    }
  }

  function journeyDateIso(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  async function placeOrderFromCheckout(options?: { requirePickupConfirmation?: boolean }) {
    if (placingOrder) return;
    setPlaceOrderError("");

    if (!getAccessToken()) {
      setPlaceOrderError("Please sign in to place your order. Your Meal Bag will be kept until you return.");
      navigate(PATHS.login);
      return;
    }

    const unpaidRetryId = activeOrder?.id
      ?? orderIdFromLocationSearch()
      ?? readActiveOrderId();

    if (bag.length === 0 && !unpaidRetryId) {
      setPlaceOrderError("Your Meal Bag is empty. Add food before placing an order.");
      return;
    }

    const mobileCheckout = window.matchMedia("(max-width: 767px)").matches;
    const cachedProfile = readCachedProfile();
    if (mobileCheckout && path === PATHS.cart && bag.length > 0) {
      if (!orderingFor) {
        setPlaceOrderError("Please choose who will collect your order.");
        return;
      }
      if (!pickupName.trim() || !pickupPhone.trim()) {
        setPlaceOrderError("Please enter the collector’s name and mobile number.");
        return;
      }
    }
    const collectorName =
      pickupName.trim()
      || (mobileCheckout ? (cachedProfile?.fullName?.trim() ?? "") : "");
    const collectorPhone =
      pickupPhone.trim()
      || (mobileCheckout && cachedProfile?.phone ? formatProfilePhone(cachedProfile.phone) : "");

    if (bag.length > 0) {
      if (options?.requirePickupConfirmation) {
        const pickupError = validateDesktopConfirmPickup({
          orderingFor,
          collectorName,
          collectorPhone,
          pickupStopName: journey.pickup.trim() || stop.name,
          collectionPoint,
          journeyDate: journey.date,
          journeyFrom: journey.from,
          journeyTo: journey.to,
          busNumber,
          seatNumber,
          pickupConfirmed,
        });
        if (pickupError) {
          setPlaceOrderError(pickupError);
          return;
        }
      }

      if (!collectorName || !collectorPhone) {
        setPlaceOrderError("Please confirm collector name and mobile number before placing your order.");
        if (!mobileCheckout) navigate(routes.confirmPickup);
        return;
      }

      if (!journey.from.trim() || !journey.to.trim()) {
        setPlaceOrderError("Please select your From locality and To destination before placing an order.");
        navigate(PATHS.editJourney);
        return;
      }
    }

    setPlacingOrder(true);
    try {
      let order = activeOrder;

      if (bag.length > 0) {
        order = await createOrder({
          idempotencyKey: getCheckoutIdempotencyKey(),
          collectorName,
          collectorPhone,
          collectionPoint: collectionPoint.trim() || undefined,
          kitchenNote: kitchenNote.trim() || undefined,
          pickupNote: pickupNote.trim() || undefined,
          pickupStopName: stop.name,
          pickupTime: stop.time,
          journeyFrom: journey.from.trim(),
          journeyTo: journey.to.trim(),
          journeyDate: journeyDateIso(journey.date),
          busNumber: busNumber.trim() || undefined,
          seatNumber: seatNumber.trim() || undefined,
          kitchenId: activeKitchen.id,
        });
        clearCheckoutIdempotencyKey();
        writeActiveOrderId(order.id);
        setActiveOrder(order);
        setBag([]);
      } else if (unpaidRetryId) {
        order = await getOrder(unpaidRetryId);
        writeActiveOrderId(order.id);
        setActiveOrder(order);
      }

      if (!order) {
        throw new Error("Could not find an order to pay for.");
      }

      if (order.paymentStatus === "paid") {
        // Paid orders go through Preparing invoice → Order summary.
        navigate(withOrderId(postPaymentPreparingRoute(routes), order.id));
        return;
      }

      // Mobile cart and desktop both open Cashfree hosted checkout directly.
      // Cashfree controls the UI (UPI Intent on mobile, UPI QR on desktop).
      const session = await createCashfreePaymentSession(order.id);
      await openCashfreeHostedCheckout({
        paymentSessionId: session.paymentSessionId,
        mode: session.environment,
      });
      // Hosted checkout with redirectTarget=_self normally leaves this page.
      // If it returns (popup/modal edge cases), verify with the backend.
      const verified = await verifyCashfreePayment(order.id);
      const refreshed = await getOrder(order.id);
      setActiveOrder(refreshed);
      navigate(
        withOrderId(
          verified.paymentStatus === "paid"
            ? postPaymentPreparingRoute(routes)
            : routes.paymentReturn,
          order.id,
        ),
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setPlaceOrderError("Please sign in again, then retry Pay with Cashfree.");
        navigate(PATHS.login);
      } else {
        setPlaceOrderError(
          error instanceof Error
            ? error.message
            : "Could not start payment. Please try again.",
        );
      }
    } finally {
      setPlacingOrder(false);
    }
  }

  function addMeal(meal: Meal) {
    const token = getAccessToken();
    const kitchenId = activeKitchen.id;

    if (!token) {
      // Guests keep a session Meal Bag (no login forced). Merged after login.
      addMealAsGuest(meal, kitchenId);
      return;
    }

    // Signed-in: only toast after the server accepts the add (no fake success).
    void (async () => {
      try {
        const cart = await addCartItem({ kitchenId, dishCode: meal.id });
        applyCartToBag(kitchenId, cart);
        showBagAddedToast(meal);
      } catch (error) {
        // Expired/invalid sessions used to fail silently — clear auth and keep Add working as guest.
        if (isAuthFailure(error)) {
          clearAuthSession();
          addMealAsGuest(meal, kitchenId);
          return;
        }
        showBagErrorToast(
          error instanceof Error ? error.message : "Could not add to your Meal Bag. Please try again.",
        );
      }
    })();
  }

  function setQty(id: string, qty: number) {
    const existing = bag.find((line) => line.meal.id === id);
    const increasing = Boolean(existing && qty > existing.qty);

    const token = getAccessToken();
    if (!token) {
      if (increasing && existing) {
        showBagAddedToast(existing.meal);
      }
      setBag((current) => {
        const next =
          qty <= 0
            ? current.filter((line) => line.meal.id !== id)
            : current.map((line) => (line.meal.id === id ? { ...line, qty } : line));
        persistGuestBag(activeKitchen.id, next);
        return next;
      });
      return;
    }

    if (!existing?.cartItemId) {
      // Signed-in UI can briefly hold guest-only lines (no server item id). Keep qty local.
      if (increasing && existing) {
        showBagAddedToast(existing.meal);
      }
      setBag((current) => {
        const next =
          qty <= 0
            ? current.filter((line) => line.meal.id !== id)
            : current.map((line) => (line.meal.id === id ? { ...line, qty } : line));
        persistGuestBag(activeKitchen.id, next);
        return next;
      });
      return;
    }

    const kitchenId = activeKitchen.id;
    const itemId = existing.cartItemId;
    const mealForToast = existing.meal;
    void (async () => {
      try {
        const cart =
          qty <= 0
            ? await removeCartItem(itemId)
            : await updateCartItem(itemId, { quantity: qty });
        applyCartToBag(kitchenId, cart);
        if (increasing) {
          showBagAddedToast(mealForToast);
        }
      } catch (error) {
        if (isAuthFailure(error)) {
          clearAuthSession();
          if (increasing && mealForToast) {
            showBagAddedToast(mealForToast);
          }
          setBag((current) => {
            const next =
              qty <= 0
                ? current.filter((line) => line.meal.id !== id)
                : current.map((line) => (line.meal.id === id ? { ...line, qty } : line));
            persistGuestBag(kitchenId, next);
            return next;
          });
          return;
        }
        showBagErrorToast(
          error instanceof Error ? error.message : "Could not update your Meal Bag. Please try again.",
        );
      }
    })();
  }

  useEffect(() => {
    if (!kitchenRoute) {
      setKitchenGate("idle");
      return;
    }

    const kitchenId = kitchenRoute.kitchenId;
    const fallback = getMenuKitchenFallback(kitchenId);

    // Known catalogue kitchens render immediately from seed identity so a slow
    // kitchens API never blocks the shared menu shell.
    if (activeKitchenIdRef.current && activeKitchenIdRef.current !== kitchenId) {
      setBag([]);
      setBagThumbPulse({});
      setBagAddedToast(null);
    }
    activeKitchenIdRef.current = kitchenId;

    if (fallback) {
      setMenuKitchen((current) => (current.id === kitchenId ? current : fallback));
      setKitchenGate("ready");
    } else {
      setKitchenGate("loading");
    }

    const controller = new AbortController();

    // Signed-in passengers: restore persisted Meal Bag; never wipe a guest bag silently.
    if (getAccessToken()) {
      void (async () => {
        const mergeResult = await mergeGuestCartToServer();
        if (controller.signal.aborted) return;
        if (mergeResult === "conflict") {
          setGuestConflict(readGuestCartConflict());
        } else if (mergeResult === "merged") {
          setGuestConflict(null);
        }
        try {
          const cart = await getCart(controller.signal);
          if (controller.signal.aborted) return;
          if (cart.kitchenId === kitchenId) {
            applyCartToBag(kitchenId, cart);
          }
        } catch (error) {
          // Expired sessions previously blocked guest restore — fall back to device Meal Bag.
          if (isAuthFailure(error)) {
            clearAuthSession();
            restoreGuestBagForKitchen(kitchenId);
            return;
          }
          // Offline / migration-not-applied: keep local bag behavior.
          restoreGuestBagForKitchen(kitchenId);
        }
      })();
    } else if (fallback) {
      // Guests: restore this kitchen's session Meal Bag (no login required).
      restoreGuestBagForKitchen(kitchenId);
    }

    void (async () => {
      try {
        const rows = await listKitchens(controller.signal);
        if (controller.signal.aborted) return;
        const row = rows.find((item) => item.id === kitchenId);
        if (!row) {
          if (fallback) {
            setMenuKitchen(fallback);
            setKitchenGate("ready");
            return;
          }
          setKitchenGate("blocked");
          navigate(PATHS.cooks);
          return;
        }
        if (!row.hasMenu && !kitchenAllowsMenu(kitchenId)) {
          setKitchenGate("blocked");
          navigate(PATHS.cooks);
          return;
        }
        setMenuKitchen(toMenuKitchen(row));
        setKitchenGate("ready");
      } catch {
        if (controller.signal.aborted) return;
        if (fallback) {
          setMenuKitchen(fallback);
          setKitchenGate("ready");
          return;
        }
        setKitchenGate("blocked");
        navigate(PATHS.cooks);
      }
    })();

    return () => controller.abort();
  }, [kitchenRoute?.kitchenId]);

  const bagCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const stop = pickupMeta(journey.pickup);
  const returnTo = useRef<string>(PATHS.cooks);
  const paymentBackTo = useRef<string>(routes.confirmPickup);
  const confirmPickupBackTo = useRef<string>(routes.reviewOrder);

  // Desktop meal-bag page removed: skip straight to confirm pickup if that route is hit.
  useEffect(() => {
    if (kitchenRoute?.page !== "meal-bag") return;
    if (window.matchMedia("(max-width: 767px)").matches) return;
    confirmPickupBackTo.current = routes.menu;
    navigate(routes.confirmPickup, { replace: true });
  }, [kitchenRoute?.page, navigate, routes.confirmPickup, routes.menu]);
  const editing = path === PATHS.editJourney;
  const kitchenPage = kitchenRoute?.page ?? null;
  const mealDetail = kitchenPage === "dish";
  const mealDetailId = kitchenRoute?.mealId ?? null;
  const mealBagPage = kitchenPage === "meal-bag";
  const reviewOrderPage = kitchenPage === "review";
  const confirmPickupPage = kitchenPage === "pickup";
  const paymentMethodPage = kitchenPage === "payment";
  const paymentReturnPage = kitchenPage === "payment-return";
  const paymentStatusPage = kitchenPage === "payment-status";
  const invoicePage = kitchenPage === "invoice";
  const orderSummaryPage = kitchenPage === "order-summary";
  const trackOrderPage = kitchenPage === "track-order";
  const menuPage = kitchenPage === "menu";
  const profilePage = path === PATHS.profile;
  const accountDetailsPage = path === PATHS.accountDetails;
  const myOrdersPage = path === PATHS.myOrders;
  const notificationsPage = path === PATHS.notifications;
  const settingsPage = path === PATHS.appSettings;
  const helpSupportPage = path === PATHS.helpSupport;
  const faqsPage = path === PATHS.faqs;
  const chatSupportPage = path === PATHS.chatSupport;
  const emailSupportPage = path === PATHS.emailSupport;
  const reportIssuePage = path === PATHS.reportIssue;
  const safetyGuidelinesPage = path === PATHS.safetyGuidelines;
  const aboutPage = path === PATHS.about;
  const logoutPage = path === PATHS.logout;
  const accountPage = profilePage || accountDetailsPage || myOrdersPage || notificationsPage || settingsPage || helpSupportPage || faqsPage || chatSupportPage || emailSupportPage || reportIssuePage || safetyGuidelinesPage || aboutPage || logoutPage;
  const onMenu = menuPage || mealDetail;
  // Never block known catalogue kitchens on a slow/hung kitchens API call.
  const kitchenFlowLoading =
    kitchenRoute !== null &&
    kitchenGate === "loading" &&
    !kitchenAllowsMenu(kitchenRoute.kitchenId);

  useEffect(() => {
    if (path === PATHS.cooks || menuPage) returnTo.current = path;
  }, [path, menuPage]);

  useEffect(() => {
    const needsOrder =
      paymentReturnPage || paymentStatusPage || invoicePage || orderSummaryPage || trackOrderPage;
    if (!needsOrder) return;

    const orderId =
      orderIdParam || readActiveOrderId() || activeOrder?.id || null;
    if (!orderId) return;
    if (activeOrder?.id === orderId) return;
    if (!getAccessToken()) return;

    const controller = new AbortController();
    void (async () => {
      try {
        const order = await getOrder(orderId, controller.signal);
        if (controller.signal.aborted) return;
        writeActiveOrderId(order.id);
        setActiveOrder(order);
      } catch {
        if (controller.signal.aborted) return;
      }
    })();
    return () => controller.abort();
  }, [
    path,
    paymentReturnPage,
    paymentStatusPage,
    invoicePage,
    orderSummaryPage,
    trackOrderPage,
    orderIdParam,
    activeOrder?.id,
  ]);

  const pageClass = mealDetail
    ? "ck-page ck-page--menu ck-page--meal"
    : menuPage
      ? "ck-page ck-page--menu"
      : reviewOrderPage || confirmPickupPage
        || paymentMethodPage || paymentReturnPage || paymentStatusPage || invoicePage || orderSummaryPage || trackOrderPage
        ? "ck-page ck-page--checkout"
        : accountPage
          ? `ck-page ck-page--profile${myOrdersPage ? " ck-page--orders" : ""}`
      : path === PATHS.editJourney
        ? "ck-page ck-page--edit"
        : "ck-page";

  if (path === PATHS.cart) {
    const guestCartKitchenId = readGuestCart()?.kitchenId;
    const cartKitchen =
      (guestCartKitchenId ? getMenuKitchenFallback(guestCartKitchenId) : null)
      ?? activeKitchen;
    return (
      <KitchenFlowContext.Provider value={flowValue}>
        <CartPage
          bag={bag}
          kitchen={cartKitchen}
          journey={journey}
          setJourney={setJourney}
          stop={stop}
          setQty={setQty}
          bagThumbPulse={bagThumbPulse}
          orderingFor={orderingFor}
          setOrderingFor={setOrderingFor}
          pickupName={pickupName}
          setPickupName={setPickupName}
          pickupPhone={pickupPhone}
          setPickupPhone={setPickupPhone}
          someoneElseName={someoneElseName}
          setSomeoneElseName={setSomeoneElseName}
          someoneElsePhone={someoneElsePhone}
          setSomeoneElsePhone={setSomeoneElsePhone}
          placingOrder={placingOrder}
          placeOrderError={placeOrderError}
          onBack={() => navigate(PATHS.cooks)}
          onEditJourney={() => navigate(PATHS.editJourney)}
          onProceed={() => {
            paymentBackTo.current = PATHS.cart;
            // Mobile: create/reuse order + session, then open Cashfree hosted checkout.
            // Desktop cart keeps the existing payment page navigation.
            if (window.matchMedia("(max-width: 767px)").matches) {
              void placeOrderFromCheckout();
              return;
            }
            navigate(routes.paymentMethod);
          }}
        />
      </KitchenFlowContext.Provider>
    );
  }

  return (
    <KitchenFlowContext.Provider value={flowValue}>
    <div className={pageClass}>
      {bagAddedToast ? (
        <MealBagAddedToast
          key={bagAddedToast.nonce}
          meal={bagAddedToast.meal}
          onClose={() => setBagAddedToast(null)}
        />
      ) : null}
      {bagErrorToast ? (
        <MealBagErrorToast
          key={bagErrorToast.nonce}
          message={bagErrorToast.message}
          onClose={() => setBagErrorToast(null)}
        />
      ) : null}
      <CookHeader
        bagCount={onMenu || mealBagPage || reviewOrderPage || confirmPickupPage || paymentMethodPage || paymentReturnPage || paymentStatusPage || invoicePage || orderSummaryPage || trackOrderPage || myOrdersPage ? bagCount : 0}
        hideCart={accountPage && !myOrdersPage}
        profilePage={accountPage}
        hideProfileOnMobile={
          accountPage || trackOrderPage || path === PATHS.cooks || menuPage || mealDetail || confirmPickupPage
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
              ? routes.mealBag
              : accountDetailsPage
                ? PATHS.profile
                : mealDetail || mealBagPage
              ? routes.menu
              : PATHS.cooks
        }
      />
      {editing ? <div className="ck-edit-hairline" /> : null}
      {editing ? (
        <EditJourney journey={journey} setJourney={setJourney} returnTo={returnTo.current} />
      ) : (
        <>
          {accountPage ? null : <JourneyBar journey={journey} setJourney={setJourney} panel={journeyPanel} setPanel={setJourneyPanel} />}
          {path === PATHS.cooks ? <KitchenHoursNotice /> : null}
          {accountDetailsPage ? (
            <AccountDetailsPage />
          ) : profilePage ? (
            <ProfilePage
              onPaymentMethods={() => {
                paymentBackTo.current = PATHS.profile;
                navigate(routes.paymentMethod);
              }}
            />
          ) : myOrdersPage ? (
            <MyOrdersPage />
          ) : notificationsPage ? (
            <NotificationsPage />
          ) : settingsPage ? (
            <AppSettingsPage />
          ) : helpSupportPage ? (
            <HelpSupportPage />
          ) : faqsPage ? (
            <FaqsPage />
          ) : chatSupportPage ? (
            <MobileChatSupportPage />
          ) : emailSupportPage ? (
            <MobileEmailSupportPage />
          ) : reportIssuePage ? (
            <MobileReportIssuePage />
          ) : safetyGuidelinesPage ? (
            <MobileSafetyGuidelinesPage />
          ) : aboutPage ? (
            <AboutAahaaPage />
          ) : logoutPage ? (
            <LogoutPage />
          ) : mealDetail && mealDetailId ? (
            <FoodDetail
              mealId={mealDetailId}
              bag={bag}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
            />
          ) : kitchenFlowLoading ? (
            <p className="ck-empty" style={{ padding: "2rem" }}>Loading kitchen…</p>
          ) : menuPage ? (
            <KitchenMenu
              kitchen={activeKitchen}
              bag={bag}
              bagThumbPulse={bagThumbPulse}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
              onContinue={() => {
                const mobile = window.matchMedia("(max-width: 767px)").matches;
                if (mobile) {
                  navigate(PATHS.cart);
                  return;
                }
                confirmPickupBackTo.current = routes.menu;
                navigate(routes.confirmPickup);
              }}
              guestConflict={guestConflict}
              guestConflictBusy={guestConflictBusy}
              guestConflictMessage={guestConflictMessage}
              onKeepServerCart={keepSavedServerCart}
              onSwitchToGuestCart={() => void switchToGuestCart()}
            />
          ) : mealBagPage ? (
            // Desktop meal-bag page commented out — redirected to confirm pickup above.
            // Mobile still uses this page before review order.
            window.matchMedia("(max-width: 767px)").matches ? (
            <MealBagPage
              bag={bag}
              bagThumbPulse={bagThumbPulse}
              addMeal={addMeal}
              setQty={setQty}
              journey={journey}
              stop={stop}
              kitchenNote={kitchenNote}
              setKitchenNote={setKitchenNote}
              guestConflict={guestConflict}
              guestConflictBusy={guestConflictBusy}
              guestConflictMessage={guestConflictMessage}
              onKeepServerCart={keepSavedServerCart}
              onSwitchToGuestCart={() => void switchToGuestCart()}
              onContinue={() => {
                const mobile = window.matchMedia("(max-width: 767px)").matches;
                confirmPickupBackTo.current = mobile ? routes.reviewOrder : routes.mealBag;
                navigate(mobile ? routes.reviewOrder : routes.confirmPickup);
              }}
            />
            ) : null
          ) : reviewOrderPage ? (
            <ReviewOrderPage
              bag={bag}
              journey={journey}
              stop={stop}
              kitchenNote={kitchenNote}
              onContinue={() => {
                const mobile = window.matchMedia("(max-width: 767px)").matches;
                if (mobile) {
                  paymentBackTo.current = routes.reviewOrder;
                  navigate(routes.paymentMethod);
                  return;
                }
                confirmPickupBackTo.current = routes.reviewOrder;
                navigate(routes.confirmPickup);
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
              orderingFor={orderingFor}
              setOrderingFor={setOrderingFor}
              someoneElseName={someoneElseName}
              setSomeoneElseName={setSomeoneElseName}
              someoneElsePhone={someoneElsePhone}
              setSomeoneElsePhone={setSomeoneElsePhone}
              collectionPoint={collectionPoint}
              setCollectionPoint={setCollectionPoint}
              busNumber={busNumber}
              setBusNumber={setBusNumber}
              seatNumber={seatNumber}
              setSeatNumber={setSeatNumber}
              pickupNote={pickupNote}
              setPickupNote={setPickupNote}
              pickupConfirmed={pickupConfirmed}
              setPickupConfirmed={setPickupConfirmed}
              backTo={confirmPickupBackTo.current}
              placingOrder={placingOrder}
              placeOrderError={placeOrderError}
              onContinue={() => {
                const mobile = window.matchMedia("(max-width: 767px)").matches;
                if (mobile) {
                  paymentBackTo.current = routes.confirmPickup;
                  navigate(routes.paymentMethod);
                  return;
                }
                // Desktop: skip the intermediate Pay with Cashfree page and open hosted checkout.
                void placeOrderFromCheckout({ requirePickupConfirmation: true });
              }}
            />
          ) : paymentMethodPage ? (
            <PaymentMethodPage
              bag={bag}
              unpaidOrder={activeOrder}
              backTo={paymentBackTo.current}
              placingOrder={placingOrder}
              placeOrderError={placeOrderError}
              onPay={() => void placeOrderFromCheckout()}
            />
          ) : paymentReturnPage ? (
            <PaymentReturnPage
              order={activeOrder}
              onRetryPayment={() => void placeOrderFromCheckout()}
              retrying={placingOrder}
              retryError={placeOrderError}
            />
          ) : paymentStatusPage ? (
            window.matchMedia("(max-width: 767px)").matches ? (
              <MobilePaymentStatusPage
                order={activeOrder}
                bag={bag}
                journey={journey}
                stop={stop}
                onComplete={(orderId) => navigate(withOrderId(routes.orderSummary, orderId))}
              />
            ) : (
              <PreparingInvoicePage
                order={activeOrder}
                bag={bag}
                onComplete={(orderId) => navigate(withOrderId(routes.orderSummary, orderId))}
              />
            )
          ) : invoicePage ? (
            window.matchMedia("(max-width: 767px)").matches ? (
              <MobileOrderInvoice
                order={activeOrder}
                bag={bag}
                journey={journey}
                stop={stop}
                paymentMethod={paymentMethod}
              />
            ) : (
              <PreparingInvoicePage
                order={activeOrder}
                bag={bag}
                onComplete={(orderId) => navigate(withOrderId(routes.orderSummary, orderId))}
              />
            )
          ) : orderSummaryPage ? (
            <OrderSummaryPage
              order={activeOrder}
              bag={bag}
              journey={journey}
              stop={stop}
              pickupName={pickupName}
              pickupPhone={pickupPhone}
              busNumber={busNumber}
              seatNumber={seatNumber}
              paymentMethod={paymentMethod}
            />
          ) : trackOrderPage ? (
            <TrackOrderPage order={activeOrder} bag={bag} stop={stop} journey={journey} />
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
    </KitchenFlowContext.Provider>
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
            aria-label={bagCount > 0 ? `${bagCount} items in your cart` : "Your cart"}
            onClick={() => {
              if (window.matchMedia("(max-width: 767px)").matches) {
                navigate(PATHS.cart);
              }
            }}
            style={{ border: 0, padding: 0, background: "transparent", cursor: "pointer" }}
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
  const [viewMonth, setViewMonth] = useState(() => new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
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

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!barRef.current?.contains(event.target as Node)) {
        setPanel(null);
        setSuggest(null);
        setTyped(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanel(null);
        setSuggest(null);
        setTyped(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [setPanel]);

  function toggleDate() {
    setSuggest(null);
    setTyped(false);
    setPanel(panel === "date" ? null : "date");
    setViewMonth(new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
  }

  return (
    <div className="ck-journey" ref={barRef} aria-label="Selected journey">
      <JourneySelect
        area="from"
        icon={<img src={a.imgBoardingTheCityBus11} alt="" />}
        label="From"
        value={journey.from}
        editable
        onFocus={() => {
          setPanel(null);
          setSuggest("from");
          setTyped(false);
        }}
        onChange={(next) => {
          setJourney((current) => ({ ...current, from: next }));
          setPanel(null);
          setSuggest("from");
          setTyped(true);
        }}
      >
        {showFromSuggest ? (
          <JourneyPlaceSuggest
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
        editable
        onFocus={() => {
          setPanel(null);
          setSuggest("to");
          setTyped(false);
        }}
        onChange={(next) => {
          setJourney((current) => ({ ...current, to: next }));
          setPanel(null);
          setSuggest("to");
          setTyped(true);
        }}
      >
        {showToSuggest ? (
          <JourneyPlaceSuggest
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
      </JourneySelect>

      <span className="ck-journey-rule ck-journey-rule--1" aria-hidden="true" />

      <JourneySelect
        area="pickup"
        icon={<img src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />}
        label="Pickup point"
        value={FIXED_PICKUP_POINT}
        editable
        chevron
        onFocus={() => {
          setPanel(null);
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
          setPanel(null);
          setSuggest(null);
          setTyped(false);
        }}
      />

      <JourneySelect
        area="date"
        icon={<img src={a.imgColorfulCalendarIconWithCheckmark1} alt="" />}
        label="Date of journey"
        value={formatBarDate(journey.date)}
        open={panel === "date"}
        onToggle={toggleDate}
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
  editable,
  onFocus,
  onChange,
  chevron,
  wide,
  children,
}: {
  area?: "from" | "to" | "pickup" | "date";
  icon: ReactNode;
  label: string;
  value: string;
  open?: boolean;
  onToggle?: () => void;
  editable?: boolean;
  onFocus?: () => void;
  onChange?: (value: string) => void;
  chevron?: boolean;
  wide?: boolean;
  children?: ReactNode;
}) {
  const classes = ["ck-journey-dd"];
  if (wide) classes.push("ck-journey-dd--wide");
  if (area) classes.push(`ck-journey-dd--${area}`);
  return (
    <div className={classes.join(" ")}>
      {editable ? (
        <label className="ck-journey-field ck-journey-field--input">
          {icon}
          <span>
            <small>{label}</small>
            <input value={value} aria-label={label} onFocus={onFocus} onChange={(event) => onChange?.(event.target.value)} />
          </span>
          {chevron ? <ChevronIcon className="ck-chevron" /> : null}
        </label>
      ) : (
        <button className="ck-journey-field" type="button" aria-expanded={open} aria-haspopup="listbox" onClick={onToggle}>
          {icon}
          <span>
            <small>{label}</small>
            <strong>{value}</strong>
          </span>
          {chevron ? <ChevronIcon className="ck-chevron" /> : null}
        </button>
      )}
      {editable ? children : open ? <div className="ck-dd">{children}</div> : null}
    </div>
  );
}

function JourneyPlaceSuggest({
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
    <div className="ck-suggest" onMouseDown={(event) => event.preventDefault()}>
      {recentHits.length > 0 ? (
        <div className="ck-suggest-section">
          <div className="ck-suggest-head">
            <p>Recent searches</p>
            <button type="button" onClick={onClearRecents}>
              Clear all
            </button>
          </div>
          {recentHits.map((item) => (
            <button key={item.title} type="button" className="ck-suggest-row" onClick={() => onPick(journeyPickName(item.title))}>
              <span className="ck-suggest-icon">
                <SuggestClockIcon />
              </span>
              <span className="ck-suggest-title">{item.title}</span>
              {item.action ? <span className="ck-suggest-meta">{item.action}</span> : null}
              <img className="ck-suggest-chevron" src={a.imgAltArrowDownStreamlineSolarAr} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      {showLoading ? (
        <div className="ck-suggest-section">
          <div className="ck-suggest-head">
            <p>Searching…</p>
          </div>
        </div>
      ) : null}
      {showError ? (
        <div className="ck-suggest-section">
          <div className="ck-suggest-head">
            <p>Unable to load places</p>
          </div>
        </div>
      ) : null}
      {showEmpty ? (
        <div className="ck-suggest-section">
          <div className="ck-suggest-head">
            <p>No matching places</p>
          </div>
        </div>
      ) : null}
      {popularHits.length > 0 ? (
        <div className="ck-suggest-section">
          <div className="ck-suggest-head">
            <p>{popularTitle}</p>
          </div>
          {popularHits.map((item) => (
            <button key={item.title} type="button" className="ck-suggest-row ck-suggest-row--stop" onClick={() => onPick(item.title)}>
              <span className="ck-suggest-icon">
                <img src={a.imgMapPointStreamlineSolar} alt="" />
              </span>
              <span className="ck-suggest-copy">
                <strong>{item.title}</strong>
                <small>{item.city}</small>
              </span>
              <span className="ck-suggest-meta">{popularMeta}</span>
              <img className="ck-suggest-chevron" src={a.imgAltArrowDownStreamlineSolarAr} alt="" />
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

function mapKitchenToCook(item: KitchenListItem): Cook {
  const offer: CookOffer = item.offerType === "snacks" ? "snacks" : "meals-snacks";
  return {
    id: item.id,
    name: item.name,
    blurb: item.blurb?.trim() || "",
    offerLabel: item.offerLabel?.trim() || "",
    offer,
    fromPrice: item.fromPrice ?? 0,
    pickupLabel: "Available from 6:00 PM to 9:00 PM",
    photo: item.photoUrl?.trim() || "",
    hasMenu: item.hasMenu || kitchenAllowsMenu(item.id),
  };
}

/** Catalogue seed kitchens for listing when the kitchens API is empty or unavailable. */
function catalogueListingCooks(): Cook[] {
  return Object.values(MENU_KITCHEN_FALLBACKS).map((kitchen) => ({
    id: kitchen.id,
    name: kitchen.name,
    blurb: kitchen.blurb,
    offerLabel: kitchen.offerLabel,
    offer: "meals-snacks" as CookOffer,
    fromPrice: kitchen.fromPrice ?? 0,
    pickupLabel: "Available from 6:00 PM to 9:00 PM",
    photo: kitchen.photoUrl,
    hasMenu: kitchen.hasMenu || kitchenAllowsMenu(kitchen.id),
  }));
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
  const [kitchens, setKitchens] = useState<Cook[]>([]);
  const [listStatus, setListStatus] = useState<"loading" | "ready" | "error">("loading");
  const [listError, setListError] = useState("");
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!sortRef.current?.contains(event.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setListStatus("loading");
    setListError("");

    void (async () => {
      try {
        const rows = await listKitchens(controller.signal);
        if (controller.signal.aborted) return;
        const mapped = rows.map(mapKitchenToCook);
        setKitchens(mapped.length ? mapped : catalogueListingCooks());
        setListStatus("ready");
        setListError("");
      } catch (error) {
        if (controller.signal.aborted) return;
        // Keep the four catalogue kitchens browsable offline / when the API fails.
        setKitchens(catalogueListingCooks());
        setListError(
          error instanceof ApiError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Unable to load kitchens",
        );
        setListStatus("ready");
      }
    })();

    return () => controller.abort();
  }, []);

  const cooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let list = kitchens.filter((cook) => {
      if (needle && !cook.name.toLowerCase().includes(needle)) return false;
      if (filter === "snacks") return cook.offer === "snacks";
      if (filter === "meals-snacks") return cook.offer === "meals-snacks";
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((left, right) => left.fromPrice - right.fromPrice);
    if (sort === "price-desc") list = [...list].sort((left, right) => right.fromPrice - left.fromPrice);
    return list;
  }, [filter, kitchens, query, sort]);

  const sortLabel = sort === "price-asc" ? "Price: low to high" : sort === "price-desc" ? "Price: high to low" : "Sort by";
  const availableCount = listStatus === "ready" ? cooks.length : kitchens.length;

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
              <PeopleIcon />
              {listStatus === "ready" ? `${kitchens.length} home cook${kitchens.length === 1 ? "" : "s"}` : "4 home cooks"}
            </span>
            <span className="ck-stat-veg">
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
        <p className="ck-count">
          {listStatus === "loading"
            ? "Loading cooks…"
            : `${availableCount} cook${availableCount === 1 ? "" : "s"} available`}
        </p>
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
          <Chip pressed={filter === "meals-snacks"} onClick={() => setFilter("meals-snacks")}>
            Meals & snacks
          </Chip>
          <Chip pressed={filter === "snacks"} onClick={() => setFilter("snacks")}>
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

      {listStatus === "loading" ? (
        <p className="ck-empty">Loading home cooks…</p>
      ) : listStatus === "error" ? (
        <p className="ck-empty">{listError || "Unable to load home cooks right now."}</p>
      ) : cooks.length === 0 ? (
        <p className="ck-empty">No home cooks match this search.</p>
      ) : (
        <div className="ck-cook-grid">
          {cooks.map((cook) => (
            <CookCard key={cook.id} cook={cook} />
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

function CookCard({ cook }: { cook: Cook }) {
  return (
    <article
      className={cook.hasMenu ? "ck-cook-card ck-cook-card--link" : "ck-cook-card"}
      onClick={cook.hasMenu ? () => navigate(kitchenPaths(cook.id).menu) : undefined}
      onKeyDown={
        cook.hasMenu
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(kitchenPaths(cook.id).menu);
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
            <span>Available from 6:00 PM to 9:00 PM</span>
          </span>
          {cook.hasMenu ? (
            <button
              className="ck-view-menu"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                navigate(kitchenPaths(cook.id).menu);
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

function GuestCartConflictNotice({
  conflict,
  busy,
  message,
  onKeepServerCart,
  onSwitchToGuestCart,
}: {
  conflict: GuestCartConflict;
  busy: boolean;
  message: string;
  onKeepServerCart: () => void;
  onSwitchToGuestCart: () => void;
}) {
  const guestKitchen = getMenuKitchenFallback(conflict.guestKitchenId)?.name ?? "another kitchen";
  const serverKitchen = getMenuKitchenFallback(conflict.serverKitchenId)?.name ?? "your saved kitchen";
  return (
    <div className="ck-bag-hint" role="status" style={{ margin: "0.75rem 0", lineHeight: 1.4 }}>
      <p style={{ margin: "0 0 0.5rem" }}>
        Your saved Meal Bag is from <strong>{serverKitchen}</strong>, but you also have guest items from{" "}
        <strong>{guestKitchen}</strong>. Choose which bag to keep — nothing is discarded until you decide.
      </p>
      {message ? <p style={{ margin: "0 0 0.5rem" }}>{message}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <button type="button" className="ck-continue" disabled={busy} onClick={onKeepServerCart}>
          Keep saved bag
        </button>
        <button type="button" className="ck-back" disabled={busy} onClick={onSwitchToGuestCart}>
          {busy ? "Switching…" : "Use guest bag"}
        </button>
      </div>
    </div>
  );
}

function KitchenMenu({
  kitchen,
  bag,
  bagThumbPulse,
  addMeal,
  setQty,
  journey,
  stop,
  onContinue,
  guestConflict,
  guestConflictBusy,
  guestConflictMessage,
  onKeepServerCart,
  onSwitchToGuestCart,
}: {
  kitchen: MenuKitchen;
  bag: BagLine[];
  bagThumbPulse: Record<string, number>;
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  onContinue: () => void;
  guestConflict: GuestCartConflict | null;
  guestConflictBusy: boolean;
  guestConflictMessage: string;
  onKeepServerCart: () => void;
  onSwitchToGuestCart: () => void;
}) {
  const [tab, setTab] = useState<MenuTab>("all");
  const [query, setQuery] = useState("");
  const photo = kitchenPhoto(kitchen, cookLakshmiMenu);
  const ratingDesk = kitchenRatingDesk(kitchen);
  const ratingMobile = kitchenRatingMobile(kitchen);
  const hasReviews = kitchenHasReviews(kitchen);
  const showVegetarian = kitchen.isVegetarian === true;
  const catalogue = useMemo(() => getKitchenMeals(kitchen.id), [kitchen.id]);

  const meals = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return catalogue.filter((meal) => {
      if (tab !== "all" && meal.category !== tab) return false;
      if (needle && !`${meal.name} ${meal.description} ${meal.pack ?? ""}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [catalogue, query, tab]);

  const favourites = meals.filter((meal) => meal.category !== "snacks");
  const snacks = meals.filter((meal) => meal.category === "snacks");
  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const bagCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const allCount = catalogue.length;
  const mealCount = catalogue.filter((meal) => meal.category === "meals").length;
  const snackCount = catalogue.filter((meal) => meal.category === "snacks").length;

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
        <strong>{kitchen.name}</strong>
        <button className="ck-back" type="button" onClick={() => navigate(PATHS.cooks)}>
          Back to cooks
        </button>
      </div>

      <KitchenHoursNotice className="aahaa-kitchen-hours--in-main" />

      <section className="ck-kitchen-head">
        <div className="ck-kitchen-photo">
          <img src={photo} alt="" />
        </div>
        <div>
          <h1>
            {kitchen.name}
            {showVegetarian ? (
              <em>
                <LeafIcon />
                Vegetarian
              </em>
            ) : null}
          </h1>
          <p>{kitchen.blurb}</p>
          {kitchen.offerLabel ? (
            <p className="ck-m-offer">
              <TiffinIcon />
              {kitchen.offerLabel}
            </p>
          ) : null}
          <p className={hasReviews ? "ck-rating" : "ck-rating ck-rating--empty"}>
            {hasReviews ? <StarIcon /> : null}
            <span className="ck-rating-desk">{ratingDesk}</span>
            <span className="ck-rating-m">{ratingMobile}</span>
          </p>
          <p className="ck-kitchen-verified-by">
            <VerifiedByAahaaIcon />
            Verified by Aahaa
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
              {formatBannerDate(journey.date)}
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
            <strong>{formatBannerDate(journey.date)}</strong>
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
        {showVegetarian ? (
          <span>
            <LeafIcon />
            Vegetarian kitchen
          </span>
        ) : null}
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

          {catalogue.length === 0 ? (
            <p className="ck-empty">Menu items for {kitchen.name} will appear here once the kitchen catalogue is added.</p>
          ) : meals.length === 0 ? (
            <p className="ck-empty">No dishes match this search.</p>
          ) : null}
        </div>

        <div className="ck-bag-col">
          <aside className="ck-bag">
            <div className="ck-bag-head">
              <h2>
                <BagIcon />
                Your meal bag
              </h2>
              <p>From {kitchen.name}</p>
            </div>
            {guestConflict ? (
              <GuestCartConflictNotice
                conflict={guestConflict}
                busy={guestConflictBusy}
                message={guestConflictMessage}
                onKeepServerCart={onKeepServerCart}
                onSwitchToGuestCart={onSwitchToGuestCart}
              />
            ) : null}
            {bag.length === 0 ? (
              <p className="ck-empty">Your bag is empty.</p>
            ) : (
              <ul className="ck-bag-list">
                {bag.map((line, bagIndex) => (
                  <li
                    key={line.meal.id}
                    className="ck-bag-item is-enter"
                    style={{ ["--ck-bag-enter-delay" as string]: `${bagIndex * 55}ms` }}
                  >
                    <MealBagThumb meal={line.meal} pulseKey={bagThumbPulse[line.meal.id] ?? 0} />
                    <div className="ck-bag-item-copy">
                      <strong>{line.meal.name}</strong>
                      <em>{mealBagServingLabel(line.meal)}</em>
                      <span>{formatRupees(line.meal.price)}</span>
                    </div>
                    <div className="ck-bag-item-actions">
                      <MealBagStepper
                        name={line.meal.name}
                        qty={line.qty}
                        pulseKey={bagThumbPulse[line.meal.id] ?? 0}
                        onQty={(qty) => setQty(line.meal.id, qty)}
                      />
                      <button
                        className="ck-bag-remove"
                        type="button"
                        aria-label={`Remove ${line.meal.name}`}
                        onClick={() => setQty(line.meal.id, 0)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="ck-bag-checkout">
              <p className="ck-subtotal">
                <span>Subtotal</span>
                <strong>{formatRupees(subtotal)}</strong>
              </p>
              <p className="ck-bag-hint">GST (18%) calculated at checkout.</p>
              <button className="ck-continue" type="button" disabled={bag.length === 0} onClick={onContinue}>
                Continue order
                <ArrowIcon />
              </button>
            </div>
            <p className="ck-bag-stop">
              <BannerPinIcon />
              <span>
                <strong>Pickup at {stop.name}</strong>
                {formatBannerDate(journey.date)}
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
              Your selected items are prepared by {kitchen.name}.
            </span>
          </p>
          <section className="ck-bag-snacks">
            <h2>Homemade snacks</h2>
            <div className="ck-bag-snacks-list">
              {catalogue.filter((meal) => meal.category === "snacks").map((meal) => (
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
        <button className="ck-m-cartbar-go" type="button" disabled={bag.length === 0} aria-label="Open your cart" onClick={onContinue}>
          <ArrowIcon />
        </button>
      </div>
    </main>
  );
}

function MealBagPage({
  bag,
  bagThumbPulse,
  addMeal,
  setQty,
  journey,
  stop,
  kitchenNote,
  setKitchenNote,
  onContinue,
  guestConflict,
  guestConflictBusy,
  guestConflictMessage,
  onKeepServerCart,
  onSwitchToGuestCart,
}: {
  bag: BagLine[];
  bagThumbPulse: Record<string, number>;
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  kitchenNote: string;
  setKitchenNote: (note: string) => void;
  onContinue: () => void;
  guestConflict: GuestCartConflict | null;
  guestConflictBusy: boolean;
  guestConflictMessage: string;
  onKeepServerCart: () => void;
  onSwitchToGuestCart: () => void;
}) {
  const { kitchen, routes } = useKitchenFlow();
  const catalogue = useMemo(() => getKitchenMeals(kitchen.id), [kitchen.id]);

  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const suggestedSnack =
    catalogue.find((meal) => meal.category === "snacks") ?? catalogue[0] ?? null;
  const journeyDate = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;

  return (
    <main className="ck-main ck-main--meal-bag">
      <div className="ck-crumbs ck-meal-bag-crumbs">
        <button type="button" onClick={() => navigate(PATHS.cooks)}>Home</button>
        <span>/</span>
        <button type="button" onClick={() => navigate(routes.menu)}>Menu</button>
        <span>/</span>
        <strong>Meal bag</strong>
        <button className="ck-back" type="button" onClick={() => navigate(routes.menu)}>
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

      {guestConflict ? (
        <GuestCartConflictNotice
          conflict={guestConflict}
          busy={guestConflictBusy}
          message={guestConflictMessage}
          onKeepServerCart={onKeepServerCart}
          onSwitchToGuestCart={onSwitchToGuestCart}
        />
      ) : null}

      <div className="ck-meal-bag-layout">
        <div className="ck-meal-bag-main">
          <section className="ck-meal-bag-items" aria-label="Items in your meal bag">
            <div className="ck-meal-bag-kitchen">
              <img src={kitchenPhoto(kitchen, cookLakshmiMenu)} alt="" />
              <div>
                <small>From</small>
                <h2>
                  {kitchen.name}
                  {kitchen.isVegetarian === true ? (
                    <span><LeafIcon /> Vegetarian</span>
                  ) : null}
                </h2>
                <p>{kitchen.blurb || "Everyday South Indian comfort food"}</p>
              </div>
            </div>

            {bag.length ? (
              <ul className="ck-meal-bag-list">
                {bag.map(({ meal, qty }, bagIndex) => (
                  <li
                    key={meal.id}
                    className="ck-meal-bag-item is-enter"
                    style={{ ["--ck-bag-enter-delay" as string]: `${bagIndex * 55}ms` }}
                  >
                    <MealBagThumb meal={meal} pulseKey={bagThumbPulse[meal.id] ?? 0} />
                    <div className="ck-meal-bag-item-copy">
                      <strong>{meal.name}</strong>
                      <p>{meal.description}</p>
                      <small>{meal.pack ?? `${qty} ${qty === 1 ? "serving" : "servings"}`}</small>
                      <b>{formatRupees(meal.price)}</b>
                    </div>
                    <div className="ck-meal-bag-item-actions">
                      <MealBagStepper
                        name={meal.name}
                        qty={qty}
                        pulseKey={bagThumbPulse[meal.id] ?? 0}
                        onQty={(nextQty) => setQty(meal.id, nextQty)}
                      />
                      <button type="button" onClick={() => setQty(meal.id, 0)}>
                        <TrashIcon />
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ck-meal-bag-empty">Your meal bag is empty. Add something from {kitchen.name}.</p>
            )}

            <button className="ck-meal-bag-add-more" type="button" onClick={() => navigate(routes.menu)}>
              <span>+</span>
              Add more from this kitchen
            </button>
            <p className="ck-meal-bag-prepared">
              <StoreIcon />
              <span>Items in this bag are prepared by {kitchen.name}.</span>
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
              <span className="ck-meal-bag-tax-note-desktop">GST (18%) and delivery shown on pickup confirmation.</span>
              <span className="ck-meal-bag-tax-note-mobile">GST (18%) and delivery shown on the review page.</span>
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
                <span>{journeyDate}</span>
                <small>Collect near main entrance.</small>
              </p>
            </div>
            <button className="ck-meal-bag-help" type="button"><HelpIcon />Need pickup help?</button>
          </section>

          {suggestedSnack ? (
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
          ) : null}
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
  const { kitchen, routes } = useKitchenFlow();

  return (
    <div className="ck-crumbs ck-checkout-crumbs">
      <button type="button" onClick={() => navigate(PATHS.cooks)}>Home</button>
      <span>/</span>
      <button type="button" onClick={() => navigate(PATHS.cooks)}>Home cooks</button>
      <span>/</span>
      <button type="button" onClick={() => navigate(routes.menu)}>{kitchen.name}</button>
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

function DeliveryFeeValue() {
  return (
    <strong className="ck-fee-pair">
      <s className="ck-fee-strike">{formatCheckoutMoney(CHECKOUT_DELIVERY_FEE_LIST)}</s>
      <span className="ck-fee-free">FREE</span>
    </strong>
  );
}

function CheckoutTotals({ subtotal }: { subtotal: number }) {
  const gst = checkoutGstFromSubtotal(subtotal);
  const total = checkoutTotalFromSubtotal(subtotal);
  return (
    <div className="ck-checkout-totals">
      <p><span>Items subtotal</span><strong>{formatCheckoutMoney(subtotal)}</strong></p>
      <p><span>GST (18%)</span><strong>{formatGstAmount(gst)}</strong></p>
      <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
      <p className="ck-checkout-total"><span>Total</span><strong>{formatCheckoutMoney(total)}</strong></p>
    </div>
  );
}

function profilePhoneForCheckout(phone: string | null | undefined): string {
  if (!phone?.trim()) return "";
  const digits = normalizePhoneDigits(phone);
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone.trim();
}

function profileNameForCheckout(name: string | null | undefined): string {
  return name?.trim() ?? "";
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
  const { kitchen, routes } = useKitchenFlow();

  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const date = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;

  return (
    <main className="ck-main ck-checkout-main">
      <CheckoutBreadcrumbs current="Review your order" backTo={routes.mealBag} backLabel="Back to meal bag" />
      <div className="ck-checkout-progress-row"><CheckoutProgress step={2} /></div>
      <div className="ck-checkout-layout">
        <div className="ck-checkout-primary">
          <section className="ck-review-items">
            <div className="ck-checkout-kitchen">
              <img src={kitchenPhoto(kitchen, cookLakshmiMenu)} alt="" />
              <div>
                <h1>
                  From {kitchen.name}
                  {kitchen.isVegetarian === true ? (
                    <span><LeafIcon /> Vegetarian</span>
                  ) : null}
                </h1>
                <p>{kitchen.blurb || "Everyday South Indian comfort food"}</p>
                {kitchen.rating !== null ? (
                  <p className="ck-checkout-rating">
                    <StarIcon /> <strong>{kitchen.rating}</strong>
                    {kitchen.reviewCount ? ` · ${kitchen.reviewCount} reviews` : null}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => navigate(routes.mealBag)}><PencilIcon /> Edit items</button>
            </div>
            <CheckoutMealRows bag={bag} />
          </section>

          <section className="ck-selected-pickup">
            <h2><BannerPinIcon /> Your selected pickup</h2>
            <div className="ck-selected-pickup-details">
              <p><PinIcon /><span><strong>{stop.name} bus stand</strong><small>Collect near the main entrance.</small></span></p>
              <p><CalendarIcon /><span><small>Date of journey</small><strong>{date}</strong></span></p>
            </div>
            <p className="ck-selected-pickup-hint"><HelpIcon /> You’ll confirm your contact details in the next step.</p>
          </section>

          <section className="ck-review-note">
            <NoteIcon />
            <span><strong>Note for the kitchen</strong><small>{kitchenNote.trim() || "No special requests added."}</small></span>
            <button type="button" onClick={() => navigate(routes.mealBag)}><PencilIcon /> Edit note</button>
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

function validateDesktopConfirmPickup(input: {
  orderingFor: "myself" | "someone-else" | null;
  collectorName: string;
  collectorPhone: string;
  pickupStopName: string;
  collectionPoint: string;
  journeyDate: Date;
  journeyFrom: string;
  journeyTo: string;
  busNumber: string;
  seatNumber: string;
  pickupConfirmed: boolean;
}): string | null {
  if (!input.orderingFor) {
    return "Please choose whether you are ordering for yourself or someone else.";
  }
  if (!input.collectorName.trim() || !input.collectorPhone.trim()) {
    return "Please confirm collector name and mobile number before placing your order.";
  }
  if (!input.pickupStopName.trim()) {
    return "Please select a pickup stop.";
  }
  if (!input.collectionPoint.trim()) {
    return "Please enter a collection point.";
  }
  if (Number.isNaN(input.journeyDate.getTime())) {
    return "Please select your journey date.";
  }
  if (!input.journeyFrom.trim() || !input.journeyTo.trim()) {
    return "Please select your From locality and To destination before placing an order.";
  }
  if (!input.busNumber.trim()) {
    return "Please enter your bus number.";
  }
  if (!input.seatNumber.trim()) {
    return "Please enter your seat number.";
  }
  if (!input.pickupConfirmed) {
    return "Please confirm that your bus stops at this pickup point.";
  }
  return null;
}

function ConfirmPickupPage({
  bag,
  journey,
  setJourney,
  pickupName,
  setPickupName,
  pickupPhone,
  setPickupPhone,
  orderingFor,
  setOrderingFor,
  someoneElseName,
  setSomeoneElseName,
  someoneElsePhone,
  setSomeoneElsePhone,
  collectionPoint,
  setCollectionPoint,
  busNumber,
  setBusNumber,
  seatNumber,
  setSeatNumber,
  pickupNote,
  setPickupNote,
  pickupConfirmed,
  setPickupConfirmed,
  backTo,
  placingOrder,
  placeOrderError,
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
  orderingFor: "myself" | "someone-else" | null;
  setOrderingFor: (value: "myself" | "someone-else" | null) => void;
  someoneElseName: string;
  setSomeoneElseName: (name: string) => void;
  someoneElsePhone: string;
  setSomeoneElsePhone: (phone: string) => void;
  collectionPoint: string;
  setCollectionPoint: (point: string) => void;
  busNumber: string;
  setBusNumber: (value: string) => void;
  seatNumber: string;
  setSeatNumber: (value: string) => void;
  pickupNote: string;
  setPickupNote: (note: string) => void;
  pickupConfirmed: boolean;
  setPickupConfirmed: (confirmed: boolean) => void;
  backTo: string;
  placingOrder: boolean;
  placeOrderError: string;
  onContinue: () => void;
}) {
  const { kitchen, routes } = useKitchenFlow();
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMissing, setProfileMissing] = useState(false);

  const subtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const dateValue = `${journey.date.getFullYear()}-${String(journey.date.getMonth() + 1).padStart(2, "0")}-${String(journey.date.getDate()).padStart(2, "0")}`;

  useEffect(() => {
    if (orderingFor !== "myself") return;

    let cancelled = false;
    const cached = readCachedProfile();
    const cachedName = profileNameForCheckout(cached?.fullName);
    const cachedPhone = profilePhoneForCheckout(cached?.phone);
    if (cachedName || cachedPhone) {
      setPickupName(cachedName);
      setPickupPhone(cachedPhone);
      setProfileMissing(!cachedName || !cachedPhone);
    }

    if (!getAccessToken()) {
      setProfileMissing(!cachedName || !cachedPhone);
      return;
    }

    setProfileLoading(true);
    void getMyProfile()
      .then((profile) => {
        if (cancelled) return;
        cacheProfile(profile);
        const name = profileNameForCheckout(profile.fullName);
        const phone = profilePhoneForCheckout(profile.phone);
        setPickupName(name);
        setPickupPhone(phone);
        setProfileMissing(!name || !phone);
      })
      .catch(() => {
        if (cancelled) return;
        setProfileMissing(!cachedName || !cachedPhone);
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderingFor, setPickupName, setPickupPhone]);

  function selectOrderingFor(next: "myself" | "someone-else") {
    if (orderingFor === "someone-else" && next === "myself") {
      setSomeoneElseName(pickupName);
      setSomeoneElsePhone(pickupPhone);
    }
    setOrderingFor(next);
    if (next === "myself") {
      // Clear someone-else values immediately so they never flash as profile details.
      setPickupName("");
      setPickupPhone("");
      setProfileMissing(false);
      setProfileLoading(true);
      return;
    }
    setPickupName(someoneElseName);
    setPickupPhone(someoneElsePhone);
    setProfileMissing(false);
    setProfileLoading(false);
  }

  function onSomeoneElseNameChange(value: string) {
    setSomeoneElseName(value);
    setPickupName(value);
  }

  function onSomeoneElsePhoneChange(value: string) {
    setSomeoneElsePhone(value);
    setPickupPhone(value);
  }

  return (
    <main className="ck-main ck-checkout-main">
      <CheckoutBreadcrumbs current="Confirm pickup details" backTo={backTo} backLabel={backTo === routes.mealBag ? "Back to meal bag" : "Back to review order"} />
      <div className="ck-checkout-title-row">
        <div><h1>Confirm your pickup details</h1><p>Help us get your meal to the right person, at the right stop.</p></div>
        <CheckoutProgress step={3} />
      </div>
      <div className="ck-checkout-layout ck-pickup-layout">
        <div className="ck-checkout-primary">
          <div className="ck-pickup-primary-stack">
            <section className="ck-collecting-card">
              <div className="ck-pickup-section-icon"><ProfileIcon /></div>
              <div className="ck-pickup-section-content">
                <h2>Who’s ordering?</h2>
                <div className="ck-ordering-for" role="group" aria-label="Who is ordering">
                  <button
                    type="button"
                    className={`ck-ordering-for-btn${orderingFor === "myself" ? " is-selected" : ""}`}
                    aria-pressed={orderingFor === "myself"}
                    onClick={() => selectOrderingFor("myself")}
                  >
                    Myself
                  </button>
                  <button
                    type="button"
                    className={`ck-ordering-for-btn${orderingFor === "someone-else" ? " is-selected" : ""}`}
                    aria-pressed={orderingFor === "someone-else"}
                    onClick={() => selectOrderingFor("someone-else")}
                  >
                    Someone else
                  </button>
                </div>
                {orderingFor === "myself" ? (
                  <div className="ck-myself-details">
                    {profileLoading ? (
                      <p className="ck-myself-status">Loading your registered details…</p>
                    ) : profileMissing ? (
                      <p className="ck-myself-status">
                        Your profile is missing a registered name or mobile number. Update your profile, or choose Someone else.
                      </p>
                    ) : (
                      <div className="ck-myself-summary">
                        <p><span>Full name</span><strong>{pickupName}</strong></p>
                        <p><span>Mobile number</span><strong>{pickupPhone}</strong></p>
                        <small>Your delivery partner will contact this number.</small>
                      </div>
                    )}
                  </div>
                ) : null}
                {orderingFor === "someone-else" ? (
                  <div className="ck-collecting-fields">
                    <label>Full name<input value={someoneElseName} onChange={(event) => onSomeoneElseNameChange(event.target.value)} placeholder="" /></label>
                    <label>
                      Mobile number
                      <div className="ck-phone-field">
                        <input type="tel" value={someoneElsePhone} onChange={(event) => onSomeoneElsePhoneChange(event.target.value)} placeholder="" />
                        {someoneElsePhone.trim() ? <span><LockIcon /> Verified</span> : null}
                      </div>
                      <small>Your delivery partner will contact this number.</small>
                    </label>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="ck-pickup-where">
              <div className="ck-pickup-section-icon"><BannerPinIcon /></div>
              <div className="ck-pickup-section-content">
                <h2>Where and when?</h2>
                <p>Your selected pickup stop and time.</p>
                <div className="ck-pickup-where-fields">
                  <label>Pickup stop
                    <select value={journey.pickup} onChange={(event) => setJourney((current) => ({ ...current, pickup: event.target.value }))}>
                      {PICKUP_STOPS.map((pickup) => <option key={pickup.name} value={pickup.name}>{pickup.name} bus stand</option>)}
                    </select>
                  </label>
                  <label>Collection point<input value={collectionPoint} onChange={(event) => setCollectionPoint(event.target.value)} /></label>
                  <label>Date of journey<input type="date" value={dateValue} onChange={(event) => {
                    const [year, month, day] = event.target.value.split("-").map(Number);
                    if (year && month && day) setJourney((current) => ({ ...current, date: new Date(year, month - 1, day) }));
                  }} /></label>
                  <label>Bus number<input value={busNumber} onChange={(event) => setBusNumber(event.target.value)} placeholder="" /></label>
                  <label>Seat number<input value={seatNumber} onChange={(event) => setSeatNumber(event.target.value)} placeholder="" /></label>
                </div>
                <p className="ck-pickup-point-hint"><LeafIcon /> Choose a pickup point where your bus already stops.</p>
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
          </div>
          <label className="ck-pickup-confirm"><input type="checkbox" checked={pickupConfirmed} onChange={(event) => setPickupConfirmed(event.target.checked)} /> I’ve confirmed that my bus stops at this pickup point.</label>
        </div>

        <aside className="ck-checkout-sidebar">
          <section className="ck-pickup-summary">
            <h2><BagIcon /> <span>Order summary<small>From {kitchen.name}</small></span></h2>
            <CheckoutMealRows bag={bag} />
            <CheckoutTotals subtotal={subtotal} />
            {placeOrderError ? <p className="ck-place-order-error" role="alert">{placeOrderError}</p> : null}
            <button
              className="ck-checkout-primary-button"
              type="button"
              disabled={bag.length === 0 || placingOrder}
              onClick={onContinue}
            >
              {placingOrder ? "Opening Cashfree…" : <>Continue to payment <ArrowIcon /></>}
            </button>
            <p className="ck-bill-after">
              {placingOrder
                ? "Creating your order and opening Cashfree checkout…"
                : "Review these details before continuing."}
            </p>
          </section>
          <section className="ck-pickup-bus-hint"><BusIcon /><span><strong>Bus running late?</strong><small>You can report a delay from your order page.</small><button className="ck-checkout-help" type="button"><HelpIcon />Help &amp; support</button></span></section>
        </aside>
      </div>
    </main>
  );
}

function PaymentMethodPage({
  bag,
  unpaidOrder,
  backTo,
  onPay,
  placingOrder,
  placeOrderError,
}: {
  bag: BagLine[];
  unpaidOrder: Order | null;
  backTo: string;
  onPay: () => void;
  placingOrder: boolean;
  placeOrderError: string;
}) {
  const { kitchen } = useKitchenFlow();
  const retryOrder =
    unpaidOrder && canRetryPayment(unpaidOrder.paymentStatus) ? unpaidOrder : null;
  const useSavedOrder = Boolean(retryOrder) && bag.length === 0;
  const subtotal = useSavedOrder
    ? retryOrder!.subtotal
    : bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const payableTotal = useSavedOrder
    ? retryOrder!.total
    : checkoutTotalFromSubtotal(subtotal);
  const canRetryUnpaid = Boolean(retryOrder);
  const payDisabled = placingOrder || (bag.length === 0 && !canRetryUnpaid);
  const payLabel = placingOrder
    ? "Opening Cashfree checkout…"
    : `Pay with Cashfree · ${formatCheckoutMoney(payableTotal)}`;
  const kitchenLabel = useSavedOrder
    ? (retryOrder!.kitchenName ?? kitchen.name)
    : kitchen.name;

  return (
    <main className="ck-main ck-checkout-main ck-payment-main">
      <MobilePaymentView
        bag={bag}
        unpaidOrder={unpaidOrder}
        onPay={onPay}
        placingOrder={placingOrder}
        placeOrderError={placeOrderError}
        payableTotal={payableTotal}
        payDisabled={payDisabled}
      />
      <CheckoutBreadcrumbs
        current="Payment"
        backTo={backTo}
        backLabel={backTo === PATHS.cart ? "Back to cart" : "Back to pickup details"}
      />
      <div className="ck-checkout-title-row ck-payment-title-row">
        <div>
          <h1>Pay with Cashfree</h1>
          <p>Complete payment securely on Cashfree hosted checkout. Aahaa only marks your order paid after backend verification.</p>
        </div>
        <CheckoutProgress step={4} />
      </div>
      <div className="ck-checkout-layout ck-payment-layout">
        <section className="ck-payment-options ck-cashfree-pay-panel" aria-label="Cashfree payment">
          <div className="ck-payment-section-title">
            <span><ShieldIcon /></span>
            <h2>Cashfree</h2>
            <small><LockIcon /> Sandbox checkout</small>
          </div>
          <div className="ck-cashfree-pay-card">
            <strong>Pay with Cashfree</strong>
            <p>
              Tap below to create or reuse your Aahaa order, open a Cashfree payment session for the saved order total,
              and continue on Cashfree. UPI, cards and net banking are available inside Cashfree checkout.
            </p>
            <ul className="ck-cashfree-pay-points">
              <li>Amount comes from your saved Aahaa order total (subtotal + 18% GST).</li>
              <li>Retrying payment does not create a duplicate Aahaa order.</li>
              <li>Success is confirmed only after NestJS verification or webhook.</li>
            </ul>
            {placeOrderError ? <p className="ck-place-order-error" role="alert">{placeOrderError}</p> : null}
            <button
              className="ck-checkout-primary-button ck-cashfree-pay-button"
              type="button"
              disabled={payDisabled}
              onClick={onPay}
            >
              {payLabel} {placingOrder ? null : <ArrowIcon />}
            </button>
            {placingOrder ? (
              <p className="ck-bill-after" aria-live="polite">Creating payment session and opening Cashfree…</p>
            ) : (
              <p className="ck-bill-after">You will leave this page briefly for Cashfree hosted checkout.</p>
            )}
          </div>
          <p className="ck-payment-secure">
            <LockIcon />
            <span><strong>100% secure payments.</strong> Card and UPI details are entered only on Cashfree.</span>
          </p>
        </section>

        <aside className="ck-checkout-sidebar ck-payment-sidebar">
          <section className="ck-pickup-summary ck-payment-summary">
            <h2><BagIcon /><span>Order summary<small>From {kitchenLabel}</small></span></h2>
            {useSavedOrder ? (
              <CheckoutOrderItemRows order={retryOrder!} />
            ) : (
              <CheckoutMealRows bag={bag} />
            )}
            {useSavedOrder ? (
              <CheckoutSavedOrderTotals order={retryOrder!} />
            ) : (
              <CheckoutTotals subtotal={subtotal} />
            )}
            <p className="ck-bill-after">Amount charged by Cashfree matches this saved Aahaa order total.</p>
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

function CheckoutOrderItemRows({ order }: { order: Order }) {
  return (
    <ul className="ck-checkout-meals">
      {order.items.map((item) => (
        <li key={item.id}>
          <img src={orderMealPhoto(item.dishCode, order.kitchenId)} alt="" />
          <span>
            <strong>{item.dishName}</strong>
            <small>{`${item.quantity} ${item.quantity === 1 ? "serving" : "servings"}`}</small>
          </span>
          <b>× {item.quantity}</b>
          <strong>{formatRupees(item.lineTotal)}</strong>
        </li>
      ))}
    </ul>
  );
}

function CheckoutSavedOrderTotals({ order }: { order: Order }) {
  return (
    <div className="ck-checkout-totals">
      <p><span>Items subtotal</span><strong>{formatCheckoutMoney(order.subtotal)}</strong></p>
      <p><span>GST (18%)</span><strong>{formatGstAmount(order.taxAmount)}</strong></p>
      <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
      <p className="ck-checkout-total"><span>Total</span><strong>{formatCheckoutMoney(order.total)}</strong></p>
    </div>
  );
}

function MobilePaymentView({
  bag,
  unpaidOrder,
  onPay,
  placingOrder,
  placeOrderError,
  payableTotal,
  payDisabled,
}: {
  bag: BagLine[];
  unpaidOrder: Order | null;
  onPay: () => void;
  placingOrder: boolean;
  placeOrderError: string;
  payableTotal: number;
  payDisabled: boolean;
}) {
  const { kitchen } = useKitchenFlow();
  const retryOrder =
    unpaidOrder && canRetryPayment(unpaidOrder.paymentStatus) ? unpaidOrder : null;
  const useSavedOrder = Boolean(retryOrder) && bag.length === 0;
  const itemCount = useSavedOrder
    ? retryOrder!.itemCount
    : bag.reduce((sum, line) => sum + line.qty, 0);
  const itemNames = useSavedOrder
    ? retryOrder!.items.map((item) => item.dishName).join(", ")
    : bag.map(({ meal }) => meal.name).join(", ");
  const kitchenName = useSavedOrder ? (retryOrder!.kitchenName ?? kitchen.name) : kitchen.name;

  return (
    <div className="ck-mobile-payment">
      <div className="ck-mobile-payment-heading">
        <h1>Pay with Cashfree</h1>
        <p>Secure Cashfree hosted checkout for your Aahaa order.</p>
      </div>
      <section className="ck-mobile-payment-order" aria-label="Order summary">
        <img src={kitchenPhoto(kitchen, paymentKitchen)} alt="" />
        <div className="ck-mobile-payment-order-copy">
          <strong>From {kitchenName}</strong>
          {kitchen.isVegetarian === true ? (
            <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
          ) : null}
          <small>{itemCount} items - {itemNames}</small>
        </div>
        <strong className="ck-mobile-payment-price">{formatCartAmountForCheckout(payableTotal)}</strong>
      </section>

      <section className="ck-mobile-payment-section ck-cashfree-pay-card">
        <h2>Cashfree</h2>
        <p>UPI, cards and net banking open inside Cashfree after you tap Pay with Cashfree.</p>
        <ul className="ck-cashfree-pay-points">
          <li>Uses your saved Aahaa order total</li>
          <li>No duplicate order on retry</li>
          <li>Paid only after backend verification</li>
        </ul>
      </section>

      <footer className="ck-mobile-payment-footer">
        <div>
          <strong>{formatCheckoutMoney(payableTotal)}</strong>
          <span>{itemCount} items</span>
          <small>Cashfree sandbox</small>
        </div>
        {placeOrderError ? <p className="ck-place-order-error" role="alert">{placeOrderError}</p> : null}
        <button type="button" disabled={payDisabled} onClick={onPay}>
          {placingOrder ? "Opening Cashfree…" : <>Pay with Cashfree <ArrowIcon /></>}
        </button>
      </footer>
    </div>
  );
}

function MobilePaymentStatusPage({
  order,
  bag,
  journey,
  stop,
  onComplete,
}: {
  order: Order | null;
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  onComplete: (orderId: string) => void;
}) {
  const { kitchen, routes } = useKitchenFlow();
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();

  useEffect(() => {
    if (!orderId) return;
    if ((order?.paymentStatus ?? "pending") !== "paid") return;
    const timer = window.setTimeout(() => onComplete(orderId), 3500);
    return () => window.clearTimeout(timer);
  }, [onComplete, orderId, order?.paymentStatus]);

  const lines = order
    ? order.items.map((item) => ({
        key: item.id,
        name: item.dishName,
        description: "",
        qty: item.quantity,
        lineTotal: item.lineTotal,
        photo: orderMealPhoto(item.dishCode, order.kitchenId),
      }))
    : bag.map(({ meal, qty }) => ({
        key: meal.id,
        name: meal.name,
        description: meal.description,
        qty,
        lineTotal: meal.price * qty,
        photo: meal.photo,
      }));
  const itemCount = order?.itemCount ?? bag.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = order?.subtotal ?? bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const gst = order?.taxAmount ?? checkoutGstFromSubtotal(subtotal);
  const total = order?.total ?? checkoutTotalFromSubtotal(subtotal);
  const date = (order?.journeyDate
    ? new Date(`${order.journeyDate}T12:00:00`)
    : journey.date
  ).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const pickupName = order?.pickupStopName ?? stop.name;
  const pickupTime = order?.pickupTime ?? stop.time;
  const orderNumber = order?.orderNumber ? `#${order.orderNumber}` : "Saving…";
  const kitchenName = order?.kitchenName ?? kitchen.name;

  return (
    <main className="ck-mobile-payment-status" aria-label="Order status">
      <header className="ck-mobile-payment-status-header">
        <button type="button" aria-label="Back to payment methods" onClick={() => navigate(routes.paymentMethod)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <h1>Order status</h1>

      <section className="ck-payment-status-receipt" aria-label="Order receipt">
        <div className="ck-payment-status-printer" />
        <article className="ck-payment-status-paper">
          <header className="ck-payment-status-paper-header">
            <strong>aahaa<span>⌣</span></strong>
            <span>Trip Food Order<small>{orderNumber}</small><small>{date}, {pickupTime}</small></span>
          </header>

          <section className="ck-payment-status-kitchen">
            <img src={kitchenPhoto(kitchen, imgKitchenLakshmi)} alt="" />
            <span>
              <strong>{kitchenName}</strong>
              {kitchen.isVegetarian === true ? (
                <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
              ) : null}
              <small>{kitchen.blurb || "Everyday South Indian comfort food"}</small>
            </span>
          </section>

          <div className="ck-payment-status-pickup">
            <span><PinIcon /><small>Pickup point</small><strong>{pickupName} Bus Stand</strong></span>
            <span><ClockIcon /><small>Pickup time</small><strong>{pickupTime}</strong></span>
          </div>

          <div className="ck-payment-status-table">
            <div className="ck-payment-status-table-head"><span>Item</span><span>Qty</span><span>Amount</span></div>
            {lines.map((line) => (
              <div className="ck-payment-status-item" key={line.key}>
                <img src={line.photo} alt="" />
                <span><strong>{line.name}</strong><small>{line.description}</small></span>
                <span>{line.qty}</span>
                <strong>{formatRupees(line.lineTotal)}</strong>
              </div>
            ))}
          </div>

          <div className="ck-payment-status-totals">
            <p><span>Items total ({itemCount} items)</span><strong>{formatCheckoutMoney(subtotal)}</strong></p>
            <p><span>GST (18%)</span><strong>{formatGstAmount(gst)}</strong></p>
            <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
            <p className="ck-payment-status-paid"><strong>Order total</strong><strong>{formatCartAmountForCheckout(total)}</strong></p>
            <p><span>Payment status</span><strong>{paymentStatusLabel(order?.paymentStatus)}</strong></p>
          </div>
        </article>
      </section>

      <section className="ck-payment-status-progress" aria-live="polite">
        <h2>Order Status</h2>
        <ol>
          <li className="is-complete"><span><CheckIcon /></span><strong>Order<br />placed</strong><small>Just now</small></li>
          <li className="is-complete"><span><CheckIcon /></span><strong>Order<br />saved</strong><small>Just now</small></li>
          <li className="is-current"><span>↻</span><strong>Generating<br />your bill...</strong></li>
          <li><span><NoteIcon /></span><strong>Bill<br />ready</strong></li>
        </ol>
        <p>Please keep this screen open while we prepare your invoice</p>
      </section>
    </main>
  );
}

function orderMealPhoto(dishCode: string, kitchenId: string): string {
  const meal = getKitchenMeals(kitchenId).find((row) => row.id === dishCode);
  return meal?.photo ?? LAKSHMI_MEALS[0]?.photo ?? "";
}

function PaymentReturnPage({
  order,
  onRetryPayment,
  retrying,
  retryError,
}: {
  order: Order | null;
  onRetryPayment: () => void;
  retrying: boolean;
  retryError: string;
}) {
  const { routes } = useKitchenFlow();
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();
  const [status, setStatus] = useState<"checking" | "paid" | "pending" | "failed" | "refunded">(
    order?.paymentStatus === "paid"
      ? "paid"
      : order?.paymentStatus === "failed"
        ? "failed"
        : order?.paymentStatus === "refunded"
          ? "refunded"
          : "checking",
  );
  const [message, setMessage] = useState("Verifying your payment with Cashfree…");
  const [verifiedOrder, setVerifiedOrder] = useState<Order | null>(order);

  useEffect(() => {
    if (!orderId || !getAccessToken()) {
      setStatus("failed");
      setMessage("Sign in again to verify this payment.");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const result = await verifyCashfreePayment(orderId);
        const refreshed = await getOrder(orderId);
        if (cancelled) return;
        setVerifiedOrder(refreshed);
        writeActiveOrderId(refreshed.id);
        const nextStatus = refreshed.paymentStatus || result.paymentStatus;
        if (nextStatus === "paid") {
          setStatus("paid");
          setMessage(paymentStatusSummary("paid"));
          // Continue the normal success path: Preparing invoice → Order summary.
          navigate(withOrderId(postPaymentPreparingRoute(routes), orderId));
          return;
        }
        if (nextStatus === "refunded") {
          setStatus("refunded");
          setMessage(paymentStatusSummary("refunded"));
          return;
        }
        if (nextStatus === "failed") {
          setStatus("failed");
          setMessage(paymentStatusSummary("failed"));
          return;
        }
        setStatus("pending");
        setMessage(paymentStatusSummary("pending"));
      } catch (error) {
        if (cancelled) return;
        setStatus("failed");
        setMessage(
          error instanceof Error
            ? error.message
            : "Could not verify payment yet. Please retry or check My Orders.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, routes]);

  return (
    <main className="ck-main ck-checkout-main">
      <CheckoutBreadcrumbs current="Payment result" backTo={routes.paymentMethod} backLabel="Back to payment" />
      <div className="ck-checkout-title-row">
        <div>
          <h1>
            {status === "paid"
              ? "Payment successful"
              : status === "pending" || status === "checking"
                ? "Checking payment"
                : status === "refunded"
                  ? "Payment refunded"
                  : "Payment not completed"}
          </h1>
          <p>{message}</p>
        </div>
      </div>
      <section className="ck-pickup-summary" style={{ maxWidth: 520 }}>
        <h2><BagIcon /> <span>Order {verifiedOrder?.orderNumber ? `#${verifiedOrder.orderNumber}` : ""}</span></h2>
        <p className="ck-bill-after">
          Amount: {formatCheckoutMoney(verifiedOrder?.total ?? order?.total ?? 0)} · Status:{" "}
          <strong>{paymentStatusLabel(verifiedOrder?.paymentStatus ?? order?.paymentStatus ?? status)}</strong>
        </p>
        {retryError ? <p className="ck-place-order-error" role="alert">{retryError}</p> : null}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {status === "paid" && orderId ? (
            <button
              className="ck-checkout-primary-button"
              type="button"
              onClick={() => navigate(withOrderId(postPaymentPreparingRoute(routes), orderId))}
            >
              Continue to invoice <ArrowIcon />
            </button>
          ) : null}
          {(status === "failed" || status === "pending") && orderId ? (
            <button
              className="ck-checkout-primary-button"
              type="button"
              disabled={retrying}
              onClick={onRetryPayment}
            >
              {retrying ? "Starting checkout…" : "Retry payment"}
            </button>
          ) : null}
          <button
            type="button"
            className="ck-checkout-help"
            onClick={() => navigate(PATHS.myOrders)}
          >
            Go to My Orders
          </button>
        </div>
      </section>
    </main>
  );
}

/** Pause 1s, then constant-speed paper feed; order summary only after the bill is fully out. */
const INVOICE_PRINT_DELAY_MS = 1000;
const INVOICE_PRINT_MS = 8200;
const INVOICE_HOLD_AFTER_PRINT_MS = 500;

function PreparingInvoicePage({
  order,
  bag,
  onComplete,
}: {
  order: Order | null;
  bag: BagLine[];
  onComplete: (orderId: string) => void;
}) {
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();
  const isPaid = (order?.paymentStatus ?? "pending") === "paid";
  const [printing, setPrinting] = useState(false);
  const [printDone, setPrintDone] = useState(false);
  const [feedHeightPx, setFeedHeightPx] = useState(0);
  const paperRef = useRef<HTMLElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const lines = order
    ? order.items.map((item) => ({
        key: item.id,
        name: item.dishName,
        qty: item.quantity,
        lineTotal: item.lineTotal,
        photo: orderMealPhoto(item.dishCode, order.kitchenId),
        pack: `${item.quantity} serving${item.quantity === 1 ? "" : "s"}`,
      }))
    : bag.map(({ meal, qty }) => ({
        key: meal.id,
        name: meal.name,
        qty,
        lineTotal: meal.price * qty,
        photo: meal.photo,
        pack: meal.pack ?? `${qty} serving${qty === 1 ? "" : "s"}`,
      }));
  const subtotal = order?.subtotal ?? bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const gst = order?.taxAmount ?? checkoutGstFromSubtotal(subtotal);
  const total = order?.total ?? checkoutTotalFromSubtotal(subtotal);
  const orderNumber = order?.orderNumber ? `#${order.orderNumber}` : "Saving…";

  useEffect(() => {
    if (!orderId || !isPaid) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setPrinting(false);
    setPrintDone(false);
    setFeedHeightPx(0);
    if (feedRef.current) feedRef.current.style.height = "0px";

    const startDelay = reduceMotion ? 0 : INVOICE_PRINT_DELAY_MS;
    const duration = reduceMotion ? 400 : INVOICE_PRINT_MS;
    const hold = reduceMotion ? 0 : INVOICE_HOLD_AFTER_PRINT_MS;

    let feedAnimation: Animation | null = null;
    let doneTimer = 0;
    let navTimer = 0;

    const startTimer = window.setTimeout(() => {
      const paper = paperRef.current;
      const feed = feedRef.current;
      const nextHeight = paper ? Math.ceil(paper.scrollHeight + 8) : 420;
      setFeedHeightPx(nextHeight);

      if (feed) {
        feed.style.setProperty("--invoice-print-ms", `${duration}ms`);
        feed.style.setProperty("--invoice-print-height", `${nextHeight}px`);
        feed.style.height = "0px";
      }

      setPrinting(true);

      const finishPrint = () => {
        if (feed) feed.style.height = `${nextHeight}px`;
        setPrintDone(true);
        navTimer = window.setTimeout(() => onComplete(orderId), hold);
      };

      if (feed && !reduceMotion && typeof feed.animate === "function") {
        feedAnimation = feed.animate(
          [{ height: "0px" }, { height: `${nextHeight}px` }],
          { duration, easing: "linear", fill: "forwards" },
        );
        feedAnimation.onfinish = finishPrint;
      } else {
        if (feed) feed.style.height = `${nextHeight}px`;
        doneTimer = window.setTimeout(finishPrint, duration);
      }
    }, startDelay);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(doneTimer);
      window.clearTimeout(navTimer);
      feedAnimation?.cancel();
    };
  }, [onComplete, orderId, isPaid, lines.length, orderNumber, subtotal, gst, total]);

  return (
    <main className="ck-main ck-invoice-main">
      <header className="ck-invoice-heading">
        <h1>Preparing your invoice</h1>
        <p>
          {order
            ? paymentStatusSummary(order.paymentStatus)
            : "Please wait while we load your order details."}
        </p>
      </header>
      <section className="ck-invoice-card" aria-live="polite">
        <div className={`ck-invoice-printer${printing ? " is-printing" : ""}${printDone ? " is-printed" : ""}`}>
          <div className="ck-printer-slot" aria-hidden="true" />
          <div className="ck-printer-head-glow" aria-hidden="true" />
          <div
            ref={feedRef}
            className="ck-invoice-paper-feed"
            style={
              printing || printDone
                ? ({
                    ["--invoice-print-height"]: `${feedHeightPx || 420}px`,
                    ["--invoice-print-ms"]: `${INVOICE_PRINT_MS}ms`,
                  } as CSSProperties)
                : undefined
            }
          >
            <article ref={paperRef} className="ck-invoice-paper" aria-label="Order invoice">
              <strong className="ck-invoice-logo">aahaa</strong>
              <b>Aahaa Order Invoice</b>
              <small>Your food, fresh and on time</small>
              <p><span>Order ID</span><strong>{orderNumber}</strong></p>
              <div className="ck-invoice-table-head"><span>Item</span><span>Qty</span><span>Price</span></div>
              {lines.map((line) => (
                <div className="ck-invoice-line" key={line.key}>
                  <img src={line.photo} alt="" />
                  <span><strong>{line.name}</strong><small>{line.pack}</small></span>
                  <span>{line.qty}</span>
                  <strong>{formatRupees(line.lineTotal)}</strong>
                </div>
              ))}
              <div className="ck-invoice-charges">
                <p><span>Items subtotal</span><strong>{formatCheckoutMoney(subtotal)}</strong></p>
                <p><span>GST (18%)</span><strong>{formatGstAmount(gst)}</strong></p>
                <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
              </div>
              <p className="ck-invoice-total"><strong>Total</strong><strong>{formatCheckoutMoney(total)}</strong></p>
              <p className="ck-invoice-payment-status">
                Payment status: <strong>{paymentStatusLabel(order?.paymentStatus)}</strong>
              </p>
            </article>
          </div>
        </div>
        <div className="ck-invoice-generating">
          <span className="ck-invoice-spinner" />
          <span>
            <strong>{printDone ? "Invoice ready" : "Generating bill..."}</strong>
            <small>{printDone ? "Opening your order summary…" : "This may take a few seconds."}</small>
          </span>
        </div>
      </section>
      <ol className="ck-invoice-progress" aria-label="Order progress">
        <li className="is-complete"><span><CheckIcon /></span><strong>Order placed</strong><small>Just now</small></li>
        <li className="is-current"><span><NoteIcon /></span><strong>Generating invoice</strong><small>Just a moment...</small></li>
        <li><span><BoxIcon /></span><strong>Confirming order</strong><small>—</small></li>
        <li><span><DeliveryIcon /></span><strong>Ready for pickup</strong><small>—</small></li>
      </ol>
      <p className="ck-invoice-warning"><AlertIcon /><span><strong>Please don't refresh or close this page.</strong><small>We're finalizing your invoice and order details.</small></span></p>
    </main>
  );
}

function OrderSummaryPage({
  order,
  bag,
  journey,
  stop,
  pickupName,
  pickupPhone,
  busNumber,
  seatNumber,
  paymentMethod,
}: {
  order: Order | null;
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  pickupName: string;
  pickupPhone: string;
  busNumber: string;
  seatNumber: string;
  paymentMethod: PaymentMethod;
}) {
  const { routes } = useKitchenFlow();
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();

  const lines = order
    ? order.items.map((item) => ({
        key: item.id,
        name: item.dishName,
        qty: item.quantity,
        lineTotal: item.lineTotal,
        photo: orderMealPhoto(item.dishCode, order.kitchenId),
        pack: `${item.quantity} serving${item.quantity === 1 ? "" : "s"}`,
      }))
    : bag.map(({ meal, qty }) => ({
        key: meal.id,
        name: meal.name,
        qty,
        lineTotal: meal.price * qty,
        photo: meal.photo,
        pack: meal.pack ?? `${qty} serving${qty === 1 ? "" : "s"}`,
      }));
  const subtotal = order?.subtotal ?? bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const gst = order?.taxAmount ?? checkoutGstFromSubtotal(subtotal);
  const total = order?.total ?? checkoutTotalFromSubtotal(subtotal);
  const date = order?.journeyDate
    ? formatBarDate(new Date(`${order.journeyDate}T12:00:00`))
    : formatBarDate(journey.date);
  const paymentLabel = paymentMethod === "google-pay"
    ? "Google Pay"
    : paymentMethod === "phonepe"
      ? "PhonePe"
      : paymentMethod === "paytm"
        ? "Paytm"
        : "UPI";
  const collectorName = order?.collectorName ?? pickupName;
  const collectorPhone = order?.collectorPhone ?? pickupPhone;
  const pickupStop = order?.pickupStopName ?? stop.name;
  const pickupTime = order?.pickupTime ?? stop.time;
  const savedBusNumber = order?.busNumber ?? busNumber;
  const savedSeatNumber = order?.seatNumber ?? seatNumber;
  const journeyLabel = `${order?.journeyFrom ?? journey.from} → ${order?.journeyTo ?? journey.to}`;
  const orderNumber = order?.orderNumber ? `#${order.orderNumber}` : "—";
  const paymentPaid = isPaymentPaid(order?.paymentStatus);
  const canRetry = canRetryPayment(order?.paymentStatus);

  return (
    <main className="ck-main ck-order-summary-main">
      <MobileOrderComplete
        order={order}
        bag={bag}
        stop={stop}
        subtotal={subtotal}
        total={total}
        date={date}
      />
      <header className="ck-order-success-heading">
        <span><CheckIcon /></span>
        <div>
          <h1>Your order summary</h1>
          <p>
            {order
              ? paymentStatusSummary(order.paymentStatus)
              : "Loading your saved order…"}
          </p>
        </div>
      </header>
      <div className="ck-order-summary-layout">
        <section className="ck-order-invoice-card">
          <header className="ck-order-invoice-header">
            <NoteIcon />
            <span><strong>Aahaa Order Invoice</strong><small>Your food, fresh and on time</small></span>
            <span className="ck-order-invoice-id"><small>Order ID</small><strong>{orderNumber}</strong></span>
          </header>
          <div className="ck-order-invoice-table">
            <div className="ck-order-invoice-table-head"><span>Item</span><span>Qty</span><span>Price</span></div>
            {lines.map((line) => (
              <div className="ck-order-invoice-line" key={line.key}>
                <img src={line.photo} alt="" />
                <span><strong>{line.name}</strong><small>{line.pack}</small></span>
                <span>{line.qty}</span>
                <strong>{formatRupees(line.lineTotal)}</strong>
              </div>
            ))}
          </div>
          <div className="ck-order-invoice-totals">
            <p><span>Items subtotal</span><strong>{formatCheckoutMoney(subtotal)}</strong></p>
            <p><span>GST (18%)</span><strong>{formatGstAmount(gst)}</strong></p>
            <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
            <p className="ck-order-invoice-total"><strong>Total</strong><strong>{formatCheckoutMoney(total)}</strong></p>
          </div>
          <div className="ck-order-payment">
            <span className="ck-order-upi-logo">UPI</span>
            <span><small>Payment method</small><strong>{paymentLabel}</strong></span>
            <strong className={`ck-order-paid${paymentPaid ? "" : " is-pending"}`}>
              {paymentPaid ? <><CheckIcon /> Paid</> : paymentStatusLabel(order?.paymentStatus)}
            </strong>
          </div>
          {canRetry && orderId ? (
            <button
              className="ck-checkout-primary-button"
              type="button"
              onClick={() => navigate(withOrderId(routes.paymentMethod, orderId))}
            >
              Retry payment <ArrowIcon />
            </button>
          ) : null}
          <section className="ck-order-status">
            <h2>Order status</h2>
            <ol>
              <li className="is-complete"><span><CheckIcon /></span><strong>Order placed</strong><small>Saved</small><p>Your order has been received.</p></li>
              <li className="is-current"><span><NoteIcon /></span><strong>Preparing</strong><small>{pickupTime}</small><p>Home cook is preparing your food.</p></li>
              <li><span><BoxIcon /></span><strong>Packed &amp; ready</strong><small>—</small><p>Your food will be packed shortly.</p></li>
              <li><span><BusIcon /></span><strong>Pickup at {pickupStop} bus stand</strong><small>—</small><p>Collect at your selected stop.</p></li>
            </ol>
          </section>
          <div className="ck-order-actions">
            <button type="button" className="ck-order-download" onClick={() => window.print()}><DownloadIcon />Download invoice</button>
            <button
              type="button"
              className="ck-order-track-button"
              onClick={() => navigate(orderId ? withOrderId(routes.trackOrder, orderId) : routes.trackOrder)}
            >
              <PinIcon />Track your order
            </button>
          </div>
        </section>

        <aside className="ck-order-summary-sidebar">
          <section className="ck-order-pickup-card">
            <h2><NoteIcon />Order &amp; Pickup Summary</h2>
            <div className="ck-order-pickup-grid">
              <OrderDetail icon={<ProfileIcon />} label="Collector name" value={collectorName} />
              <OrderDetail icon={<PhoneIcon />} label="Mobile number" value={collectorPhone} />
              <OrderDetail
                icon={<PinIcon />}
                label="Pickup location"
                value={`${pickupStop} bus stand`}
              />
              <OrderDetail icon={<CalendarIcon />} label="Date" value={date} />
              <OrderDetail
                icon={<BusIcon />}
                label="Journey"
                value={journeyLabel}
              />
              {savedBusNumber.trim() ? (
                <OrderDetail icon={<BusIcon />} label="Bus number" value={savedBusNumber.trim()} />
              ) : null}
              {savedSeatNumber.trim() ? (
                <OrderDetail icon={<PinIcon />} label="Seat number" value={savedSeatNumber.trim()} />
              ) : null}
            </div>
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
  order,
  bag,
  stop,
  subtotal,
  total,
  date,
}: {
  order: Order | null;
  bag: BagLine[];
  stop: ReturnType<typeof pickupMeta>;
  subtotal: number;
  total: number;
  date: string;
}) {
  const { kitchen, routes } = useKitchenFlow();
  const itemCount = order?.itemCount ?? bag.reduce((sum, line) => sum + line.qty, 0);
  const journeyDate = date.split("-").join(" ");
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();
  const orderNumber = order?.orderNumber ? `#${order.orderNumber}` : "—";
  const orderKitchen =
    getMenuKitchenFallback(order?.kitchenId ?? kitchen.id) ?? kitchen;
  const kitchenName = order?.kitchenName ?? orderKitchen.name;
  const kitchenImage = kitchenPhoto(orderKitchen, paymentKitchen);
  const pickupStop = order?.pickupStopName ?? stop.name;
  const lines = order
    ? order.items.map((item) => ({
        key: item.id,
        name: item.dishName,
        qty: item.quantity,
        lineTotal: item.lineTotal,
        photo: orderMealPhoto(item.dishCode, order.kitchenId),
      }))
    : bag.map(({ meal, qty }) => ({
        key: meal.id,
        name: meal.name,
        qty,
        lineTotal: meal.price * qty,
        photo: meal.photo,
      }));
  const gst = order?.taxAmount ?? checkoutGstFromSubtotal(subtotal);

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
          <h1>Order placed</h1>
          <p>{paymentStatusSummary(order?.paymentStatus)}</p>
          <small>Order ID: {orderNumber} <NoteIcon /></small>
        </div>
        <img src={paymentCompleteInvoice} alt="" />
      </section>

      <section className="ck-mobile-complete-card" aria-label="Order details">
        <div className="ck-mobile-complete-kitchen">
          <img src={kitchenImage} alt="" />
          <div>
            <strong>From {kitchenName}</strong>
            {orderKitchen.isVegetarian === true ? (
              <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
            ) : null}
            <small>{itemCount} items - {lines.map((line) => line.name).join(", ")}</small>
          </div>
        </div>
        <div className="ck-mobile-complete-meta">
          <small>Order ID: {orderNumber}</small>
          <small>{journeyDate}</small>
        </div>
        <div className="ck-mobile-complete-pickup">
          <span><PinIcon /><small>Pickup point</small><strong>{pickupStop}</strong></span>
        </div>
        <div className="ck-mobile-complete-items">
          <div className="ck-mobile-complete-table-head"><span>Item</span><span>Qty</span><span>Amount</span></div>
          {lines.map((line) => (
            <div className="ck-mobile-complete-item" key={line.key}>
              <img src={line.photo} alt="" />
              <span><strong>{line.name}</strong></span>
              <span>{line.qty}</span>
              <strong>{formatRupees(line.lineTotal)}</strong>
            </div>
          ))}
        </div>
        <div className="ck-mobile-complete-totals">
          <p><span>Items total ({itemCount} items)</span><strong>{formatCheckoutMoney(subtotal)}</strong></p>
          <p><span>GST (18%)</span><strong>{formatGstAmount(gst)}</strong></p>
          <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
          <p className="ck-mobile-complete-paid"><strong>Order total</strong><strong>{formatCartAmountForCheckout(total)}</strong></p>
          <p><span>Payment status</span><strong>{paymentStatusLabel(order?.paymentStatus)}</strong></p>
        </div>
      </section>

      <section className="ck-mobile-complete-status">
        <h2>Order status</h2>
        <ol>
          <li className="is-complete"><span><CheckIcon /></span><strong>Order<br />placed</strong></li>
          <li className="is-current"><span><NoteIcon /></span><strong>Preparing<br />order</strong></li>
          <li><span><BoxIcon /></span><strong>Ready for<br />pickup</strong></li>
          <li><span><DeliveryIcon /></span><strong>Order<br />completed</strong></li>
        </ol>
      </section>

      <button
        className="ck-mobile-complete-track"
        type="button"
        onClick={() => navigate(orderId ? withOrderId(routes.trackOrder, orderId) : routes.trackOrder)}
      >
        <span><PinIcon /></span>
        <span><strong>Track your order</strong><small>Get real-time updates on your order status</small></span>
        <PaymentChevronIcon />
      </button>

      <footer className="ck-mobile-complete-actions">
        <button type="button" onClick={() => navigate(routes.invoice)}><DownloadIcon />View invoice</button>
        <button type="button" onClick={() => navigate(PATHS.helpSupport)}><HelpIcon />Need help?</button>
      </footer>
    </div>
  );
}

function formatCartAmountForCheckout(value: number) {
  return formatCheckoutMoney(value);
}

function MobileOrderInvoice({
  order,
  bag,
  journey,
  stop,
  paymentMethod,
}: {
  order: Order | null;
  bag: BagLine[];
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
  paymentMethod: PaymentMethod;
}) {
  const { kitchen, routes } = useKitchenFlow();

  const [shareMessage, setShareMessage] = useState("");
  const subtotal = order?.subtotal ?? bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const itemCount = order?.itemCount ?? bag.reduce((sum, line) => sum + line.qty, 0);
  const gst = order?.taxAmount ?? checkoutGstFromSubtotal(subtotal);
  const total = order?.total ?? checkoutTotalFromSubtotal(subtotal);
  const orderNumber = order?.orderNumber ?? "—";
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();
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
        text: `Your Aahaa order invoice (#${orderNumber}).`,
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
        <button type="button" aria-label="Back to order summary" onClick={() => navigate(routes.orderSummary)}>
          <BackChevronIcon />
        </button>
        <span className="ck-wordmark">a<span className="ck-mark-aa">ahaa<SmileIcon /></span></span>
        <h1>Order Invoice</h1>
        <button type="button" aria-label="Share invoice" onClick={() => void shareInvoice()}><ShareIcon /></button>
      </header>

      <section className="ck-mobile-invoice-success">
        <span><CheckIcon /></span>
        <div>
          <strong>Order placed</strong>
          <small>{paymentStatusSummary(order?.paymentStatus)}</small>
          <small>Order ID: {orderNumber}</small>
        </div>
        <NoteIcon />
      </section>

      <article className="ck-mobile-invoice-card">
        <header className="ck-mobile-invoice-brand">
          <strong>aahaa<span>⌣</span></strong>
          <div><b>TAX INVOICE</b><small>Homemade Food For Your Journey</small></div>
        </header>
        <dl className="ck-mobile-invoice-meta">
          <div><dt>Invoice Number</dt><dd>{orderNumber}</dd></div>
          <div><dt>Order ID</dt><dd>{orderId ?? orderNumber}</dd></div>
          <div><dt>Order Date</dt><dd>{invoiceDate}, {order?.pickupTime ?? stop.time}</dd></div>
          <div><dt>Payment Method</dt><dd>{paymentLabel}</dd></div>
          <div><dt>Payment Status</dt><dd>{paymentStatusLabel(order?.paymentStatus)}</dd></div>
        </dl>
        <div className="ck-mobile-invoice-kitchen">
          <img src={kitchenPhoto(kitchen, imgKitchenLakshmi)} alt="" />
          <div>
            <strong>From {kitchen.name}</strong>
            {kitchen.isVegetarian === true ? (
              <span className="ck-mobile-payment-veg"><LeafIcon /> Vegetarian</span>
            ) : null}
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
          <p><span>Items total ({itemCount} items)</span><strong>{formatCheckoutMoney(subtotal)}</strong></p>
          <p><span>GST (18%)</span><strong>{formatGstAmount(gst)}</strong></p>
          <p><span>Delivery Fee</span><DeliveryFeeValue /></p>
          <p className="ck-mobile-invoice-paid"><strong>Total</strong><strong>{formatCartAmountForCheckout(total)}</strong></p>
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
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={["ck-order-detail", className].filter(Boolean).join(" ")}>
      <span className="ck-order-detail-icon">{icon}</span>
      <span><small>{label}</small><strong>{value}</strong></span>
      {action}
    </div>
  );
}

type TrackTimelineStage = {
  id: "confirmed" | "preparing" | "on_the_way" | "arriving";
  title: string;
  description: string;
  state: "complete" | "current" | "pending";
  timeLabel: string;
};

function formatTrackClock(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function trackStatusBadge(status: OrderStatus | undefined): string {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "preparing":
      return "Preparing";
    case "ready_for_pickup":
      return "Ready for pickup";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "placed":
    default:
      return "Order placed";
  }
}

function buildTrackTimeline(
  status: OrderStatus | undefined,
  createdAt: string | null | undefined,
  pickupStop: string,
): TrackTimelineStage[] {
  const normalized = status ?? "placed";
  const current =
    normalized === "completed"
      ? 5
      : normalized === "ready_for_pickup"
        ? 4
        : normalized === "preparing" || normalized === "confirmed"
          ? 2
          : 1;

  const stageState = (stageRank: number): TrackTimelineStage["state"] => {
    if (normalized === "cancelled") return stageRank === 1 ? "current" : "pending";
    if (current > stageRank) return "complete";
    if (current === stageRank) return "current";
    return "pending";
  };

  return [
    {
      id: "confirmed",
      title: "Order confirmed",
      description: "Your order has been received.",
      state: stageState(1),
      timeLabel: formatTrackClock(createdAt),
    },
    {
      id: "preparing",
      title: "Preparing",
      description: "Home cook is preparing your food.",
      state: stageState(2),
      timeLabel: "—",
    },
    {
      id: "on_the_way",
      title: "On the way",
      description: `Your order is on the way from the cook’s kitchen to ${pickupStop}.`,
      state: stageState(3),
      timeLabel: "—",
    },
    {
      id: "arriving",
      title: "Arriving at pickup point",
      description: "We will notify you once it reaches the pickup point.",
      state: stageState(4),
      timeLabel: "—",
    },
  ];
}

function TrackOrderPage({ order, bag, stop }: {
  order: Order | null;
  bag: BagLine[];
  stop: ReturnType<typeof pickupMeta>;
  journey: JourneyChoice;
}) {
  const { routes } = useKitchenFlow();
  const orderId = order?.id ?? orderIdFromLocationSearch() ?? readActiveOrderId();
  const lines = order
    ? order.items.map((item) => ({
        key: item.id,
        name: item.dishName,
        qty: item.quantity,
        lineTotal: item.lineTotal,
        photo: orderMealPhoto(item.dishCode, order.kitchenId),
        pack: `${item.quantity} serving${item.quantity === 1 ? "" : "s"}`,
      }))
    : bag.map(({ meal, qty }) => ({
        key: meal.id,
        name: meal.name,
        qty,
        lineTotal: meal.price * qty,
        photo: meal.photo,
        pack: meal.pack ?? `${qty} serving${qty === 1 ? "" : "s"}`,
      }));
  const bagSubtotal = bag.reduce((sum, line) => sum + line.meal.price * line.qty, 0);
  const total = order?.total ?? checkoutTotalFromSubtotal(bagSubtotal);
  // Prefer the order snapshot so later journey edits never rewrite a placed order's map.
  const journeyFrom = order?.journeyFrom?.trim() || "";
  const journeyTo = order?.journeyTo?.trim() || "";
  // Show the exact saved pickup name (Bangalore) — do not rename for display.
  const pickupStop = order?.pickupStopName?.trim() || stop.name || FIXED_PICKUP_POINT;
  const pickupDetail = stop.detail;
  const orderNumber = order?.orderNumber ? `#${order.orderNumber}` : "—";
  const summaryPath = orderId ? withOrderId(routes.orderSummary, orderId) : routes.orderSummary;
  const status = order?.status;
  const badge = trackStatusBadge(status);
  const timeline = buildTrackTimeline(status, order?.createdAt, pickupStop);
  const journeyMissing = Boolean(order) && (!journeyFrom || !journeyTo);
  const journeyPoints = resolveOrderJourneyPoints({
    journeyFrom: journeyFrom || null,
    journeyTo: journeyTo || null,
    pickupStopName: pickupStop,
  });
  // Report all gaps; delivery route itself only needs From + Bangalore pickup.
  const missingCoords = missingJourneyCoordLabels({
    journeyFrom: journeyFrom || null,
    journeyTo: journeyTo || null,
    pickupStopName: pickupStop,
  });

  return (
    <main className="ck-main ck-track-order-main">
      <header className="ck-track-heading">
        <button type="button" aria-label="Back to order summary" onClick={() => navigate(summaryPath)}>
          <BackChevronIcon />
        </button>
        <div className="ck-track-heading-copy">
          <h1>Track your order</h1>
          <p>Order ID: {orderNumber}</p>
        </div>
        <strong className={`ck-track-live${status === "cancelled" ? " is-cancelled" : ""}`}>
          <span />
          {badge}
        </strong>
      </header>

      <div className="ck-track-layout">
        <aside className="ck-track-sidebar">
          <section className="ck-track-items">
            <h2><BagIcon />Order items</h2>
            {lines.length > 0 ? (
              lines.map((line) => (
                <div className="ck-track-item" key={line.key}>
                  <img src={line.photo} alt="" />
                  <span>
                    <strong>{line.name}</strong>
                    <small>{line.pack}</small>
                  </span>
                  <strong>{formatRupees(line.lineTotal)}</strong>
                </div>
              ))
            ) : (
              <p className="ck-track-empty">No items to show for this order yet.</p>
            )}
            <p className="ck-track-total">
              <strong>Total amount</strong>
              <strong>{formatCheckoutMoney(total)}</strong>
            </p>
          </section>

          <section className="ck-track-journey-card">
            <h2>Saved journey</h2>
            <p><span>From</span><strong>{journeyFrom || "—"}</strong></p>
            <p><span>Pickup</span><strong>{pickupStop}</strong></p>
            <p><span>To</span><strong>{journeyTo || "—"}</strong></p>
            <small>{pickupDetail}</small>
            {journeyMissing ? (
              <p className="ck-track-journey-missing">
                This order has no saved From / To snapshot. Historical journey details cannot be invented.
              </p>
            ) : null}
          </section>

          <section className="ck-track-partner">
            <img src={a.imgRedHattedDeliveryRiderWithParcel1} alt="" />
            <span>
              <small>Delivery partner</small>
              <strong>Arun Kumar</strong>
              <small className="ck-track-rating">★ 4.8&nbsp; | &nbsp;1,250+ deliveries</small>
              <small className="ck-track-partner-note">Live GPS tracking is not available yet.</small>
            </span>
            <a href="tel:+919876543210" aria-label="Call delivery partner"><PhoneIcon /></a>
          </section>
        </aside>

        <TrackOrderMap
          points={journeyPoints}
          fromLabel={journeyFrom || "—"}
          toLabel={journeyTo || "—"}
          pickupLabel={pickupStop}
          missingCoordLabels={missingCoords}
          journeyMissing={journeyMissing}
        />
      </div>

      <ol className="ck-track-timeline" aria-label="Order tracking timeline">
        {timeline.map((stage) => (
          <li
            key={stage.id}
            className={
              stage.state === "complete"
                ? "is-complete"
                : stage.state === "current"
                  ? "is-current"
                  : undefined
            }
          >
            <span aria-hidden="true">
              {stage.state === "complete" ? (
                <CheckIcon />
              ) : stage.id === "on_the_way" ? (
                <DeliveryIcon />
              ) : stage.id === "arriving" ? (
                <BusIcon />
              ) : stage.id === "preparing" ? (
                <BagIcon />
              ) : (
                <CheckIcon />
              )}
            </span>
            <strong>{stage.title}</strong>
            <small>{stage.timeLabel}</small>
            <p>{stage.description}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}

function MealBagErrorToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 4200);
    return () => window.clearTimeout(timer);
    // Auto-dismiss only for this toast mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ck-bag-error" role="alert" aria-live="assertive">
      <div className="ck-bag-error-card">
        <p>{message}</p>
        <button type="button" aria-label="Dismiss" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}

function MealBagAddedToast({ meal, onClose }: { meal: Meal; onClose: () => void }) {
  const profile = mealBagAnimProfile(meal);
  const [leaving, setLeaving] = useState(false);
  const closedRef = useRef(false);

  const beginClose = () => {
    if (closedRef.current || leaving) return;
    const reduceMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      closedRef.current = true;
      onClose();
      return;
    }
    setLeaving(true);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        if (!closedRef.current) {
          closedRef.current = true;
          onClose();
        }
        return;
      }
      setLeaving(true);
    }, 2300);
    return () => window.clearTimeout(timer);
    // Auto-dismiss only for this toast mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ck-bag-added" role="status" aria-live="polite">
      <div
        className={`ck-bag-added-card${mealBagShowsSteam(meal) ? " ck-bag-added-card--hot" : ""}${
          leaving ? " is-leaving" : ""
        }`}
        onAnimationEnd={(event) => {
          if (event.target !== event.currentTarget || !leaving || closedRef.current) return;
          closedRef.current = true;
          onClose();
        }}
      >
        <button className="ck-bag-added-close" type="button" aria-label="Close" onClick={beginClose}>
          ×
        </button>
        <span
          className={`ck-bag-added-photo${mealBagShowsSteam(meal) ? " ck-bag-added-photo--hot" : ""} is-serve`}
          aria-hidden="true"
        >
          <MealBagAliveLayers meal={meal} profile={profile} boost />
        </span>
        <div className="ck-bag-added-copy">
          <strong>{meal.name}</strong>
          <em>{mealBagServingLabel(meal)}</em>
          <p>Freshly prepared for you!</p>
        </div>
      </div>
    </div>
  );
}

function MealBagStepper({
  name,
  qty,
  pulseKey,
  onQty,
}: {
  name: string;
  qty: number;
  pulseKey: number;
  onQty: (qty: number) => void;
}) {
  const [plusKey, setPlusKey] = useState(0);
  const lastPulseRef = useRef(0);

  useEffect(() => {
    if (pulseKey > 0 && pulseKey !== lastPulseRef.current) {
      lastPulseRef.current = pulseKey;
      setPlusKey(pulseKey);
    }
  }, [pulseKey]);

  return (
    <div className="ck-stepper ck-bag-stepper">
      <button type="button" aria-label={`Remove ${name}`} onClick={() => onQty(qty - 1)}>
        −
      </button>
      <span key={plusKey || `q-${qty}`} className={plusKey ? "is-bump" : undefined}>
        {qty}
      </span>
      {plusKey ? (
        <em
          key={`plus-${plusKey}`}
          className="ck-bag-plus-one"
          aria-hidden="true"
          onAnimationEnd={() => setPlusKey(0)}
        >
          +1
        </em>
      ) : null}
      <button type="button" aria-label={`Add ${name}`} onClick={() => onQty(qty + 1)}>
        +
      </button>
    </div>
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
  const { routes } = useKitchenFlow();
  const openDetail = () => navigate(routes.dish(meal.id));

  return (
    <article className="ck-meal-card">
      <div className="ck-meal-photo ck-meal-photo--link">
        <button type="button" className="ck-meal-photo-btn" aria-label={`Open ${meal.name}`} onClick={openDetail}>
          <img src={meal.photo} alt="" />
        </button>
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
  const { routes } = useKitchenFlow();
  const openDetail = () => navigate(routes.dish(meal.id));

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
          <button className="ck-details" type="button" onClick={openDetail}>
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
  const { routes } = useKitchenFlow();
  const openDetail = () => navigate(routes.dish(meal.id));

  return (
    <article className="ck-snack-side">
      <img src={meal.photo} alt="" />
      <div className="ck-snack-side-copy">
        <strong>{meal.name}</strong>
        <p>
          {meal.pack ? `${meal.pack} · ` : null}
          {formatRupees(meal.price)}
        </p>
        <button className="ck-details" type="button" onClick={openDetail}>
          View details
        </button>
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

const LEMON_RICE_ABOUT =
  "A traditional South Indian lemon rice made with ponni rice, fresh lemon, roasted peanuts, curry leaves and a blend of homemade spices. Light, flavourful and perfect for your journey.";

const LEMON_RICE_INGREDIENTS =
  "Rice, lemon, peanuts, curry leaves, mustard seeds, turmeric, potato";

function isSwathiLemonRice(mealId: string) {
  return mealId === "lemon-rice";
}

function mealFoodTypeLabel(meal: Meal) {
  if (isSwathiLemonRice(meal.id)) return "Rice meal";
  if (meal.category === "breakfast") return "Breakfast";
  if (meal.category === "snacks") return "Homemade snack";
  return "Homestyle meal";
}

function mealIncludeItems(meal: Meal): { label: string; photo: string }[] {
  if (isSwathiLemonRice(meal.id)) {
    return [
      { label: "Lemon rice", photo: lemonIncRice },
      { label: "Potato fry", photo: lemonIncPotato },
      { label: "Pickle", photo: lemonIncPickle },
    ];
  }
  if (meal.pack) {
    return [{ label: meal.pack, photo: meal.photo }];
  }
  const parts = meal.description
    .split(/\s*(?:,|&| with | and )\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 3);
  if (parts.length === 0) {
    return [{ label: meal.name, photo: meal.photo }];
  }
  return parts.map((label) => ({
    label: label.charAt(0).toUpperCase() + label.slice(1),
    photo: meal.photo,
  }));
}

function mealDetailCopy(meal: Meal) {
  if (isSwathiLemonRice(meal.id)) {
    return {
      title: "Lemon rice & potato fry",
      mobileTitle: "Lemon Rice",
      lead: "Tangy lemon rice with a comforting side of potato fry.",
      mobileLead: "Home made lemon rice with peanuts and mild spices",
      about: LEMON_RICE_ABOUT,
      ingredients: LEMON_RICE_INGREDIENTS,
      servingPrimary: "1 serving",
      servingHint: "Perfect for one",
      portionLabel: "1 Serving",
      includesHeading: "Included in this meal",
      aboutHeading: "About this meal",
      deskReviews: [
        { name: "Ananya", rating: "5.0", text: "Fresh, tangy and perfect for the bus ride. The potato fry was crisp." },
        { name: "Ravi", rating: "4.5", text: "Tastes like home. Mild spice and packed well for pickup." },
      ] as const,
      mobileReviews: [
        {
          name: "Prasanth S",
          date: "12 Oct 2026",
          text: "Very tasty and fresh. Perfect for travel. The lemon rice was flavourful and not too spicy.",
        },
        {
          name: "Priya A",
          date: "16 Oct 2026",
          text: "Very tasty and fresh. Perfect for travel. The lemon rice was flavourful and not too spicy.",
        },
      ] as const,
      mobileReviewHead: "Reviews ( 24 )",
      mobileReviewScore: "4.8 ( 120+ )",
    };
  }

  const servingPrimary = meal.pack ?? "1 serving";
  const servingHint = meal.pack ? "Homemade snack pack" : "Perfect for one";
  return {
    title: meal.name,
    mobileTitle: meal.name,
    lead: meal.description,
    mobileLead: meal.description,
    about: meal.pack
      ? `${meal.description}. Packed as a ${meal.pack.toLowerCase()} — freshly made and ready for your journey.`
      : `${meal.description}. Freshly made in a home kitchen and packed carefully for pickup on your journey.`,
    ingredients: meal.description,
    servingPrimary,
    servingHint,
    portionLabel: meal.pack ?? "1 Serving",
    includesHeading: meal.category === "snacks" ? "Included in this pack" : "Included in this meal",
    aboutHeading: meal.category === "snacks" ? "About this snack" : "About this meal",
    deskReviews: [
      { name: "Ananya", rating: "5.0", text: "Fresh and flavourful — perfect for the bus ride." },
      { name: "Ravi", rating: "4.5", text: "Tastes like home. Mild spice and packed well for pickup." },
    ] as const,
    mobileReviews: [
      {
        name: "Prasanth S",
        date: "12 Oct 2026",
        text: "Very tasty and fresh. Perfect for travel — flavourful and not too spicy.",
      },
      {
        name: "Priya A",
        date: "16 Oct 2026",
        text: "Homestyle taste and packed carefully. Would order again for the journey.",
      },
    ] as const,
    mobileReviewHead: `Reviews ( ${meal.reviews} )`,
    mobileReviewScore: `${meal.rating} ( ${meal.reviews}+ )`,
  };
}

function FoodDetail({
  mealId,
  bag,
  addMeal,
  setQty,
  journey,
  stop,
}: {
  mealId: string;
  bag: BagLine[];
  addMeal: (meal: Meal) => void;
  setQty: (id: string, qty: number) => void;
  journey: JourneyChoice;
  stop: ReturnType<typeof pickupMeta>;
}) {
  const { kitchen, routes } = useKitchenFlow();
  const catalogue = getKitchenMeals(kitchen.id);
  const meal = catalogue.find((item) => item.id === mealId) ?? null;
  const qty = meal ? bag.find((line) => line.meal.id === meal.id)?.qty ?? 0 : 0;
  const displayQty = qty > 0 ? qty : 1;
  const [activeThumb, setActiveThumb] = useState(0);
  const [dishFacts, setDishFacts] = useState<{
    kitchenId: string;
    dishCode: string;
    status: "loading" | "loaded" | "error";
    spiceLevel: string | null;
    allergens: string[];
  } | null>(null);
  const gallery = meal ? foodDetailGallery(meal) : [];
  const copy = meal ? mealDetailCopy(meal) : null;
  const includes = meal ? mealIncludeItems(meal) : [];
  const heroSrc = gallery[Math.min(activeThumb, Math.max(gallery.length - 1, 0))] ?? meal?.photo ?? "";
  const currentFacts =
    meal &&
    dishFacts?.kitchenId === kitchen.id &&
    dishFacts.dishCode === meal.id
      ? dishFacts
      : null;
  const allergenText =
    currentFacts?.status === "loaded"
      ? currentFacts.allergens.length > 0
        ? currentFacts.allergens.join(", ")
        : "Allergen information not provided by the kitchen."
      : currentFacts?.status === "error"
        ? "Unable to load allergen information."
        : "Loading allergen information…";
  const spiceText =
    currentFacts?.status === "loaded"
      ? currentFacts.spiceLevel ?? "Not specified"
      : currentFacts?.status === "error"
        ? "Unable to load"
        : "Loading…";

  useEffect(() => {
    setActiveThumb(0);
  }, [mealId]);

  useEffect(() => {
    if (!meal) navigate(routes.menu);
  }, [meal, routes.menu]);

  useEffect(() => {
    if (!meal) return;
    const controller = new AbortController();
    setDishFacts({
      kitchenId: kitchen.id,
      dishCode: meal.id,
      status: "loading",
      spiceLevel: null,
      allergens: [],
    });
    void getKitchenDish(kitchen.id, meal.id, controller.signal)
      .then((dish) => {
        if (controller.signal.aborted) return;
        setDishFacts({
          kitchenId: kitchen.id,
          dishCode: meal.id,
          status: "loaded",
          spiceLevel: dish.spiceLevel,
          allergens: dish.allergens,
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDishFacts({
          kitchenId: kitchen.id,
          dishCode: meal.id,
          status: "error",
          spiceLevel: null,
          allergens: [],
        });
      });
    return () => controller.abort();
  }, [kitchen.id, meal?.id]);

  if (!meal || !copy) return null;

  return (
    <main className="ck-main ck-main--meal">
      <div className="ck-crumbs ck-crumbs--meal">
        <button className="ck-back" type="button" onClick={() => navigate(routes.menu)}>
          ← Back to menu
        </button>
      </div>

      <section className="ck-meal-detail">
        <div className="ck-meal-gallery">
          <div className="ck-meal-hero-wrap">
            <img className="ck-meal-hero" src={heroSrc} alt="" />
          </div>
          {gallery.length > 0 ? (
            <div className="ck-meal-thumbs" data-count={gallery.length}>
              {gallery.map((src, index) => (
                <button
                  key={`${meal.id}-thumb-${index}`}
                  type="button"
                  className={index === activeThumb ? "is-on" : undefined}
                  aria-pressed={index === activeThumb}
                  aria-label={`View photo ${index + 1} of ${gallery.length}`}
                  onClick={() => setActiveThumb(index)}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="ck-meal-info">
          <em className="ck-meal-veg">
            <LeafIcon />
            Vegetarian
          </em>
          <h1>{copy.title}</h1>
          <button className="ck-meal-by" type="button" onClick={() => navigate(routes.menu)}>
            By {kitchen.name}
          </button>
          <p className="ck-rating">
            <StarIcon />
            {meal.rating} · {meal.reviews} reviews
          </p>
          <p className="ck-meal-lead">{copy.lead}</p>

          <div className="ck-meal-price-row">
            <strong className="ck-meal-detail-price">{formatRupees(meal.price)}</strong>
            <span className="ck-meal-price-rule" aria-hidden="true" />
            <p className="ck-meal-serve">
              <img className="ck-meal-cloche" src={serveCloche} alt="" />
              <span>
                <b>{copy.servingPrimary}</b>
                {copy.servingHint}
              </span>
            </p>
          </div>

          <div className="ck-meal-includes">
            <span>{copy.includesHeading}</span>
            <div>
              {includes.map((item) => (
                <figure key={`${meal.id}-${item.label}`}>
                  <img src={item.photo} alt="" />
                  <figcaption>{item.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="ck-meal-facts">
            <div className="ck-meal-facts-top">
              <p>
                <strong>Ingredients</strong>
                {copy.ingredients}
              </p>
              <div className="ck-meal-allergen-block">
                <strong>Allergen information</strong>
                <p className="ck-meal-allergen" aria-live="polite">
                  <AlertIcon />
                  {allergenText}
                </p>
              </div>
            </div>
            <p className="ck-meal-spice" aria-live="polite">
              <span className="ck-meal-spice-label">Spice level</span>
              <em className="ck-meal-spice-badge">
                {currentFacts?.status === "loaded" && currentFacts.spiceLevel ? (
                  <>
                    <span className="ck-meal-chili" aria-hidden="true">
                      🌶️
                    </span>
                    {spiceText}
                  </>
                ) : (
                  spiceText
                )}
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
            <h2>{copy.aboutHeading}</h2>
            <p>{copy.about}</p>
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
          {meal.rating} / {meal.reviews} reviews
        </h2>
        <div className="ck-meal-review-grid">
          {copy.deskReviews.map((review) => (
            <article key={review.name}>
              <div className="ck-meal-review-head">
                <span className="ck-meal-review-avatar" aria-hidden="true">
                  {review.name.charAt(0)}
                </span>
                <div className="ck-meal-review-meta">
                  <strong>{review.name}</strong>
                  <p className="ck-rating">
                    <StarIcon />
                    {review.rating}
                  </p>
                </div>
              </div>
              <p>{review.text}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="ck-m-meal">
        <img className="ck-m-meal-hero" src={meal.photo} alt="" />
        <div className="ck-m-meal-top">
          <div>
            <h1>{copy.mobileTitle}</h1>
            <p>{copy.mobileLead}</p>
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
          <p>{copy.about}</p>
        </section>
        <div className="ck-meal-facts ck-m-meal-facts">
          <div className="ck-meal-allergen-block">
            <strong>Allergen information</strong>
            <p className="ck-meal-allergen" aria-live="polite">
              <AlertIcon />
              {allergenText}
            </p>
          </div>
          <p className="ck-meal-spice" aria-live="polite">
            <span className="ck-meal-spice-label">Spice level</span>
            <em className="ck-meal-spice-badge">
              {currentFacts?.status === "loaded" && currentFacts.spiceLevel ? (
                <>
                  <span className="ck-meal-chili" aria-hidden="true">
                    🌶️
                  </span>
                  {spiceText}
                </>
              ) : (
                spiceText
              )}
            </em>
          </p>
        </div>
        <div className="ck-m-meal-meta">
          <div>
            <img className="ck-m-meal-meta-ico" src={metaChefHat} alt="" />
            <span>
              <small>Food type</small>
              <strong>{mealFoodTypeLabel(meal)}</strong>
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
              <strong>{copy.portionLabel}</strong>
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
            <h2>{copy.mobileReviewHead}</h2>
            <p className="ck-rating">
              <StarIcon />
              {copy.mobileReviewScore}
            </p>
          </div>
          {copy.mobileReviews.map((review) => (
            <article key={review.name}>
              <strong>{review.name}</strong>
              <span>{review.date}</span>
              <p>{review.text}</p>
            </article>
          ))}
        </section>
        <div className="ck-m-meal-bar">
          <div>
            <strong>{formatRupees(meal.price)}</strong>
            <small>{copy.portionLabel}</small>
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
  const [suggest, setSuggest] = useState<"from" | "to" | "pickup" | null>(null);
  const [typed, setTyped] = useState(false);
  const fromRecentsState = useLocationRecents("from");
  const toRecentsState = useLocationRecents("to");
  const [viewMonth, setViewMonth] = useState(() => new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
  const editDate = `${journey.date.getDate()} ${MONTHS[journey.date.getMonth()].slice(0, 3)} ${journey.date.getFullYear()}`;
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

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!cardRef.current?.contains(event.target as Node)) {
        setPanel(null);
        setSuggest(null);
        setTyped(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanel(null);
        setSuggest(null);
        setTyped(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function toggleDate() {
    setSuggest(null);
    setTyped(false);
    setPanel(panel === "date" ? null : "date");
    setViewMonth(new Date(journey.date.getFullYear(), journey.date.getMonth(), 1));
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
            open={false}
            onToggle={() => undefined}
            text
            onFocus={() => {
              setPanel(null);
              setSuggest("from");
              setTyped(false);
            }}
            onChange={(next) => {
              setJourney((current) => ({ ...current, from: next }));
              setPanel(null);
              setSuggest("from");
              setTyped(true);
            }}
          >
            {showFromSuggest ? (
              <JourneyPlaceSuggest
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
            open={false}
            onToggle={() => undefined}
            text
            onFocus={() => {
              setPanel(null);
              setSuggest("to");
              setTyped(false);
            }}
            onChange={(next) => {
              setJourney((current) => ({ ...current, to: next }));
              setPanel(null);
              setSuggest("to");
              setTyped(true);
            }}
          >
            {showToSuggest ? (
              <JourneyPlaceSuggest
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
          </EditField>
        </div>

        <EditField
          label="Pickup point"
          icon={<ShelterIcon />}
          value={FIXED_PICKUP_POINT}
          open={false}
          onToggle={() => undefined}
          wide
          text
          onFocus={() => {
            setPanel(null);
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
            setPanel(null);
            setSuggest(null);
            setTyped(false);
          }}
        />
        <p className="ck-ef-hint">Choose a convenient stop along your route.</p>

        <div className="ck-ef-split">
          <EditField
            label="Date of journey"
            icon={<DateCalIcon />}
            value={editDate}
            open={panel === "date"}
            onToggle={toggleDate}
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
  text,
  onFocus,
  onChange,
  children,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  open: boolean;
  onToggle: () => void;
  wide?: boolean;
  text?: boolean;
  onFocus?: () => void;
  onChange?: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className={[wide ? "ck-ef ck-ef--wide" : "ck-ef", text ? "ck-ef--text" : ""].filter(Boolean).join(" ")}>
      {text ? null : <span className="ck-ef-label">{label}</span>}
      {text ? (
        <div className="ck-ef-text">
          {icon}
          <label className="ck-ef-text-copy">
            <span>{label}</span>
            <input
              value={value}
              aria-label={label}
              aria-haspopup="listbox"
              onFocus={onFocus}
              onChange={(event) => onChange?.(event.target.value)}
            />
          </label>
          <span className="ck-ef-text-chevron" aria-hidden="true">
            <ChevronIcon />
          </span>
        </div>
      ) : (
        <button className="ck-ef-btn" type="button" aria-expanded={open} aria-haspopup="listbox" onClick={onToggle}>
          {icon}
          <strong>{value}</strong>
          <ChevronIcon />
        </button>
      )}
      {text ? children : open ? <div className="ck-dd">{children}</div> : null}
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
  const { routes } = useKitchenFlow();
  const items = [
    { id: "home", label: "Home", icon: <HomeNavIcon />, path: PATHS.cooks },
    { id: "orders", label: "My Orders", icon: <OrdersNavIcon />, path: PATHS.myOrders },
    { id: "track", label: "Track Journey", icon: <TrackNavIcon />, path: routes.trackOrder },
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
      <path d="M15 5.5 8.5 12 15 18.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
  const { routes } = useKitchenFlow();
  const items: { id: AccountSection; label: string; description: string; path: string; icon: ReactNode; mobileOnly?: boolean }[] = [
    { id: "profile", label: "My Profile", description: "Name, mobile number, email", path: PATHS.profile, icon: <ProfileIcon /> },
    { id: "orders", label: "My Orders", description: "View and track your orders", path: PATHS.myOrders, icon: <OrdersNavIcon /> },
    { id: "payments", label: "Payment methods", description: "Manage cards and UPI", path: routes.paymentMethod, icon: <CreditCardIcon />, mobileOnly: true },
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

function useAuthenticatedProfile() {
  const cached = readCachedProfile();
  const [profile, setProfile] = useState<AuthProfile | null>(cached);
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(() => Boolean(getAccessToken()));

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setSignedIn(false);
      setProfile(null);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();
    setSignedIn(true);
    setLoading(true);
    setError("");

    void getMyProfile(controller.signal)
      .then((next) => {
        cacheProfile(next);
        setProfile(next);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          clearAuthSession();
          setSignedIn(false);
          setProfile(null);
          setError("Please log in to view your profile.");
        } else {
          setError(err instanceof Error ? err.message : "Unable to load your profile.");
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { profile, setProfile, loading, error, setError, signedIn };
}

function ProfilePage({ onPaymentMethods }: { onPaymentMethods: () => void }) {
  const { profile, setProfile, loading, error, setError, signedIn } = useAuthenticatedProfile();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const formSeed = profileToFormState(profile);
  const [name, setName] = useState(formSeed.name);
  const [phone, setPhone] = useState(formSeed.phone);
  const [email, setEmail] = useState(formSeed.email);

  useEffect(() => {
    const next = profileToFormState(profile);
    setName(next.name);
    setPhone(next.phone);
    setEmail(next.email);
  }, [profile]);

  const displayName = formatProfileName(profile?.fullName ?? name);
  const displayPhone = formatProfilePhone(profile?.phone ?? (phone ? `+91${phone}` : null));
  const displayEmail = formatProfileEmail(profile?.email ?? email);

  async function toggleEdit() {
    if (!editing) {
      setEditing(true);
      return;
    }
    if (!signedIn) {
      setError("Please log in to save profile changes.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateMyProfile({
        fullName: name.trim(),
        phone: normalizePhoneDigits(phone),
        email: email.trim(),
      });
      cacheProfile(updated);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ck-main ck-profile-main">
      <header className="ck-mobile-account-heading"><h1>Profile</h1></header>
      <div className="ck-mobile-profile-summary">
        <span className="ck-mobile-profile-avatar"><ProfileIcon /></span>
        <div>
          {loading ? <strong>Loading profile…</strong> : <strong>{displayName}</strong>}
          <small>{loading ? "…" : displayPhone}</small>
          <small>{loading ? "…" : displayEmail}</small>
        </div>
      </div>
      <AccountSidebar active="profile" onPaymentMethods={onPaymentMethods} className="ck-account-profile-menu" />
      <section className="ck-profile-content">
        <header className="ck-profile-heading"><h1>My Profile</h1><p>Manage your profile details.</p></header>
        {!signedIn ? (
          <article className="ck-profile-card">
            <p>Please <button type="button" className="ck-profile-edit" onClick={() => navigate(PATHS.login)}>log in</button> to see your registered name, mobile number, and email.</p>
          </article>
        ) : (
        <article className="ck-profile-card">
          {loading ? <p>Loading your profile from your account…</p> : null}
          {error ? <p role="alert">{error}</p> : null}
          {!loading ? (
          <div className="ck-profile-person">
            <span className="ck-profile-photo"><ProfileIcon /><span><CameraIcon /></span></span>
            <div className="ck-profile-primary-data">
              {editing ? (
                <>
                  <label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label>
                  <label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} /></label>
                  <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
                </>
              ) : (
                <>
                  <strong>{displayName}</strong>
                  <span>{displayPhone}</span>
                  <span>{displayEmail}</span>
                </>
              )}
            </div>
            <button className="ck-profile-edit" type="button" disabled={saving} onClick={() => void toggleEdit()}>
              <PencilIcon />{editing ? (saving ? "Saving…" : "Save") : "Edit"}
            </button>
          </div>
          ) : null}
          {!editing && !loading ? (
            <div className="ck-profile-details">
              <p><PhoneIcon /><strong>Mobile number</strong><span>{displayPhone}</span></p>
              <p><EmailIcon /><strong>Email address</strong><span>{displayEmail}</span></p>
              <p><ProfileIcon /><strong>Name</strong><span>{displayName}</span></p>
            </div>
          ) : null}
        </article>
        )}
      </section>
    </main>
  );
}

function AccountDetailsPage() {
  const { routes } = useKitchenFlow();
  const { profile, setProfile, loading, error, setError, signedIn } = useAuthenticatedProfile();
  const formSeed = profileToFormState(profile);
  const [name, setName] = useState(formSeed.name);
  const [phone, setPhone] = useState(formSeed.phone ? formatProfilePhone(profile?.phone) : "");
  const [email, setEmail] = useState(formSeed.email);
  const [editing, setEditing] = useState({ name: false, phone: false, email: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.fullName?.trim() ?? "");
    setPhone(profile?.phone ? formatProfilePhone(profile.phone) : "");
    setEmail(profile?.email?.trim() ?? "");
  }, [profile]);

  if (!window.matchMedia("(max-width: 767px)").matches) {
    return <ProfilePage onPaymentMethods={() => navigate(routes.paymentMethod)} />;
  }

  function toggleEditing(field: keyof typeof editing) {
    setEditing((current) => ({ ...current, [field]: !current[field] }));
  }

  async function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedIn) {
      setError("Please log in to save account details.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const updated = await updateMyProfile({
        fullName: name.trim(),
        phone: normalizePhoneDigits(phone),
        email: email.trim(),
      });
      cacheProfile(updated);
      setProfile(updated);
      setEditing({ name: false, phone: false, email: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save account details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="ck-account-details">
      <header className="ck-account-details-heading">
        <h1>Account details</h1>
        <p>Manage your personal information</p>
      </header>
      {!signedIn ? <p>Please log in to view your account details.</p> : null}
      {loading ? <p>Loading your account details…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      <form className="ck-account-details-form" onSubmit={(event) => void saveDetails(event)}>
        <AccountDetailField
          label="Full name"
          value={name || (loading ? "Loading…" : "Not provided")}
          icon={<ProfileIcon />}
          editing={editing.name}
          onChange={setName}
          onEdit={() => toggleEditing("name")}
        />
        <AccountDetailField
          label="Mobile number"
          value={phone || (loading ? "Loading…" : "Not provided")}
          icon={<PhoneIcon />}
          verified
          editing={editing.phone}
          onChange={setPhone}
          onEdit={() => toggleEditing("phone")}
        />
        <AccountDetailField
          label="Email address"
          value={email || (loading ? "Loading…" : "Not provided")}
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
        <button className="ck-account-details-save" type="submit" disabled={saving || !signedIn || loading}>
          {saving ? "Saving…" : "Save changes"}
        </button>
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
type MobileOrderFilter = "All Orders" | "Completed" | "Cancelled";
type UiOrderStatus = "Delivered" | "Preparing" | "On the way" | "Cancelled" | "Completed" | "Placed";

function mapOrderStatusToUi(status: OrderStatus): UiOrderStatus {
  switch (status) {
    case "completed":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    case "ready_for_pickup":
      return "On the way";
    case "preparing":
    case "confirmed":
      return "Preparing";
    case "placed":
    default:
      return "Placed";
  }
}

function isOngoingStatus(status: OrderStatus): boolean {
  return status === "placed" || status === "confirmed" || status === "preparing" || status === "ready_for_pickup";
}

function formatOrderListDate(iso: string | null, createdAt: string): string {
  const raw = iso ? `${iso}T12:00:00` : createdAt;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function MyOrdersPage() {
  useKitchenFlow();
  const [filter, setFilter] = useState<OrderFilter>("All Orders");
  const [mobileFilter, setMobileFilter] = useState<MobileOrderFilter>("All Orders");
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(() => Boolean(getAccessToken()));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<OrderListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const signedIn = Boolean(getAccessToken());
  const filters: OrderFilter[] = ["All Orders", "Ongoing", "Delivered", "Cancelled"];
  const mobileFilters: MobileOrderFilter[] = ["All Orders", "Completed", "Cancelled"];

  useEffect(() => {
    if (!signedIn) {
      setOrders([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const rows = await listOrders(controller.signal);
        if (controller.signal.aborted) return;
        setOrders(rows);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Could not load your orders.");
        setOrders([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [signedIn]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const counts: Record<OrderFilter, number> = {
    "All Orders": orders.length,
    Ongoing: orders.filter((order) => isOngoingStatus(order.status)).length,
    Delivered: orders.filter((order) => order.status === "completed").length,
    Cancelled: orders.filter((order) => order.status === "cancelled").length,
  };
  const visibleOrders = orders.filter((order) => {
    if (filter === "All Orders") return true;
    if (filter === "Ongoing") return isOngoingStatus(order.status);
    if (filter === "Delivered") return order.status === "completed";
    return order.status === "cancelled";
  });
  const mobileCounts: Record<MobileOrderFilter, number> = {
    "All Orders": orders.length,
    Completed: orders.filter((order) => order.status === "completed").length,
    Cancelled: orders.filter((order) => order.status === "cancelled").length,
  };
  const visibleMobileOrders = orders.filter((order) => {
    if (mobileFilter === "All Orders") return true;
    if (mobileFilter === "Completed") return order.status === "completed";
    return order.status === "cancelled";
  });

  function openOrder(order: OrderListItem) {
    writeActiveOrderId(order.id);
    const target = isOngoingStatus(order.status)
      ? withOrderId(kitchenPaths(order.kitchenId).trackOrder, order.id)
      : withOrderId(kitchenPaths(order.kitchenId).orderSummary, order.id);
    navigate(target);
  }

  async function confirmDeleteOrder() {
    if (!pendingDelete || deleting) return;
    const orderId = pendingDelete.id;
    setDeleting(true);
    setNotice(null);
    try {
      await deleteOrder(orderId);
      setOrders((current) => current.filter((order) => order.id !== orderId));
      setPendingDelete(null);
      setNotice({ type: "success", message: "Order deleted successfully." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Could not delete this order.",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="ck-main ck-profile-main ck-orders-main">
      <AccountSidebar active="orders" />
      <section className="ck-orders-content">
        <header className="ck-profile-heading ck-orders-desktop-heading"><h1>My Orders</h1><p>Track your past and current orders.</p></header>
        <header className="ck-mobile-account-heading"><h1>My Orders</h1></header>
        {!signedIn ? (
          <p className="ck-orders-empty">
            Please <button type="button" className="ck-profile-edit" onClick={() => navigate(PATHS.login)}>sign in</button> to see your orders.
          </p>
        ) : null}
        {signedIn && error ? <p className="ck-place-order-error" role="alert">{error}</p> : null}
        {notice ? (
          <p
            className={`ck-orders-notice${notice.type === "error" ? " is-error" : ""}`}
            role={notice.type === "error" ? "alert" : "status"}
          >
            {notice.message}
          </p>
        ) : null}
        {signedIn && loading ? <p className="ck-orders-empty">Loading your orders…</p> : null}
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
          {visibleOrders.map((order) => {
            const uiStatus = mapOrderStatusToUi(order.status);
            const meals = order.items?.length
              ? order.items
              : order.primaryItemName
                ? [{
                    id: `${order.id}-primary`,
                    dishId: null,
                    dishCode: "lemon-rice",
                    dishName: order.primaryItemName,
                    unitPrice: order.total,
                    quantity: order.itemCount || 1,
                    lineTotal: order.total,
                  }]
                : [];
            return (
              <article className="ck-order-row" key={order.id}>
                <div className="ck-order-row-info">
                  <strong>{order.kitchenName ?? "Kitchen"}</strong>
                  <small>{order.orderNumber}</small>
                  <small className="ck-order-row-date">
                    <CalendarIcon />
                    {formatOrderListDate(order.journeyDate, order.createdAt)}
                  </small>
                  <ul className="ck-order-row-meals">
                    {meals.map((item) => (
                      <li className="ck-order-row-meal" key={item.id}>
                        <img src={orderMealPhoto(item.dishCode, order.kitchenId)} alt="" />
                        <span>
                          <strong>{item.dishName}</strong>
                          <small>Qty {item.quantity} · {formatRupees(item.unitPrice)}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                  <small className="ck-order-row-total">Total {formatCheckoutMoney(order.total)}</small>
                  <small>Payment: {paymentStatusLabel(order.paymentStatus)}</small>
                </div>
                <div className="ck-order-row-actions">
                  <span className={`ck-order-row-status${isOngoingStatus(order.status) ? " is-ongoing" : order.status === "cancelled" ? " is-cancelled" : ""}`}>
                    {uiStatus}
                  </span>
                  <button className="ck-order-row-details" type="button" onClick={() => openOrder(order)}>
                    View details <span>›</span>
                  </button>
                  <button
                    className="ck-order-row-delete"
                    type="button"
                    aria-label={`Delete order ${order.orderNumber}`}
                    onClick={() => setPendingDelete(order)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            );
          })}
          {signedIn && !loading && visibleOrders.length === 0 ? (
            <p className="ck-orders-empty">
              {filter === "All Orders" ? "You have no orders yet." : `No ${filter.toLowerCase()} found.`}
            </p>
          ) : null}
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
            const cancelled = order.status === "cancelled";
            const uiStatus = order.status === "completed" ? "Completed" : mapOrderStatusToUi(order.status);
            const currentStep = order.status === "completed" ? 4 : order.status === "ready_for_pickup" ? 3 : 2;
            const meals = order.items?.length
              ? order.items
              : order.primaryItemName
                ? [{
                    id: `${order.id}-primary`,
                    dishId: null,
                    dishCode: "lemon-rice",
                    dishName: order.primaryItemName,
                    unitPrice: order.total,
                    quantity: order.itemCount || 1,
                    lineTotal: order.total,
                  }]
                : [];
            return (
              <article className={`ck-mobile-order-card${cancelled ? " is-cancelled" : ""}`} key={order.id}>
                <div className="ck-mobile-order-top">
                  <div className="ck-mobile-order-info">
                    <strong>{order.kitchenName ?? "Kitchen"}</strong>
                    <small>{order.orderNumber}</small>
                    <small>
                      {formatOrderListDate(order.journeyDate, order.createdAt)}
                    </small>
                  </div>
                  <span className="ck-mobile-order-status">{uiStatus}</span>
                </div>
                <ul className="ck-mobile-order-meals">
                  {meals.map((item) => (
                    <li className="ck-mobile-order-meal" key={item.id}>
                      <img src={orderMealPhoto(item.dishCode, order.kitchenId)} alt="" />
                      <span>
                        <strong>{item.dishName}</strong>
                        <small>Qty {item.quantity} · {formatRupees(item.unitPrice)}</small>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="ck-mobile-order-total">
                  <span>
                    Total {formatCheckoutMoney(order.total)}
                    <small> · Payment: {paymentStatusLabel(order.paymentStatus)}</small>
                  </span>
                  <div className="ck-mobile-order-total-actions">
                    <button
                      className="ck-mobile-order-delete"
                      type="button"
                      aria-label={`Delete order ${order.orderNumber}`}
                      onClick={() => setPendingDelete(order)}
                    >
                      <TrashIcon />
                    </button>
                    <button type="button" onClick={() => openOrder(order)}>
                      View details <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </div>
                {cancelled ? (
                  <p className="ck-mobile-order-cancel-note">This order was cancelled</p>
                ) : (
                  <ol className="ck-mobile-order-progress" aria-label={`Order ${String(uiStatus).toLowerCase()}`}>
                    {["Order placed", "Preparing", "On the way", "Delivered"].map((step, index) => (
                      <li className={index < currentStep ? "is-done" : ""} key={step}>{step}</li>
                    ))}
                  </ol>
                )}
              </article>
            );
          })}
          {signedIn && !loading && visibleMobileOrders.length === 0 ? (
            <p className="ck-orders-empty">
              {mobileFilter === "All Orders" ? "You have no orders yet." : `No ${mobileFilter.toLowerCase()} found.`}
            </p>
          ) : null}
        </div>
      </section>

      {pendingDelete ? (
        <div className="ck-order-delete-overlay" role="presentation">
          <div
            className="ck-order-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ck-order-delete-title"
            aria-describedby="ck-order-delete-copy"
          >
            <h2 id="ck-order-delete-title">Delete this order?</h2>
            <p id="ck-order-delete-copy">Are you sure you want to delete this order from your order history?</p>
            <div className="ck-order-delete-actions">
              <button
                type="button"
                className="ck-order-delete-cancel"
                disabled={deleting}
                onClick={() => setPendingDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ck-order-delete-confirm"
                disabled={deleting}
                onClick={() => void confirmDeleteOrder()}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const NOTIFICATION_CATEGORY_LABELS: Record<NotificationPreferenceCategory, string> = {
  order_updates: "Order updates",
  offers_promotions: "Offers and promotions",
  nearby_home_cooks: "Nearby home cooks",
  general_updates: "General updates",
};

function NotificationArt({
  category,
  iconType,
}: {
  category: NotificationPreferenceCategory;
  iconType: string | null;
}) {
  const icons: Record<string, ReactNode> = {
    meal: <MenuIcon />,
    gift: <GiftIcon />,
    order: <MenuIcon />,
    cook: <StepCookIcon />,
    bell: <NotificationIcon />,
    offer: <span className="ck-notification-percent">%</span>,
    info: <InfoIcon />,
  };
  const categoryIcons: Record<NotificationPreferenceCategory, ReactNode> = {
    order_updates: <NotificationIcon />,
    offers_promotions: <GiftIcon />,
    nearby_home_cooks: <StepCookIcon />,
    general_updates: <InfoIcon />,
  };

  return (
    <span className="ck-notification-art">
      {iconType ? icons[iconType.toLowerCase()] ?? categoryIcons[category] : categoryIcons[category]}
    </span>
  );
}

function formatNotificationDate(createdAt: string): string {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationActionLink(actionUrl: string | null): {
  href: string;
  external: boolean;
} | null {
  if (!actionUrl?.trim()) return null;

  try {
    const url = new URL(actionUrl, window.location.origin);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const external = url.origin !== window.location.origin;
    return {
      href: external ? url.href : `${url.pathname}${url.search}${url.hash}`,
      external,
    };
  } catch {
    return null;
  }
}

function redirectForNotificationAuthFailure(error: unknown): boolean {
  if (
    !(error instanceof ApiError) ||
    (error.status !== 401 && error.status !== 403)
  ) {
    return false;
  }

  clearAuthSession();
  navigate(PATHS.login);
  return true;
}

function NotificationFeed({
  notifications,
  loading,
  error,
  onRetry,
  openMenu,
  pendingAction,
  onToggleMenu,
  onMarkRead,
  onDismiss,
}: NotificationFeedProps) {
  if (loading) {
    return <p className="ck-notifications-state" role="status">Loading your notifications…</p>;
  }
  if (error) {
    return (
      <div className="ck-notifications-state is-error" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry}>Try again</button>
      </div>
    );
  }
  if (notifications.length === 0) {
    return (
      <p className="ck-notifications-state ck-notifications-empty">
        You’re all caught up. New notifications will appear here.
      </p>
    );
  }

  return (
    <div className="ck-notifications-list">
      {notifications.map((notification) => {
        const actionLink = notificationActionLink(notification.actionUrl);
        const menuIsOpen = openMenu === notification.id;

        return (
          <article
            className={`ck-notification-card ck-notification-card--responsive${notification.isRead ? " is-read" : ""}`}
            key={notification.id}
          >
            {!notification.isRead
              ? <span className="ck-notification-unread" aria-label="Unread" />
              : <span className="ck-notification-unread-placeholder" />}
            <NotificationArt
              category={notification.category}
              iconType={notification.iconType}
            />
            <div className="ck-notification-copy">
              <span className={`ck-notification-category is-${notification.category}`}>
                {NOTIFICATION_CATEGORY_LABELS[notification.category]}
              </span>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              {actionLink ? (
                actionLink.external ? (
                  <a
                    className="ck-notification-link"
                    href={actionLink.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View details
                  </a>
                ) : (
                  <button
                    className="ck-notification-link"
                    type="button"
                    onClick={() => navigate(actionLink.href)}
                  >
                    View details
                  </button>
                )
              ) : null}
              <time
                className="ck-notification-time-mobile"
                dateTime={notification.createdAt}
              >
                {formatNotificationDate(notification.createdAt)}
              </time>
            </div>
            <time
              className="ck-notification-time-desktop"
              dateTime={notification.createdAt}
            >
              {formatNotificationDate(notification.createdAt)}
            </time>
            <div className="ck-notification-actions">
              <button
                type="button"
                aria-label={`Options for ${notification.title}`}
                aria-expanded={menuIsOpen}
                disabled={Boolean(pendingAction)}
                onClick={() => onToggleMenu(notification.id)}
              >
                <span aria-hidden="true">⋮</span>
              </button>
              {menuIsOpen ? (
                <div className="ck-notification-menu">
                  {!notification.isRead ? (
                    <button
                      type="button"
                      disabled={Boolean(pendingAction)}
                      onClick={() => onMarkRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={Boolean(pendingAction)}
                    onClick={() => onDismiss(notification.id)}
                  >
                    Dismiss
                  </button>
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function NotificationsPage() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reloadId, setReloadId] = useState(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const actionLock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    setActionError("");

    void Promise.all([
      listNotifications(controller.signal),
      getUnreadNotificationCount(controller.signal),
    ])
      .then(([rows, unread]) => {
        if (controller.signal.aborted) return;
        setNotifications(rows);
        setUnreadCount(unread.unreadCount);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setNotifications([]);
        setUnreadCount(0);
        if (redirectForNotificationAuthFailure(error)) {
          setLoadError("Your session expired. Please sign in again.");
          return;
        }
        setLoadError(
          error instanceof Error
            ? error.message
            : "Unable to load your notifications. Please try again.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [reloadId]);

  function retryLoading() {
    setLoading(true);
    setReloadId((current) => current + 1);
  }

  async function refreshUnreadCount(fallbackCount: number) {
    try {
      const result = await getUnreadNotificationCount();
      setUnreadCount(result.unreadCount);
    } catch (error) {
      if (redirectForNotificationAuthFailure(error)) return;
      setUnreadCount(fallbackCount);
      setActionError(
        "Your change was saved, but the unread count could not be refreshed. Refresh the inbox to sync it.",
      );
    }
  }

  async function markRead(notificationId: string) {
    if (actionLock.current) return;
    const current = notifications.find((item) => item.id === notificationId);
    if (!current || current.isRead) return;

    actionLock.current = true;
    setPendingAction(notificationId);
    setActionError("");
    try {
      const updated = await markNotificationRead(notificationId);
      setNotifications((items) =>
        items.map((item) => item.id === notificationId ? updated : item),
      );
      setOpenMenu(null);
      await refreshUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      if (redirectForNotificationAuthFailure(error)) return;
      setActionError(
        `Could not mark this notification as read. Refresh the inbox to check its latest state. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  async function markAllRead() {
    if (actionLock.current || unreadCount === 0) return;

    actionLock.current = true;
    setPendingAction("all");
    setActionError("");
    try {
      const result = await markAllNotificationsRead();
      setNotifications((items) =>
        items.map((item) => item.isRead ? item : { ...item, isRead: true }),
      );
      setOpenMenu(null);
      await refreshUnreadCount(Math.max(0, unreadCount - result.updatedCount));
    } catch (error) {
      if (redirectForNotificationAuthFailure(error)) return;
      setActionError(
        `Could not mark notifications as read. Refresh the inbox to check its latest state. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  async function dismiss(notificationId: string) {
    if (actionLock.current) return;
    const current = notifications.find((item) => item.id === notificationId);
    if (!current) return;

    actionLock.current = true;
    setPendingAction(notificationId);
    setActionError("");
    try {
      await dismissNotification(notificationId);
      setNotifications((items) =>
        items.filter((item) => item.id !== notificationId),
      );
      setOpenMenu(null);
      await refreshUnreadCount(
        Math.max(0, unreadCount - (current.isRead ? 0 : 1)),
      );
    } catch (error) {
      if (redirectForNotificationAuthFailure(error)) return;
      setActionError(
        `Could not dismiss this notification. Refresh the inbox to check its latest state. ${error instanceof Error ? error.message : ""}`,
      );
    } finally {
      actionLock.current = false;
      setPendingAction(null);
    }
  }

  function toggleMenu(notificationId: string) {
    if (pendingAction) return;
    setOpenMenu((current) => current === notificationId ? null : notificationId);
  }

  const actionFeedback = actionError ? (
    <div className="ck-notifications-action-error" role="alert">
      <span>{actionError}</span>
      <button type="button" onClick={retryLoading}>Refresh inbox</button>
    </div>
  ) : null;

  const feedProps = {
    notifications,
    loading,
    error: loadError,
    onRetry: retryLoading,
    openMenu,
    pendingAction,
    onToggleMenu: toggleMenu,
    onMarkRead: (notificationId: string) => void markRead(notificationId),
    onDismiss: (notificationId: string) => void dismiss(notificationId),
  };

  return (
    <main className="ck-main ck-profile-main ck-notifications-main">
      <AccountSidebar active="notifications" />
      <section className="ck-profile-content ck-account-content ck-notifications-desktop">
        <header className="ck-account-title-row">
          <div className="ck-profile-heading">
            <h1>Notifications</h1>
            <p>Stay updated with your orders, offers and important updates.</p>
            <span className="ck-notifications-unread-count" aria-live="polite">
              {unreadCount} unread
            </span>
          </div>
          <button
            className="ck-notifications-read-all"
            type="button"
            disabled={loading || unreadCount === 0 || Boolean(pendingAction)}
            onClick={() => void markAllRead()}
          >
            {pendingAction === "all" ? "Marking as read…" : "Mark all as read"}
          </button>
        </header>
        {actionFeedback}
        <NotificationFeed
          {...feedProps}
        />
      </section>
      <MobileNotificationsInbox
        unreadCount={unreadCount}
        pendingAction={pendingAction}
        actionFeedback={actionFeedback}
        feedProps={feedProps}
        onMarkAllRead={() => void markAllRead()}
      />
    </main>
  );
}

type NotificationFeedProps = {
  notifications: CustomerNotification[];
  loading: boolean;
  error: string;
  onRetry: () => void;
  openMenu: string | null;
  pendingAction: string | null;
  onToggleMenu: (notificationId: string) => void;
  onMarkRead: (notificationId: string) => void;
  onDismiss: (notificationId: string) => void;
};

function MobileNotificationsInbox({
  unreadCount,
  pendingAction,
  actionFeedback,
  feedProps,
  onMarkAllRead,
}: {
  unreadCount: number;
  pendingAction: string | null;
  actionFeedback: ReactNode;
  feedProps: NotificationFeedProps;
  onMarkAllRead: () => void;
}) {
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
        <p>{unreadCount} unread notifications</p>
      </div>
      <div className="ck-mobile-notifications-toolbar">
        <button
          className="ck-notifications-read-all"
          type="button"
          disabled={feedProps.loading || unreadCount === 0 || Boolean(pendingAction)}
          onClick={onMarkAllRead}
        >
          {pendingAction === "all" ? "Marking as read…" : "Mark all as read"}
        </button>
        <button
          className="ck-mobile-notification-settings"
          type="button"
          onClick={() => navigate(PATHS.appSettings)}
        >
          Notification settings
        </button>
      </div>
      {actionFeedback}
      <NotificationFeed {...feedProps} />
    </section>
  );
}

const SETTING_OPTIONS = [
  { id: "order_updates", title: "Order updates", description: "Get notified about order confirmation, preparation, out for delivery and delivery.", icon: "bell" },
  { id: "offers_promotions", title: "Offers and promotions", description: "Receive updates about discounts and special offers.", icon: "tag" },
  { id: "nearby_home_cooks", title: "New home cooks nearby", description: "Get notified when new home cooks are available at your route.", icon: "cook" },
  { id: "general_updates", title: "General updates", description: "Important announcements and app updates.", icon: "info" },
] as const satisfies readonly {
  id: NotificationPreferenceCategory;
  title: string;
  description: string;
  icon: "bell" | "tag" | "cook" | "info";
}[];

function NotificationSettingIcon({
  icon,
}: {
  icon: (typeof SETTING_OPTIONS)[number]["icon"];
}) {
  if (icon === "bell") return <NotificationIcon />;
  if (icon === "tag") return <TagIcon />;
  if (icon === "cook") return <ShelterIcon />;
  return <InfoIcon />;
}

function NotificationPreferenceFeedback({
  loading,
  error,
  onRetry,
}: {
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (loading) {
    return <p className="ck-settings-feedback" role="status">Loading notification preferences…</p>;
  }
  if (error) {
    return (
      <p className="ck-settings-feedback is-error" role="alert">
        {error}{" "}
        <button type="button" onClick={onRetry}>Try again</button>
      </p>
    );
  }
  return null;
}

function NotificationPreferenceSwitch({
  category,
  checked,
  disabled,
  saving,
  title,
  onToggle,
}: {
  category: NotificationPreferenceCategory;
  checked: boolean;
  disabled: boolean;
  saving: boolean;
  title: string;
  onToggle: (category: NotificationPreferenceCategory) => void;
}) {
  return (
    <button
      className={`ck-settings-switch${checked ? " is-on" : ""}`}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={title}
      aria-busy={saving}
      disabled={disabled}
      onClick={() => onToggle(category)}
    >
      <span />
    </button>
  );
}

function AppSettingsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loadingPreferences, setLoadingPreferences] = useState(true);
  const [preferencesError, setPreferencesError] = useState("");
  const [reloadPreferences, setReloadPreferences] = useState(0);
  const [savingPreferences, setSavingPreferences] = useState<
    Partial<Record<NotificationPreferenceCategory, boolean>>
  >({});
  const [saveErrors, setSaveErrors] = useState<
    Partial<Record<NotificationPreferenceCategory, string>>
  >({});
  const [language, setLanguage] = useState("English");

  useEffect(() => {
    const controller = new AbortController();
    setLoadingPreferences(true);
    setPreferencesError("");
    void getNotificationPreferences(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setPreferences(result);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setPreferences(null);
        setPreferencesError(
          error instanceof Error
            ? error.message
            : "Unable to load notification preferences.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingPreferences(false);
      });

    return () => controller.abort();
  }, [reloadPreferences]);

  function retryLoadingPreferences() {
    setPreferences(null);
    setLoadingPreferences(true);
    setReloadPreferences((current) => current + 1);
  }

  async function togglePreference(category: NotificationPreferenceCategory) {
    if (!preferences || savingPreferences[category]) return;

    const previousValue = preferences[category];
    const nextValue = !previousValue;
    const option = SETTING_OPTIONS.find((item) => item.id === category);
    setPreferences((current) =>
      current ? { ...current, [category]: nextValue } : current,
    );
    setSavingPreferences((current) => ({ ...current, [category]: true }));
    setSaveErrors((current) => {
      const next = { ...current };
      delete next[category];
      return next;
    });

    try {
      const updated = await updateNotificationPreferences({
        [category]: nextValue,
      });
      setPreferences((current) =>
        current
          ? {
              ...current,
              [category]: updated[category],
              updatedAt: updated.updatedAt,
            }
          : current,
      );
    } catch (error) {
      setPreferences((current) =>
        current ? { ...current, [category]: previousValue } : current,
      );
      const details =
        error instanceof Error ? ` ${error.message}` : "";
      setSaveErrors((current) => ({
        ...current,
        [category]: `Could not save ${option?.title.toLowerCase() ?? "notification"} preference. Your previous setting was restored.${details}`,
      }));
    } finally {
      setSavingPreferences((current) => ({ ...current, [category]: false }));
    }
  }

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
          <NotificationPreferenceFeedback
            loading={loadingPreferences}
            error={preferencesError}
            onRetry={retryLoadingPreferences}
          />
          {preferences ? (
            <div className="ck-settings-options">
              {SETTING_OPTIONS.map((option) => (
                <div className="ck-settings-option" key={option.id}>
                  <span className="ck-settings-icon">
                    <NotificationSettingIcon icon={option.icon} />
                  </span>
                  <div className="ck-settings-option-copy">
                    <strong>{option.title}</strong>
                    <p>{option.description}</p>
                    {saveErrors[option.id] ? (
                      <small className="ck-settings-preference-error" role="alert">
                        {saveErrors[option.id]}
                      </small>
                    ) : null}
                  </div>
                  <NotificationPreferenceSwitch
                    category={option.id}
                    checked={preferences[option.id]}
                    disabled={Boolean(savingPreferences[option.id])}
                    saving={Boolean(savingPreferences[option.id])}
                    title={option.title}
                    onToggle={togglePreference}
                  />
                </div>
              ))}
            </div>
          ) : null}
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
      <MobileAppSettings
        language={language}
        setLanguage={setLanguage}
        preferences={preferences}
        loadingPreferences={loadingPreferences}
        preferencesError={preferencesError}
        savingPreferences={savingPreferences}
        saveErrors={saveErrors}
        onRetryPreferences={retryLoadingPreferences}
        onTogglePreference={togglePreference}
      />
    </main>
  );
}

function MobileAppSettings({
  language,
  setLanguage,
  preferences,
  loadingPreferences,
  preferencesError,
  savingPreferences,
  saveErrors,
  onRetryPreferences,
  onTogglePreference,
}: {
  language: string;
  setLanguage: Dispatch<SetStateAction<string>>;
  preferences: NotificationPreferences | null;
  loadingPreferences: boolean;
  preferencesError: string;
  savingPreferences: Partial<Record<NotificationPreferenceCategory, boolean>>;
  saveErrors: Partial<Record<NotificationPreferenceCategory, string>>;
  onRetryPreferences: () => void;
  onTogglePreference: (category: NotificationPreferenceCategory) => void;
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
          <NotificationPreferenceFeedback
            loading={loadingPreferences}
            error={preferencesError}
            onRetry={onRetryPreferences}
          />
          {preferences
            ? SETTING_OPTIONS.map((option) => (
                <div className="ck-mobile-app-settings-row ck-mobile-notification-preference-row" key={option.id}>
                  <span className="ck-mobile-app-settings-icon">
                    <NotificationSettingIcon icon={option.icon} />
                  </span>
                  <span className="ck-mobile-app-settings-copy">
                    <strong>{option.title}</strong>
                    <small>{option.description}</small>
                    {saveErrors[option.id] ? (
                      <small className="ck-settings-preference-error" role="alert">
                        {saveErrors[option.id]}
                      </small>
                    ) : null}
                  </span>
                  <NotificationPreferenceSwitch
                    category={option.id}
                    checked={preferences[option.id]}
                    disabled={Boolean(savingPreferences[option.id])}
                    saving={Boolean(savingPreferences[option.id])}
                    title={option.title}
                    onToggle={onTogglePreference}
                  />
                </div>
              ))
            : null}
          <button className="ck-mobile-app-settings-row" type="button" onClick={() => navigate(PATHS.notifications)}>
            <span className="ck-mobile-app-settings-icon"><NotificationIcon /></span>
            <span className="ck-mobile-app-settings-copy">
              <strong>Notification inbox</strong>
              <small>View your recent notifications</small>
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

const SUPPORT_FAQS = getFaqsForSurface("support");
const FAQ_PAGE_CONTENT = getFaqsForSurface("faq");

const MOBILE_HELP_LINKS = [
  { id: "faqs", title: "FAQs", detail: "Find answers to common questions", icon: "faqs" as const },
  { id: "chat", title: "Chat with us", detail: "Get instant help from our support team", icon: "chat" as const },
  { id: "call", title: "Call support", detail: "Talk to our support team", icon: "call" as const },
  { id: "email", title: "Email support", detail: "Send us your queries", icon: "email" as const },
  { id: "report", title: "Report an issue", detail: "Let us know if something isn’t working", icon: "report" as const },
  { id: "safety", title: "Safety & guidelines", detail: "Learn about safe and responsible usage", icon: "safety" as const },
  { id: "guide", title: "User guide", detail: "Learn how to use Aahaa", icon: "guide" as const },
];

function MobileHelpSupportIcon({ type }: { type: (typeof MOBILE_HELP_LINKS)[number]["icon"] }) {
  if (type === "faqs") return <MenuIcon />;
  if (type === "chat") return <ChatBubbleIcon />;
  if (type === "call") return <PhoneIcon />;
  if (type === "email") return <EmailIcon />;
  if (type === "report") return <AlertIcon />;
  if (type === "safety") return <ShieldIcon />;
  return <BookIcon />;
}

function MobileHelpSupport() {
  const [notice, setNotice] = useState("");

  return (
    <section className="ck-mobile-help-support">
      <header className="ck-mobile-help-support-header">
        <button type="button" aria-label="Back to profile" onClick={() => navigate(PATHS.profile)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <div className="ck-mobile-help-support-title">
        <h1>Help &amp; support</h1>
        <p>Get help with orders, payments and more</p>
      </div>
      <div className="ck-mobile-help-support-list">
        {MOBILE_HELP_LINKS.map((item) => (
          <button
            className="ck-mobile-help-support-row"
            type="button"
            key={item.id}
            onClick={() => {
              if (item.id === "faqs") {
                navigate(PATHS.faqs);
                return;
              }
              if (item.id === "chat") {
                navigate(PATHS.chatSupport);
                return;
              }
              if (item.id === "email") {
                navigate(PATHS.emailSupport);
                return;
              }
              if (item.id === "report") {
                navigate(PATHS.reportIssue);
                return;
              }
              if (item.id === "safety") {
                navigate(PATHS.safetyGuidelines);
                return;
              }
              setNotice(`We’ll help you with: ${item.title}.`);
            }}
          >
            <span className="ck-mobile-help-support-icon"><MobileHelpSupportIcon type={item.icon} /></span>
            <span className="ck-mobile-help-support-copy">
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
            <span className="ck-mobile-help-support-arrow" aria-hidden="true">›</span>
          </button>
        ))}
      </div>
      <aside className="ck-mobile-help-support-cta">
        <span className="ck-mobile-help-support-cta-icon"><HeadsetIcon /></span>
        <span className="ck-mobile-help-support-cta-copy">
          <small>Still need help?</small>
          <strong>Contact our support team</strong>
          <em>We’re here to help you</em>
        </span>
        <button
          type="button"
          onClick={() => setNotice("Our support team is available from 9:00 AM to 9:00 PM, Monday to Sunday.")}
        >
          Contact us <span aria-hidden="true">›</span>
        </button>
      </aside>
      {notice ? <p className="ck-mobile-help-support-notice" role="status">{notice}</p> : null}
    </section>
  );
}

function MobileFaqCategoryIcon({ type }: { type: FaqCategory }) {
  if (type === "orders") return <UtensilsIcon />;
  if (type === "pickup") return <BusIcon />;
  return <CreditCardIcon />;
}

type FaqFilterCategory = (typeof FAQ_CATEGORIES)[number]["id"];

type FaqPageProps = {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  category: FaqFilterCategory;
  setCategory: Dispatch<SetStateAction<FaqFilterCategory>>;
  openQuestion: string | null;
  setOpenQuestion: Dispatch<SetStateAction<string | null>>;
  filtered: readonly FaqEntry[];
};

function filterFaqPageContent(
  query: string,
  category: FaqFilterCategory,
): readonly FaqEntry[] {
  const needle = query.trim().toLowerCase();
  return FAQ_PAGE_CONTENT.filter((faq) => {
    const matchesCategory = category === "all" || faq.category === category;
    const matchesQuery =
      !needle ||
      `${faq.question} ${faq.answer ?? ""}`.toLowerCase().includes(needle);
    return matchesCategory && matchesQuery;
  });
}

function FaqsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqFilterCategory>("all");
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);
  const filtered = filterFaqPageContent(query, category);
  const pageProps = {
    query,
    setQuery,
    category,
    setCategory,
    openQuestion,
    setOpenQuestion,
    filtered,
  };

  return (
    <>
      <DesktopFaqsPage {...pageProps} />
      <MobileFaqsPage {...pageProps} />
    </>
  );
}

function FaqAccordionItems({
  filtered,
  openQuestion,
  setOpenQuestion,
  itemClassName,
}: Pick<FaqPageProps, "filtered" | "openQuestion" | "setOpenQuestion"> & {
  itemClassName: string;
}) {
  return (
    <>
      {filtered.map((faq) => {
        const open = openQuestion === faq.id;
        return (
          <details
            key={faq.id}
            className={itemClassName}
            open={open}
            onToggle={(event) => {
              const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
              setOpenQuestion((current) =>
                nextOpen ? faq.id : current === faq.id ? null : current,
              );
            }}
          >
            <summary>
              <span>{faq.question}</span>
              <ChevronIcon />
            </summary>
            <p>{faq.answer}</p>
          </details>
        );
      })}
    </>
  );
}

function UtensilsIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5 3v5.2c0 1 .7 1.8 1.6 1.8H7v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M4.2 3v3.2M5.9 3v3.2M7.6 3v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12.2 3.2c1.4 0 2.3 1 2.3 2.4V10H12.2V3.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13.35 10v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function DesktopFaqsPage({
  query,
  setQuery,
  category,
  setCategory,
  openQuestion,
  setOpenQuestion,
  filtered,
}: FaqPageProps) {
  return (
    <main className="ck-main ck-profile-main ck-faq-desktop-shell">
      <AccountSidebar active="support" />
      <section className="ck-profile-content ck-account-content ck-desktop-faqs">
        <header className="ck-profile-heading">
          <h1>Frequently asked questions</h1>
          <p>Find answers to your questions about Aahaa.</p>
        </header>
        <label className="ck-support-search ck-desktop-faqs-search">
          <SearchIcon />
          <span className="ck-visually-hidden">Search FAQs</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for help (e.g., orders, payment)"
          />
          <button
            type="button"
            onClick={() => setQuery((current) => current.trim())}
          >
            Search
          </button>
        </label>
        <div className="ck-mobile-faqs-tabs ck-desktop-faqs-tabs" role="tablist" aria-label="FAQ categories">
          {FAQ_CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={category === tab.id ? "is-active" : undefined}
              onClick={() => setCategory(tab.id)}
            >
              {tab.id !== "all" ? (
                <MobileFaqCategoryIcon type={tab.id} />
              ) : null}
              {tab.label}
            </button>
          ))}
        </div>
        <section className="ck-desktop-faqs-list">
          <h2>Popular questions</h2>
          <div className="ck-desktop-faqs-items">
            <FaqAccordionItems
              filtered={filtered}
              openQuestion={openQuestion}
              setOpenQuestion={setOpenQuestion}
              itemClassName="ck-desktop-faqs-item"
            />
            {filtered.length === 0 ? (
              <p className="ck-support-no-results">
                No matching questions. Try another search.
              </p>
            ) : null}
          </div>
        </section>
        <aside className="ck-support-card ck-desktop-faqs-contact">
          <div className="ck-support-card-intro">
            <span className="ck-settings-icon"><HeadsetIcon /></span>
            <span>
              <strong>Need more help?</strong>
              <small>Continue to Aahaa support chat.</small>
            </span>
          </div>
          <button
            className="ck-support-contact"
            type="button"
            onClick={() => navigate(PATHS.chatSupport)}
          >
            <ChatBubbleIcon />Contact support <span>›</span>
          </button>
        </aside>
      </section>
    </main>
  );
}

function MobileFaqsPage({
  query,
  setQuery,
  category,
  setCategory,
  openQuestion,
  setOpenQuestion,
  filtered,
}: FaqPageProps) {
  return (
    <main className="ck-main ck-profile-main ck-faq-mobile-shell">
      <section className="ck-mobile-faqs">
        <header className="ck-mobile-faqs-header">
          <button type="button" aria-label="Back to help and support" onClick={() => navigate(PATHS.helpSupport)}>
            <BackChevronIcon />
          </button>
          <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
            a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
          </button>
        </header>
        <div className="ck-mobile-faqs-title">
          <h1>Frequently asked questions</h1>
          <p>Find answers to your questions about Aahaa.</p>
        </div>
        <label className="ck-mobile-faqs-search">
          <SearchIcon />
          <span className="ck-visually-hidden">Search FAQs</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search for help (e.g., orders, payment)"
          />
        </label>
        <div className="ck-mobile-faqs-tabs" role="tablist" aria-label="FAQ categories">
          {FAQ_CATEGORIES.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={category === tab.id}
              className={category === tab.id ? "is-active" : undefined}
              onClick={() => setCategory(tab.id)}
            >
              {tab.id !== "all" ? (
                <MobileFaqCategoryIcon type={tab.id} />
              ) : null}
              {tab.label}
            </button>
          ))}
        </div>
        <section className="ck-mobile-faqs-list">
          <h2>Popular questions</h2>
          <FaqAccordionItems
            filtered={filtered}
            openQuestion={openQuestion}
            setOpenQuestion={setOpenQuestion}
            itemClassName="ck-mobile-faqs-item"
          />
          {filtered.length === 0 ? <p className="ck-mobile-faqs-empty">No matching questions. Try another search.</p> : null}
        </section>
        <aside className="ck-mobile-faqs-cta">
          <span className="ck-mobile-faqs-cta-icon"><HeadsetIcon /></span>
          <span className="ck-mobile-faqs-cta-copy">
            <strong>Still need help?</strong>
            <small>Our support team is here to assist you.</small>
          </span>
          <button type="button" onClick={() => navigate(PATHS.chatSupport)}>
            <span className="ck-mobile-faqs-cta-btn-icon" aria-hidden="true"><ChatBubbleIcon /></span>
            Contact support
          </button>
        </aside>
      </section>
    </main>
  );
}

function MobileChatAgentArt() {
  return (
    <svg className="ck-mobile-chat-art" viewBox="0 0 180 150" fill="none" aria-hidden="true">
      <circle cx="78" cy="74" r="58" fill="#fff1e8" />
      <path d="M48 118c6-28 18-42 30-42s24 14 30 42" fill="#ff6a45" />
      <rect x="72" y="92" width="14" height="10" rx="2" fill="#fff4eb" />
      <circle cx="78" cy="62" r="26" fill="#f3c7a4" />
      <path d="M52 58c4-22 18-34 32-34 16 0 28 14 30 34 0 0-8-8-18-6-8 1-14 8-18 8s-12-4-26-2Z" fill="#5a3424" />
      <path d="M58 70c8-18 22-24 34-18" stroke="#3f2418" strokeWidth="3" strokeLinecap="round" />
      <circle cx="68" cy="62" r="2.2" fill="#3f2418" />
      <circle cx="88" cy="62" r="2.2" fill="#3f2418" />
      <path d="M72 72c3 3 9 3 12 0" stroke="#c45b3a" strokeWidth="2" strokeLinecap="round" />
      <path d="M48 54c-2 12 2 26 10 34" stroke="#ff4b2b" strokeWidth="6" strokeLinecap="round" />
      <path d="M108 54c2 12-2 26-10 34" stroke="#ff4b2b" strokeWidth="6" strokeLinecap="round" />
      <circle cx="46" cy="52" r="5" fill="#ff4b2b" />
      <circle cx="110" cy="52" r="5" fill="#ff4b2b" />
      <path d="M114 46h8l4-10 4 18 3-8h7" stroke="#ff4b2b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="126" y="56" width="36" height="24" rx="12" fill="#fff" stroke="#ffd2c2" />
      <circle cx="136" cy="68" r="2.5" fill="#ff4b2b" />
      <circle cx="144" cy="68" r="2.5" fill="#ff4b2b" />
      <circle cx="152" cy="68" r="2.5" fill="#ff4b2b" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M7.5 10.5 11 7a2.4 2.4 0 1 1 3.4 3.4l-5.2 5.2a3.6 3.6 0 0 1-5.1-5.1l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SendPlaneIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.2 10.2 16.5 3.8 12.2 16.5l-2.2-5.1-5.1-1.2Z" fill="currentColor" />
    </svg>
  );
}

type MobileChatMessage = {
  id: string;
  from: "agent" | "user";
  text: string;
  time: string;
};

function MobileChatSupportPage() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<MobileChatMessage[]>([
    { id: "welcome", from: "agent", text: "Hello! Welcome to Aahaa support. How can I help you today?", time: "9:41 AM" },
  ]);
  const threadRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(0);
  const lastExchangeRef = useRef<{ text: string; timestamp: number } | null>(null);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [messages]);

  function addConversationTurn(userText: string, supportText: string) {
    const timestamp = Date.now();
    const normalizedText = userText.trim().toLowerCase().replace(/\s+/g, " ");
    const lastExchange = lastExchangeRef.current;
    if (
      lastExchange?.text === normalizedText &&
      timestamp - lastExchange.timestamp < 500
    ) {
      return;
    }
    lastExchangeRef.current = { text: normalizedText, timestamp };
    const now = new Date(timestamp);
    const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const userMessage: MobileChatMessage = {
      id: `message-${nextMessageId.current++}`,
      from: "user",
      text: userText,
      time,
    };
    const supportMessage: MobileChatMessage = {
      id: `message-${nextMessageId.current++}`,
      from: "agent",
      text: supportText,
      time,
    };
    setMessages((current) => [...current, userMessage, supportMessage]);
  }

  function sendSuggestedQuestion(question: (typeof SUPPORT_CHAT_QUESTIONS)[number]) {
    addConversationTurn(question.question, question.answer);
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;
    const normalizedText = text.toLowerCase().replace(/\s+/g, " ");
    const matchingQuestion = SUPPORT_CHAT_QUESTIONS.find(
      (question) =>
        question.question.toLowerCase().replace(/\s+/g, " ") === normalizedText,
    );
    addConversationTurn(
      text,
      matchingQuestion?.answer ?? UNSUPPORTED_SUPPORT_CHAT_ANSWER,
    );
    setDraft("");
  }

  return (
    <main className="ck-main ck-profile-main">
      <section className="ck-mobile-chat">
        <header className="ck-mobile-chat-header">
          <button type="button" aria-label="Back to help and support" onClick={() => navigate(PATHS.helpSupport)}>
            <BackChevronIcon />
          </button>
          <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
            a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
          </button>
        </header>
        <div className="ck-mobile-chat-title">
          <h1>Chat with us</h1>
          <p>Our support team is here to help you.</p>
        </div>
        <div className="ck-mobile-chat-hero">
          <MobileChatAgentArt />
          <strong>Hi! How can we help you today?</strong>
          <p>Ask us anything about orders, payments, pickup, or home cooks.</p>
        </div>
        <div className="ck-mobile-chat-divider" role="separator">
          <span>Today</span>
        </div>
        <section className="ck-mobile-chat-common-questions" aria-labelledby="ck-chat-common-questions-title">
          <h2 id="ck-chat-common-questions-title">Common questions</h2>
          <div className="ck-mobile-chat-question-list">
            {SUPPORT_CHAT_QUESTIONS.map((question) => (
              <button
                key={question.id}
                type="button"
                onClick={() => sendSuggestedQuestion(question)}
              >
                {question.question}
              </button>
            ))}
          </div>
        </section>
        <div className="ck-mobile-chat-thread" ref={threadRef} aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={message.from === "agent" ? "ck-mobile-chat-message is-agent" : "ck-mobile-chat-message is-user"}
            >
              {message.from === "agent" ? (
                <span className="ck-mobile-chat-avatar" aria-hidden="true">
                  <MobileChatAgentArt />
                </span>
              ) : null}
              <div>
                <p>{message.text}</p>
                <small>{message.time}</small>
              </div>
            </article>
          ))}
        </div>
        <form
          className="ck-mobile-chat-composer"
          onSubmit={(event) => {
            event.preventDefault();
            sendMessage();
          }}
        >
          <button type="button" aria-label="Attach a file">
            <PaperclipIcon />
          </button>
          <label>
            <span className="ck-visually-hidden">Type your message</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type your message..."
            />
          </label>
          <button type="submit" aria-label="Send message">
            <SendPlaneIcon />
          </button>
        </form>
      </section>
    </main>
  );
}

const EMAIL_SUPPORT_SUBJECTS = [
  "Order issue",
  "Payment issue",
  "Pickup & journey",
  "Account help",
  "Other",
] as const;

function MobileEmailEnvelopeArt() {
  return (
    <svg className="ck-mobile-email-art" viewBox="0 0 180 140" fill="none" aria-hidden="true">
      <circle cx="90" cy="72" r="54" fill="#fff1e8" />
      <rect x="48" y="58" width="84" height="52" rx="8" fill="#ffb89f" />
      <path d="M48 66l42 30 42-30" fill="#ff8f70" />
      <path d="M48 66h84v-2L90 92 48 64v2Z" fill="#ff6a45" />
      <rect x="70" y="34" width="40" height="48" rx="4" fill="#fff" />
      <path d="M78 46h24M78 54h24M78 62h16" stroke="#ffd2c2" strokeWidth="3" strokeLinecap="round" />
      <path d="M138 48v18M146 52v10M154 56v6" stroke="#ff4b2b" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function SubjectListIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6 4.5h9M6 9h9M6 13.5h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="3.5" cy="4.5" r="1" fill="currentColor" />
      <circle cx="3.5" cy="9" r="1" fill="currentColor" />
      <circle cx="3.5" cy="13.5" r="1" fill="currentColor" />
    </svg>
  );
}

function MessageBubbleIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3.5 4.5h11v8.2H8.2L5 15v-2.3H3.5V4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.2 7.4h5.6M6.2 10h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MobileEmailSupportPage() {
  const { profile } = useAuthenticatedProfile();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setName(profile?.fullName?.trim() ?? "");
    setEmail(profile?.email?.trim() ?? "");
  }, [profile]);

  function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !subject || !message.trim()) return;
    setSent(true);
  }

  return (
    <main className="ck-main ck-profile-main">
      <section className="ck-mobile-email">
        <header className="ck-mobile-email-header">
          <button type="button" aria-label="Back to help and support" onClick={() => navigate(PATHS.helpSupport)}>
            <BackChevronIcon />
          </button>
          <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
            a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
          </button>
        </header>
        <div className="ck-mobile-email-title">
          <h1>Email support</h1>
          <p>Share your query with us and we&apos;ll get back to you as soon as possible.</p>
        </div>
        <div className="ck-mobile-email-hero">
          <MobileEmailEnvelopeArt />
        </div>
        <form className="ck-mobile-email-form" onSubmit={submitEmail}>
          <label className="ck-mobile-email-field">
            <span className="ck-mobile-email-field-icon"><ProfileIcon /></span>
            <span className="ck-mobile-email-field-copy">
              <strong>Your name</strong>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your name" />
            </span>
          </label>
          <label className="ck-mobile-email-field">
            <span className="ck-mobile-email-field-icon"><EmailIcon /></span>
            <span className="ck-mobile-email-field-copy">
              <strong>Email address</strong>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
              />
            </span>
          </label>
          <label className="ck-mobile-email-field">
            <span className="ck-mobile-email-field-icon"><SubjectListIcon /></span>
            <span className="ck-mobile-email-field-copy">
              <strong>Subject</strong>
              <select value={subject} onChange={(event) => setSubject(event.target.value)}>
                <option value="">Select a subject</option>
                {EMAIL_SUPPORT_SUBJECTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </span>
            <ChevronIcon />
          </label>
          <label className="ck-mobile-email-field is-message">
            <span className="ck-mobile-email-field-icon"><MessageBubbleIcon /></span>
            <span className="ck-mobile-email-field-copy">
              <strong>Message</strong>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Type your message here..."
                rows={4}
              />
            </span>
          </label>
          <button className="ck-mobile-email-submit" type="submit">
            Send email <ArrowIcon />
          </button>
          {sent ? <p className="ck-mobile-email-sent" role="status">Thanks! Your message has been sent to support.</p> : null}
        </form>
      </section>
    </main>
  );
}

const REPORT_ISSUE_CATEGORIES = [
  { id: "order", label: "Order issue", icon: "order" as const },
  { id: "payment", label: "Payment issue", icon: "payment" as const },
  { id: "pickup", label: "Pickup & journey", icon: "pickup" as const },
  { id: "cook", label: "Home cook issue", icon: "cook" as const },
  { id: "account", label: "Account issue", icon: "account" as const },
  { id: "app", label: "App issue", icon: "app" as const },
] as const;

function ReportIssueCategoryIcon({ type }: { type: (typeof REPORT_ISSUE_CATEGORIES)[number]["icon"] }) {
  if (type === "order") return <BagIcon />;
  if (type === "payment") return <CreditCardIcon />;
  if (type === "pickup") return <BusIcon />;
  if (type === "cook") return <img src={metaChefHat} alt="" />;
  if (type === "account") return <ProfileIcon />;
  return <SettingsIcon />;
}

function DocumentListIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5 3.5h6.5L14 6v8.5H5v-11Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M11.5 3.5V6H14M7 9h4M7 11.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ImageUploadIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m7 19 4.5-4.5L15 18l3-3 3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MobileReportIssuePage() {
  const [category, setCategory] = useState<(typeof REPORT_ISSUE_CATEGORIES)[number]["id"]>("order");
  const [orderId, setOrderId] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const maxChars = 300;

  return (
    <main className="ck-main ck-profile-main">
      <section className="ck-mobile-report">
        <header className="ck-mobile-report-header">
          <button type="button" aria-label="Back to help and support" onClick={() => navigate(PATHS.helpSupport)}>
            <BackChevronIcon />
          </button>
          <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
            a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
          </button>
        </header>
        <div className="ck-mobile-report-title">
          <h1>Report an issue</h1>
          <p>Tell us what happened and we&apos;ll look into it.</p>
        </div>
        <form
          className="ck-mobile-report-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!description.trim()) return;
            setSubmitted(true);
          }}
        >
          <fieldset className="ck-mobile-report-categories">
            <legend>Issue category</legend>
            <div>
              {REPORT_ISSUE_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={category === item.id ? "is-selected" : undefined}
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  <span><ReportIssueCategoryIcon type={item.icon} /></span>
                  <strong>{item.label}</strong>
                </button>
              ))}
            </div>
          </fieldset>
          <label className="ck-mobile-report-field">
            <strong>Order ID (optional)</strong>
            <span>
              <DocumentListIcon />
              <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="Enter order ID" />
            </span>
          </label>
          <label className="ck-mobile-report-field is-message">
            <strong>Describe the issue</strong>
            <span>
              <MessageBubbleIcon />
              <textarea
                value={description}
                maxLength={maxChars}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell us what happened..."
                rows={5}
                required
              />
              <small>{description.length}/{maxChars}</small>
            </span>
          </label>
          <div className="ck-mobile-report-upload">
            <strong>Add images (optional)</strong>
            <label>
              <ImageUploadIcon />
              <em>Add photos</em>
              <small>Upload up to 3 images (JPG, PNG)</small>
              <input type="file" accept="image/jpeg,image/png" multiple />
            </label>
          </div>
          <button className="ck-mobile-report-submit" type="submit">
            Submit issue <ArrowIcon />
          </button>
          {submitted ? <p className="ck-mobile-report-sent" role="status">Thanks! Your issue has been submitted.</p> : null}
        </form>
      </section>
    </main>
  );
}

const SAFETY_GUIDELINES = [
  {
    id: "food",
    title: "Food safety",
    points: [
      "Food is prepared in clean and hygienic kitchens.",
      "Cooked fresh and packed safely for your journey.",
    ],
  },
  {
    id: "pickup",
    title: "During pickup",
    points: [
      "Collect your order at the selected pickup point.",
      "Verify your order items before leaving.",
    ],
  },
  {
    id: "journey",
    title: "For a safe journey",
    points: [
      "Consume food within the recommended time.",
      "Keep food sealed until you eat.",
      "Store food properly, especially in long journeys.",
    ],
  },
  {
    id: "avoid",
    title: "What to avoid",
    points: [
      "Do not consume if the package is damaged or open.",
      "Avoid keeping food in high heat for long hours.",
      "Do not consume if it looks or smells unusual.",
    ],
  },
  {
    id: "responsibility",
    title: "Our responsibility",
    points: [
      "We work with trusted home cooks.",
      "We follow food safety and hygiene standards.",
      "Your safety and satisfaction are our priority.",
    ],
  },
] as const;

function SafetyGuidelineArt({ id }: { id: (typeof SAFETY_GUIDELINES)[number]["id"] }) {
  if (id === "food") {
    return (
      <svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="36" cy="36" r="34" fill="#fff1e8" />
        <rect x="24" y="22" width="24" height="8" rx="2" fill="#d8c3a8" />
        <rect x="22" y="30" width="28" height="10" rx="2" fill="#c9ae8f" />
        <rect x="20" y="40" width="32" height="12" rx="2" fill="#b99674" />
        <circle cx="48" cy="24" r="8" fill="#2f9e44" />
        <path d="m44.5 24 2.2 2.2 4.3-4.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "pickup") {
    return (
      <svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="36" cy="36" r="34" fill="#fff1e8" />
        <rect x="16" y="28" width="22" height="20" rx="3" fill="#ff8f70" />
        <circle cx="24" cy="24" r="6" fill="#f3c7a4" />
        <rect x="40" y="34" width="16" height="14" rx="2" fill="#5a1026" />
        <circle cx="52" cy="28" r="6" fill="#f3c7a4" />
      </svg>
    );
  }
  if (id === "journey") {
    return (
      <svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="36" cy="36" r="34" fill="#fff1e8" />
        <circle cx="36" cy="26" r="8" fill="#f3c7a4" />
        <path d="M24 52c2-10 8-16 12-16s10 6 12 16" fill="#ff6a45" />
        <ellipse cx="36" cy="44" rx="10" ry="5" fill="#ffe08a" />
      </svg>
    );
  }
  if (id === "avoid") {
    return (
      <svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
        <circle cx="36" cy="36" r="34" fill="#fff1e8" />
        <circle cx="36" cy="36" r="18" stroke="#e53935" strokeWidth="4" />
        <path d="M24 24 48 48" stroke="#e53935" strokeWidth="4" strokeLinecap="round" />
        <rect x="28" y="30" width="16" height="10" rx="2" fill="#ffb14a" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 72 72" fill="none" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="#fff1e8" />
      <path d="M18 40c8-10 14-8 18-2 4-6 10-8 18 2-6 10-14 16-18 18-4-2-12-8-18-18Z" fill="#ff4b2b" />
    </svg>
  );
}

function MobileSafetyGuidelinesPage() {
  return (
    <main className="ck-main ck-profile-main">
      <section className="ck-mobile-safety">
        <header className="ck-mobile-safety-header">
          <button type="button" aria-label="Back to help and support" onClick={() => navigate(PATHS.helpSupport)}>
            <BackChevronIcon />
          </button>
          <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
            a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
          </button>
        </header>
        <div className="ck-mobile-safety-title">
          <h1>Safety and guidelines</h1>
          <p>A safe and happy journey with home-made food.</p>
        </div>
        <div className="ck-mobile-safety-list">
          {SAFETY_GUIDELINES.map((item) => (
            <article key={item.id} className="ck-mobile-safety-card">
              <SafetyGuidelineArt id={item.id} />
              <div>
                <h2>{item.title}</h2>
                <ul>
                  {item.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
        <aside className="ck-mobile-safety-cta">
          <span className="ck-mobile-safety-cta-icon"><HeadsetIcon /></span>
          <span className="ck-mobile-safety-cta-copy">
            <strong>Need more help?</strong>
            <small>Contact our support team for any safety related queries.</small>
          </span>
          <button type="button" onClick={() => navigate(PATHS.chatSupport)}>
            <span aria-hidden="true"><ChatBubbleIcon /></span>
            Chat with us
          </button>
        </aside>
      </section>
    </main>
  );
}

function HelpSupportPage() {
  const [query, setQuery] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [contactNotice, setContactNotice] = useState(false);
  const filteredFaqs = SUPPORT_FAQS.filter((faq) =>
    `${faq.question} ${faq.answer ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  return (
    <main className="ck-main ck-profile-main">
      <MobileHelpSupport />
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

export function MobileOrderSupport({
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
  const { kitchen, routes } = useKitchenFlow();
  const itemCount = bag.reduce((sum, line) => sum + line.qty, 0);
  const date = journey.date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const topics = [
    { title: "Track my order", detail: "Current status: Preparing order", icon: <PinIcon />, onClick: () => navigate(routes.trackOrder) },
    { title: "Pickup location or timing", detail: "Check or change pickup details", icon: <ClockIcon />, onClick: () => navigate(routes.confirmPickup) },
    { title: "Missing or incorrect item", detail: "Report missing or wrong items", icon: <BagIcon /> },
    { title: "Payment or refund", detail: "Get help with payment issues or refunds", icon: <CreditCardIcon /> },
    { title: "Cancel my order", detail: "Request to cancel this order", icon: <CloseCircleIcon /> },
    { title: "Other issue", detail: "Tell us more about your problem", icon: <HelpIcon /> },
  ];

  return (
    <section className="ck-mobile-order-support">
      <header className="ck-mobile-support-header">
        <button type="button" aria-label="Back to order summary" onClick={() => navigate(routes.orderSummary)}>
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
          <img src={kitchenPhoto(kitchen, imgKitchenLakshmi)} alt="" />
          <div>
            <strong>From {kitchen.name}</strong>
            <small>Order ID: AAH20346389383-001</small>
            <small>{itemCount} items · {bag.map(({ meal, qty }) => `${meal.name} × ${qty}`).join(", ")}</small>
          </div>
        </div>
        <div className="ck-mobile-support-meta">
          <span><PinIcon /><small>Pickup point</small><strong>{stop.name}</strong></span>
          <span><CalendarIcon /><small>{date}</small><strong>{journey.date.toLocaleDateString("en", { weekday: "long" })}</strong></span>
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

const ABOUT_FEATURES = [
  { title: "Home-cooked meals", description: "Fresh and tasty meals made with care", icon: <HomeNavIcon /> },
  { title: "Along your route", description: "Find home cooks at your pickup stops", icon: <PinIcon /> },
  { title: "Variety of options", description: "Choose from a wide range of homemade dishes", icon: <LeafIcon /> },
  { title: "Support local home cooks", description: "Helping home cooks and small kitchens grow", icon: <PeopleIcon /> },
];

function MobileAboutAahaa() {
  return (
    <section className="ck-mobile-about">
      <header className="ck-mobile-about-header">
        <button type="button" aria-label="Back to profile" onClick={() => navigate(PATHS.profile)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <div className="ck-mobile-about-title">
        <h1>About Aahaa</h1>
        <p>Homemade food for your journey</p>
      </div>
      <section className="ck-mobile-about-hero">
        <div className="ck-mobile-about-hero-copy">
          <strong className="ck-about-wordmark">aahaa<span aria-hidden="true">⌣</span></strong>
          <h2>Home-cooked meals for your journey.</h2>
          <p>Aahaa connects travellers with home cooks along the way, so you can enjoy fresh, tasty and homemade meals at your selected pickup stops.</p>
        </div>
        <img src={a.imgAahaaBusStopDeliveryScene1} alt="Home cook serving meals near a bus stop" />
      </section>
      <section className="ck-mobile-about-mission">
        <h2>Our mission</h2>
        <p>To make every journey better by providing easy access to healthy home-cooked meals from local home cooks.</p>
      </section>
      <section className="ck-mobile-about-features">
        <h2>What makes aahaa special</h2>
        <div>
          {ABOUT_FEATURES.map((feature) => (
            <article key={feature.title}>
              <span>{feature.icon}</span>
              <strong>{feature.title}</strong>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="ck-mobile-about-vision">
        <div>
          <h2>Our vision</h2>
          <p>To become the most trusted platform for homemade meals for every traveler across India</p>
        </div>
        <img src={a.imgAahaaMealBoxWithCurryTray1} alt="" />
      </section>
    </section>
  );
}

function AboutAahaaPage() {
  return (
    <main className="ck-main ck-profile-main">
      <MobileAboutAahaa />
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
            {ABOUT_FEATURES.map((feature) => (
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

function MobileLogoutDoorArt() {
  return (
    <svg className="ck-mobile-logout-art" viewBox="0 0 240 200" fill="none" aria-hidden="true">
      <ellipse cx="120" cy="178" rx="86" ry="12" fill="#efe2d4" />
      <path d="M78 42h58l18 18v98H78V42Z" fill="#ff5a35" />
      <path d="M136 42v18h18" fill="#e84722" />
      <path d="M90 56h36v92H90V56Z" fill="#ff7a55" />
      <path d="M94 60h28v84H94V60Z" fill="#ff8f70" />
      <circle cx="128" cy="104" r="5.5" fill="#ffe8d8" />
      <circle cx="128" cy="104" r="2.2" fill="#ff5a35" />
      <path d="M162 96h42m0 0-12-11m12 11-12 11" stroke="#ff4b2b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="46" y="132" width="22" height="34" rx="4" fill="#d7c2a4" />
      <path d="M40 132c7-22 18-34 28-34 10 0 16 10 20 24" fill="#74c068" />
      <path d="M57 110c5-12 12-17 19-15" stroke="#4fa047" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M52 124c8-14 16-18 24-14" fill="#63b457" />
    </svg>
  );
}

function MobileLogoutConfirm() {
  return (
    <section className="ck-mobile-logout">
      <header className="ck-mobile-logout-header">
        <button type="button" aria-label="Back to profile" onClick={() => navigate(PATHS.profile)}>
          <BackChevronIcon />
        </button>
        <button className="ck-wordmark" type="button" aria-label="aahaa" onClick={() => navigate(PATHS.home)}>
          a<span className="ck-mark-aa">ahaa<SmileIcon /></span>
        </button>
      </header>
      <div className="ck-mobile-logout-body">
        <MobileLogoutDoorArt />
        <h1>Log out?</h1>
        <p>You will be signed out from your account and need to log in again to access your orders, addresses and more.</p>
        <button
          className="ck-mobile-logout-confirm"
          type="button"
          onClick={() => {
            clearAuthSession();
            navigate(PATHS.home);
          }}
        >
          Log out
        </button>
        <button className="ck-mobile-logout-cancel" type="button" onClick={() => navigate(PATHS.profile)}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function LogoutPage() {
  const { profile, loading } = useAuthenticatedProfile();
  const [phones, setPhones] = useState<LinkedPhone[]>([]);
  const [addingPhone, setAddingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    if (!profile?.phone) {
      setPhones([]);
      return;
    }
    setPhones([{ number: formatProfilePhone(profile.phone), label: "Primary number" }]);
  }, [profile]);

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
      <MobileLogoutConfirm />
      <AccountSidebar active="logout" />
      <section className="ck-profile-content ck-account-content ck-logout-content">
        <header className="ck-profile-heading">
          <h1>Log out</h1>
          <p>Manage your account and devices.</p>
        </header>
        <section className="ck-logout-account-card">
          <div className="ck-logout-account-person">
            <span className="ck-logout-avatar"><ProfileIcon /></span>
            <span>
              <strong>{loading ? "Loading…" : formatProfileName(profile?.fullName)}</strong>
              <small>{loading ? "…" : formatProfilePhone(profile?.phone)}</small>
            </span>
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
          <button
            type="button"
            onClick={() => {
              clearAuthSession();
              navigate(PATHS.home);
            }}
          >
            Log out
          </button>
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

function VerifiedByAahaaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="m5.6 9.15 2.35 2.25L12.5 6.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
