import {
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ApiError,
  submitCookApplication,
  submitDeliveryPartnerApplication,
} from "./lib/api";
import { navigate, PATHS } from "./navigation";
import "./styles/apply.css";

const WEEKDAYS = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
] as const;

const FOOD_DISHES = [
  { name: "Dosa", category: "vegetarian" },
  { name: "Idli", category: "vegetarian" },
  { name: "Poori", category: "vegetarian" },
  { name: "Upma", category: "vegetarian" },
  { name: "Chapati", category: "vegetarian" },
  { name: "Parotta", category: "vegetarian" },
  { name: "Chicken Curry", category: "non_vegetarian" },
  { name: "Chicken Biryani", category: "non_vegetarian" },
  { name: "Fish Fry", category: "non_vegetarian" },
  { name: "Egg Curry", category: "non_vegetarian" },
  { name: "Chicken 65", category: "non_vegetarian" },
  { name: "Mutton Curry", category: "non_vegetarian" },
] as const;

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const minutes = index * 30;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const hour12 = hour % 12 || 12;
  return {
    value: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    label: `${hour12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`,
  };
});
const DELIVERY_TIME_OPTIONS = TIME_OPTIONS.filter(
  ({ value }) => value >= "18:00" && value <= "21:00",
);

type FieldErrors = Record<string, string>;
type FoodPreference = "vegetarian" | "non_vegetarian" | "both";
type DailyAvailability = { from: string; until: string };
type DeliveryDaysMode = "all_days" | "weekdays" | "weekends" | "choose_days";
type DeliveryHoursMode = "full_app" | "custom";
type DeliveryVehicleType = "bike" | "car" | "auto" | "other";

const DELIVERY_DAYS_MODE_OPTIONS: { value: DeliveryDaysMode; label: string }[] = [
  { value: "all_days", label: "All Days" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "choose_days", label: "Choose Days" },
];
const DELIVERY_VEHICLE_OPTIONS: { value: DeliveryVehicleType; label: string }[] = [
  { value: "bike", label: "Bike" },
  { value: "car", label: "Car" },
  { value: "auto", label: "Auto" },
  { value: "other", label: "Other" },
];
const VEHICLE_OWNERSHIP_OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

function requiresVehicleRegistration(vehicleType: DeliveryVehicleType | ""): boolean {
  return vehicleType === "bike" || vehicleType === "car" || vehicleType === "auto";
}

const FOOD_PREFERENCE_OPTIONS: { value: FoodPreference; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "non_vegetarian", label: "Non-Vegetarian" },
  { value: "both", label: "Both Vegetarian and Non-Vegetarian" },
];

function RequiredMark() {
  return <span className="aa-apply__req" aria-hidden="true">*</span>;
}

function ApplyShell({
  title,
  subtitle,
  sections,
  step,
  children,
}: {
  title: string;
  subtitle: string;
  sections: string[];
  step: number;
  children: ReactNode;
}) {
  return (
    <div className="aa-apply">
      <div className="aa-apply__shell">
        <div className="aa-apply__top">
          <button type="button" className="aa-apply__back" onClick={() => navigate(PATHS.home)}>
            ← Back to Home
          </button>
          <span className="aa-apply__brand">aahaa</span>
        </div>
        <header className="aa-apply__hero">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </header>
        <ol className="aa-apply__progress" aria-label="Application progress">
          {sections.map((label, index) => {
            const state =
              index < step ? "is-complete" : index === step ? "is-current" : "";
            return (
              <li key={label} className={state}>
                <span className="aa-apply__progress-bar" />
                <small>
                  {index + 1}. {label}
                </small>
              </li>
            );
          })}
        </ol>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="aa-apply__field">
      <label>
        {label}
        {required ? <RequiredMark /> : null}
      </label>
      {children}
      {error ? <p className="aa-apply__error">{error}</p> : null}
      {hint && !error ? <p className="aa-apply__hint">{hint}</p> : null}
    </div>
  );
}

function ChipGroup({
  label,
  required,
  options,
  values,
  error,
  singleLine = false,
  onToggle,
}: {
  label: string;
  required?: boolean;
  options: ReadonlyArray<{ value: string; label: string }>;
  values: string[];
  error?: string;
  singleLine?: boolean;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className={`aa-apply__field aa-apply__fieldset${singleLine ? " aa-apply__fieldset--single-line" : ""}`}>
      <legend>
        {label}
        {required ? <RequiredMark /> : null}
      </legend>
      <div className={`aa-apply__chips${singleLine ? " aa-apply__chips--single-line" : ""}`}>
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <label
              key={option.value}
              className={`aa-apply__chip${selected ? " is-selected" : ""}`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
      {error ? <p className="aa-apply__error">{error}</p> : null}
    </fieldset>
  );
}

function SectionNav({
  canBack,
  onBack,
  backLabel = "Previous",
  nextLabel,
  submitting,
}: {
  canBack: boolean;
  onBack: () => void;
  backLabel?: string;
  nextLabel: string;
  submitting?: boolean;
}) {
  return (
    <div className="aa-apply__actions">
      {canBack ? (
        <button type="button" className="aa-apply__btn aa-apply__btn--ghost" onClick={onBack}>
          {backLabel}
        </button>
      ) : (
        <span />
      )}
      <button
        type="submit"
        className="aa-apply__btn aa-apply__btn--primary"
        disabled={submitting}
      >
        {submitting ? "Submitting…" : nextLabel}
      </button>
    </div>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidMobile(value: string) {
  return /^[6-9]\d{9}$/.test(value.replace(/\D/g, "").slice(-10));
}

function normalizeDeliveryMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

function isValidDeliveryMobile(value: string) {
  return /^[6-9]\d{9}$/.test(normalizeDeliveryMobile(value));
}

function isValidPincode(value: string) {
  return /^[1-9][0-9]{5}$/.test(value);
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

type TimePeriod = "AM" | "PM";

function parseTimeValue(value: string): { hour: number; minute: number; period: TimePeriod } {
  const [hour24, minute] = value.split(":").map(Number);
  if (
    !Number.isInteger(hour24) ||
    hour24 < 0 ||
    hour24 > 23 ||
    !Number.isInteger(minute) ||
    minute < 0 ||
    minute > 59
  ) {
    return { hour: 12, minute: 0, period: "AM" };
  }
  return {
    hour: hour24 % 12 || 12,
    minute,
    period: hour24 < 12 ? "AM" : "PM",
  };
}

function formatTimeValue(value: string): string {
  if (!value) return "Select time";
  const { hour, minute, period } = parseTimeValue(value);
  return `${hour}:${String(minute).padStart(2, "0")} ${period}`;
}

function to24HourTime(hour: number, minute: number, period: TimePeriod): string {
  const hour24 = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(hour24).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function AnalogTimePicker({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<TimePeriod>("AM");
  const [isDragging, setIsDragging] = useState(false);

  function openPicker() {
    const selected = parseTimeValue(value);
    setHour(selected.hour);
    setMinute(selected.minute);
    setPeriod(selected.period);
    setIsOpen(true);
  }

  function selectMinuteFromPointer(event: ReactPointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const angle = (Math.atan2(event.clientX - centerX, centerY - event.clientY) + Math.PI * 2) % (Math.PI * 2);
    setMinute(Math.round((angle / (Math.PI * 2)) * 60) % 60);
  }

  function handleMinuteKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const minuteAdjustments: Record<string, number> = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1,
    };
    if (event.key in minuteAdjustments) {
      event.preventDefault();
      setMinute((current) => (current + minuteAdjustments[event.key] + 60) % 60);
    } else if (event.key === "Home") {
      event.preventDefault();
      setMinute(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setMinute(59);
    }
  }

  const hourHandAngle = (hour % 12) * 30;
  const minuteHandAngle = minute * 6;

  return (
    <>
      <button
        className={`aa-clock-picker__trigger${error ? " has-error" : ""}`}
        type="button"
        aria-label={`${label}: ${formatTimeValue(value)}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-invalid={Boolean(error)}
        onClick={openPicker}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span>{formatTimeValue(value)}</span>
      </button>
      {isOpen ? (
        <div
          className="aa-clock-picker__backdrop"
          onClick={() => setIsOpen(false)}
        >
          <section
            className="aa-clock-picker__dialog"
            role="dialog"
            aria-modal="true"
            aria-label={`${label} time picker`}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") setIsOpen(false);
            }}
          >
            <header className="aa-clock-picker__header">
              <div>
                <p>{label}</p>
                <strong>{hour}:{String(minute).padStart(2, "0")} {period}</strong>
              </div>
              <button
                type="button"
                className="aa-clock-picker__close"
                aria-label={`Close ${label} time picker`}
                autoFocus
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </header>
            <div className="aa-clock-picker__period" role="group" aria-label="Choose AM or PM">
              {(["AM", "PM"] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  className={period === option ? "is-selected" : ""}
                  aria-pressed={period === option}
                  onClick={() => setPeriod(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="aa-clock-picker__step">
              <span>Choose an hour and minute on the clock</span>
            </div>
            <div className="aa-clock-picker__dial">
              <div
                className="aa-clock-picker__minute-ring"
                role="slider"
                aria-label="Choose minute"
                aria-valuemin={0}
                aria-valuemax={59}
                aria-valuenow={minute}
                aria-valuetext={`${String(minute).padStart(2, "0")} minutes`}
                tabIndex={0}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  setIsDragging(true);
                  selectMinuteFromPointer(event);
                }}
                onPointerMove={isDragging ? selectMinuteFromPointer : undefined}
                onPointerUp={() => setIsDragging(false)}
                onPointerCancel={() => setIsDragging(false)}
                onKeyDown={handleMinuteKeyDown}
              >
                {Array.from({ length: 60 }, (_, tick) => {
                  const angle = (tick * Math.PI) / 30;
                  return (
                    <span
                      key={tick}
                      className={`aa-clock-picker__tick${tick === minute ? " is-selected" : ""}`}
                      style={{
                        left: `${50 + Math.sin(angle) * 47}%`,
                        top: `${50 - Math.cos(angle) * 47}%`,
                      }}
                    />
                  );
                })}
                {Array.from({ length: 12 }, (_, index) => {
                  const mark = index * 5;
                  const angle = (mark * Math.PI) / 30;
                  return (
                    <span
                      key={mark}
                      className={`aa-clock-picker__minute-label${minute === mark ? " is-selected" : ""}`}
                      style={{
                        left: `${50 + Math.sin(angle) * 44}%`,
                        top: `${50 - Math.cos(angle) * 44}%`,
                      }}
                    >
                      {String(mark).padStart(2, "0")}
                    </span>
                  );
                })}
              </div>
              {Array.from({ length: 12 }, (_, index) => {
                const hourOption = index === 0 ? 12 : index;
                const angle = (hourOption % 12) * (Math.PI / 6);
                return (
                  <button
                    type="button"
                    key={hourOption}
                    className={`aa-clock-picker__hour${hour === hourOption ? " is-selected" : ""}`}
                    style={{
                      left: `${50 + Math.sin(angle) * 32}%`,
                      top: `${50 - Math.cos(angle) * 32}%`,
                    }}
                    aria-label={`Select hour ${hourOption}`}
                    aria-pressed={hour === hourOption}
                    onClick={() => setHour(hourOption)}
                  >
                    {hourOption}
                  </button>
                );
              })}
              <span
                className="aa-clock-picker__hand aa-clock-picker__hand--hour"
                style={{ transform: `rotate(${hourHandAngle}deg)` }}
              />
              <span
                className="aa-clock-picker__hand aa-clock-picker__hand--minute"
                style={{ transform: `rotate(${minuteHandAngle}deg)` }}
              />
              <span className="aa-clock-picker__hub" />
              <div className="aa-clock-picker__center">
                <strong>{hour}:{String(minute).padStart(2, "0")}</strong>
                <small>TIME</small>
              </div>
            </div>
            <div className="aa-clock-picker__minute-adjust" aria-label="Adjust minute">
              <button
                type="button"
                aria-label="Decrease minute"
                onClick={() => setMinute((current) => (current + 59) % 60)}
              >
                −
              </button>
              <span>{String(minute).padStart(2, "0")}</span>
              <button
                type="button"
                aria-label="Increase minute"
                onClick={() => setMinute((current) => (current + 1) % 60)}
              >
                +
              </button>
            </div>
            <footer className="aa-clock-picker__actions">
              <button
                type="button"
                className="aa-apply__btn aa-apply__btn--ghost"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="aa-apply__btn aa-apply__btn--primary"
                onClick={() => {
                  onChange(to24HourTime(hour, minute, period));
                  setIsOpen(false);
                }}
              >
                Confirm
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}

function FoodReferencePicker({
  preference,
  values,
  query,
  error,
  onQueryChange,
  onAdd,
  onRemove,
}: {
  preference: string;
  values: string[];
  query: string;
  error?: string;
  onQueryChange: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const suggestions = FOOD_DISHES.filter((dish) => {
    const preferenceMatches =
      preference === "both" ||
      dish.category === preference;
    return preferenceMatches && normalizedQuery.length > 0 &&
      dish.name.toLocaleLowerCase().includes(normalizedQuery) &&
      !values.some((value) => value.toLocaleLowerCase() === dish.name.toLocaleLowerCase());
  });
  const customAlreadySelected = values.some(
    (value) => value.toLocaleLowerCase() === normalizedQuery,
  );
  function addCustom() {
    const name = query.trim();
    if (name) onAdd(name);
    onQueryChange("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter" && query.trim()) {
      event.preventDefault();
    }
  }

  return (
    <fieldset className="aa-apply__field aa-apply__fieldset aa-apply__food-references">
      <legend>What dishes can you prepare?<RequiredMark /></legend>
      <p className="aa-apply__hint">Search and select dishes, or add your own.</p>
      <div
        className="aa-apply__food-search"
        onBlur={(event) => {
          if (
            !(event.relatedTarget instanceof Node) ||
            !event.currentTarget.contains(event.relatedTarget)
          ) {
            setOpen(false);
          }
        }}
      >
        <input
          role="combobox"
          aria-label="Search dishes"
          maxLength={100}
          aria-autocomplete="list"
          aria-expanded={open && Boolean(normalizedQuery)}
          aria-controls="cook-food-reference-options"
          aria-invalid={Boolean(error)}
          placeholder="Start typing a dish, e.g. Dosa"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        {open && normalizedQuery ? (
          <div className="aa-apply__food-options" id="cook-food-reference-options" role="listbox">
            {suggestions.map((dish) => (
              <button
                type="button"
                role="option"
                aria-selected="false"
                key={dish.name}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => {
                  onAdd(dish.name);
                  onQueryChange("");
                  setOpen(false);
                }}
              >
                {dish.name}
              </button>
            ))}
            {!suggestions.length ? <p>No matching dishes available. You can add a custom dish.</p> : null}
            {!suggestions.length && !customAlreadySelected ? (
              <button
                type="button"
                className="aa-apply__food-custom"
                onPointerDown={(event) => event.preventDefault()}
                onClick={addCustom}
              >
                Add &quot;{query.trim()}&quot;
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {values.length ? (
        <ul className="aa-apply__food-selected" aria-label="Selected dishes">
          {values.map((dish) => (
            <li key={dish}>
              <span>{dish}</span>
              <button type="button" aria-label={`Remove ${dish}`} onClick={() => onRemove(dish)}>×</button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="aa-apply__error">{error}</p> : null}
    </fieldset>
  );
}

export function BecomeCookPage() {
  const sections = useMemo(() => ["Personal Details", "Food & Availability"], []);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ message: string; applicationId: string } | null>(
    null,
  );

  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");

  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [foodPreference, setFoodPreference] = useState<FoodPreference | "">("");
  const [foodReferences, setFoodReferences] = useState<string[]>([]);
  const [foodQuery, setFoodQuery] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);

  function setSelectedDays(nextDays: string[]) {
    setAvailableDays(nextDays);
    setErrors((current) => ({ ...current, availableDays: "" }));
  }

  function validateStep(current: number): boolean {
    const nextErrors: FieldErrors = {};
    if (current === 0) {
      if (fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
      if (!isValidMobile(mobileNumber)) nextErrors.mobileNumber = "Enter a valid 10-digit mobile number.";
      if (!isValidEmail(email.trim())) nextErrors.email = "Enter a valid email address.";
      if (city.trim().length < 2) nextErrors.city = "Enter your city.";
      if (!isValidPincode(pincode)) nextErrors.pincode = "Enter a valid 6-digit pincode.";
    } else if (current === 1) {
      if (!foodPreference) nextErrors.foodPreference = "Choose the type of food you prepare.";
      if (foodReferences.length === 0) nextErrors.foodReferences = "Select at least one dish you can prepare.";
      if (availableDays.length === 0) nextErrors.availableDays = "Select at least one available day.";
      if (!openingTime) nextErrors.openingTime = "Choose when your kitchen becomes available.";
      if (!closingTime) nextErrors.closingTime = "Choose when your kitchen is no longer available.";
      if (openingTime && closingTime && timeToMinutes(closingTime) <= timeToMinutes(openingTime)) {
        nextErrors.closingTime = "Available until must be later than available from.";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validateStep(step)) return;
    if (step === 0) {
      setStep((value) => value + 1);
      return;
    }
    if (!foodPreference) {
      setErrors({ foodPreference: "Choose the type of food you prepare." });
      return;
    }

    const submittedAvailability: Record<string, DailyAvailability> = {};
    for (const day of WEEKDAYS) {
      if (!availableDays.includes(day.value)) continue;
      if (!openingTime || !closingTime) {
        setErrors({
          openingTime: "Choose when your kitchen becomes available.",
          closingTime: "Choose when your kitchen is no longer available.",
        });
        return;
      }
      submittedAvailability[day.value] = {
        from: openingTime,
        until: closingTime,
      };
    }

    const application: Parameters<typeof submitCookApplication>[0] = {
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.replace(/\D/g, "").slice(-10),
      email: email.trim().toLowerCase(),
      city: city.trim(),
      pincode: pincode.trim(),
      foodPreference,
      foodReferences,
      availableDays: Object.keys(submittedAvailability),
      availabilityMode: "shared",
      availabilityByDay: submittedAvailability,
    };

    setSubmitting(true);
    try {
      const result = await submitCookApplication(application);
      setSuccess({ message: result.message, applicationId: result.applicationId });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to submit your application. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <ApplyShell title="Become an Aahaa Home Cook" subtitle="" sections={sections} step={sections.length}>
        <div className="aa-apply__card aa-apply__success">
          <h2>Application received</h2>
          <p>{success.message}</p>
          <span className="aa-apply__success-id">Application ID: {success.applicationId}</span>
          <div className="aa-apply__actions" style={{ justifyContent: "center" }}>
            <button type="button" className="aa-apply__btn aa-apply__btn--primary" onClick={() => navigate(PATHS.home)}>
              Back to Home
            </button>
          </div>
        </div>
      </ApplyShell>
    );
  }

  return (
    <ApplyShell
      title="Become an Aahaa Home Cook"
      subtitle="Share your homemade food with people looking for a little taste of home."
      sections={sections}
      step={step}
    >
      <form className="aa-apply__card" onSubmit={onSubmit} noValidate>
        {step === 0 ? (
          <>
            <h2 className="aa-apply__section-title">Personal Details</h2>
            <p className="aa-apply__section-hint">Tell us who you are so we can reach you.</p>
            <div className="aa-apply__grid">
              <Field label="Full Name" required error={errors.fullName}>
                <input autoComplete="name" maxLength={120} placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={Boolean(errors.fullName)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="Mobile Number" required error={errors.mobileNumber}>
                  <input type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" maxLength={10} value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} aria-invalid={Boolean(errors.mobileNumber)} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <input type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
                </Field>
              </div>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="City" required error={errors.city}>
                  <input autoComplete="address-level2" maxLength={80} placeholder="Enter your city" value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={Boolean(errors.city)} />
                </Field>
                <Field label="Pincode" required error={errors.pincode}>
                  <input inputMode="numeric" autoComplete="postal-code" placeholder="6-digit pincode" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))} aria-invalid={Boolean(errors.pincode)} />
                </Field>
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="aa-apply__section-title">Food References &amp; Kitchen Availability</h2>
            <p className="aa-apply__section-hint">Tell us what you love to cook and when your kitchen is ready.</p>
            <div className="aa-apply__grid">
              <fieldset className="aa-apply__field aa-apply__fieldset">
                <legend>What type of food do you prepare?<RequiredMark /></legend>
                <div className="aa-apply__preference-cards" role="radiogroup" aria-label="Food preference">
                  {FOOD_PREFERENCE_OPTIONS.map((option) => (
                    <label className={`aa-apply__preference-card${foodPreference === option.value ? " is-selected" : ""}`} key={option.value}>
                      <input
                        type="radio"
                        name="foodPreference"
                        value={option.value}
                        checked={foodPreference === option.value}
                        onChange={() => {
                          setFoodPreference(option.value);
                          setErrors((current) => ({ ...current, foodPreference: "" }));
                        }}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
                {errors.foodPreference ? <p className="aa-apply__error">{errors.foodPreference}</p> : null}
              </fieldset>
              <FoodReferencePicker
                preference={foodPreference}
                values={foodReferences}
                query={foodQuery}
                error={errors.foodReferences}
                onQueryChange={setFoodQuery}
                onAdd={(dish) => {
                  if (foodReferences.some((value) => value.toLocaleLowerCase() === dish.toLocaleLowerCase())) return;
                  setFoodReferences((current) => [...current, dish]);
                  setErrors((current) => ({ ...current, foodReferences: "" }));
                }}
                onRemove={(dish) => setFoodReferences((current) => current.filter((value) => value !== dish))}
              />
              <section className="aa-apply__availability">
                <h3>When is your kitchen available?</h3>
                <ChipGroup
                  label="Available Days"
                  required
                  options={WEEKDAYS}
                  values={availableDays}
                  error={errors.availableDays}
                  singleLine
                  onToggle={(value) =>
                    setSelectedDays(
                      availableDays.includes(value)
                        ? availableDays.filter((day) => day !== value)
                        : [...availableDays, value],
                    )
                  }
                />
                <div className="aa-apply__grid aa-apply__grid--2">
                  <Field label="Available From" required error={errors.openingTime}>
                    <AnalogTimePicker
                      label="Available From"
                      value={openingTime}
                      error={errors.openingTime}
                      onChange={(value) => {
                        setOpeningTime(value);
                        setErrors((current) => ({ ...current, openingTime: "", closingTime: "" }));
                      }}
                    />
                  </Field>
                  <Field label="Available Until" required error={errors.closingTime}>
                    <AnalogTimePicker
                      label="Available Until"
                      value={closingTime}
                      error={errors.closingTime}
                      onChange={(value) => {
                        setClosingTime(value);
                        setErrors((current) => ({ ...current, closingTime: "" }));
                      }}
                    />
                  </Field>
                </div>
              </section>
            </div>
          </>
        ) : null}

        {formError ? <p className="aa-apply__form-error">{formError}</p> : null}
        <SectionNav
          canBack={step > 0}
          onBack={() => setStep((value) => Math.max(0, value - 1))}
          backLabel="Back"
          nextLabel={step === 1 ? "Submit Application" : "Continue"}
          submitting={submitting}
        />
      </form>
    </ApplyShell>
  );
}

export function BecomeDeliveryPartnerPage() {
  const sections = useMemo(() => ["Personal Details", "Work Details"], []);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ message: string; applicationId: string } | null>(
    null,
  );

  const [fullName, setFullName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [ownsVehicle, setOwnsVehicle] = useState<boolean | null>(null);
  const [vehicleType, setVehicleType] = useState<DeliveryVehicleType | "">("");
  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState("");
  const [otherVehicleDescription, setOtherVehicleDescription] = useState("");
  const [availableDaysMode, setAvailableDaysMode] = useState<DeliveryDaysMode | "">("");
  const [chosenDays, setChosenDays] = useState<string[]>([]);
  const [workingHoursMode, setWorkingHoursMode] =
    useState<DeliveryHoursMode>("full_app");
  const [availableFrom, setAvailableFrom] = useState("18:00");
  const [availableUntil, setAvailableUntil] = useState("21:00");

  const availableDays =
    availableDaysMode === "all_days"
      ? WEEKDAYS.map(({ value }) => value)
      : availableDaysMode === "weekdays"
        ? WEEKDAYS.slice(0, 5).map(({ value }) => value)
        : availableDaysMode === "weekends"
          ? WEEKDAYS.slice(5).map(({ value }) => value)
          : availableDaysMode === "choose_days"
            ? chosenDays
            : [];

  function validateStep(current: number): boolean {
    const nextErrors: FieldErrors = {};
    if (current === 0) {
      if (fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
      if (!isValidDeliveryMobile(mobileNumber)) nextErrors.mobileNumber = "Enter a valid 10-digit mobile number.";
      if (!isValidEmail(email.trim())) nextErrors.email = "Enter a valid email address.";
      if (city.trim().length < 2) nextErrors.city = "Enter your city.";
      if (!isValidPincode(pincode)) nextErrors.pincode = "Enter a valid 6-digit pincode.";
    }
    if (current === 1) {
      if (ownsVehicle === null) nextErrors.ownsVehicle = "Choose Yes or No.";
      if (ownsVehicle && !vehicleType) {
        nextErrors.vehicleType = "Select which vehicle you own.";
      }
      if (ownsVehicle && requiresVehicleRegistration(vehicleType)) {
        if (vehicleRegistrationNumber.trim().length < 4) {
          nextErrors.vehicleRegistrationNumber = "Enter your vehicle registration number.";
        } else if (vehicleRegistrationNumber.trim().length > 20) {
          nextErrors.vehicleRegistrationNumber = "Registration number must be 20 characters or fewer.";
        }
      }
      if (ownsVehicle && vehicleType === "other") {
        if (otherVehicleDescription.trim().length < 2) {
          nextErrors.otherVehicleDescription = "Specify your vehicle type.";
        } else if (otherVehicleDescription.trim().length > 80) {
          nextErrors.otherVehicleDescription = "Vehicle type must be 80 characters or fewer.";
        }
      }
      if (!availableDaysMode) {
        nextErrors.availableDays = "Choose an available working-days option.";
      } else if (availableDaysMode === "choose_days" && chosenDays.length === 0) {
        nextErrors.availableDays = "Select at least one working day.";
      }
      const validFrom = DELIVERY_TIME_OPTIONS.some(({ value }) => value === availableFrom);
      const validUntil = DELIVERY_TIME_OPTIONS.some(({ value }) => value === availableUntil);
      if (workingHoursMode === "custom" && !validFrom) {
        nextErrors.availableFrom = "Choose a start time between 6:00 PM and 9:00 PM.";
      }
      if (workingHoursMode === "custom" && !validUntil) {
        nextErrors.availableUntil = "Choose an end time no later than 9:00 PM.";
      } else if (
        workingHoursMode === "custom" &&
        validFrom &&
        validUntil &&
        availableFrom >= availableUntil
      ) {
        nextErrors.availableUntil = "End time must be later than start time.";
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validateStep(step)) return;
    if (step < sections.length - 1) {
      setStep((value) => value + 1);
      return;
    }

    if (
      ownsVehicle === null ||
      !availableDaysMode ||
      (ownsVehicle && !vehicleType)
    ) {
      return;
    }
    const usesFullAppHours = workingHoursMode === "full_app";

    setSubmitting(true);
    try {
      const result = await submitDeliveryPartnerApplication({
        fullName: fullName.trim(),
        mobileNumber: normalizeDeliveryMobile(mobileNumber),
        email: email.trim().toLowerCase(),
        city: city.trim(),
        pincode: pincode.trim(),
        ownsVehicle,
        ...(ownsVehicle && vehicleType ? { vehicleType } : {}),
        ...(ownsVehicle && requiresVehicleRegistration(vehicleType)
          ? { vehicleRegistrationNumber: vehicleRegistrationNumber.trim() }
          : {}),
        ...(ownsVehicle && vehicleType === "other"
          ? { otherVehicleDescription: otherVehicleDescription.trim() }
          : {}),
        availableDaysMode,
        availableDays,
        workingHoursMode,
        availableFrom: usesFullAppHours ? "18:00" : availableFrom,
        availableUntil: usesFullAppHours ? "21:00" : availableUntil,
      });
      setSuccess({ message: result.message, applicationId: result.applicationId });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to submit your application. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <ApplyShell title="Become a Delivery Partner" subtitle="" sections={sections} step={sections.length - 1}>
        <div className="aa-apply__card aa-apply__success">
          <h2>Application received</h2>
          <p>{success.message}</p>
          <span className="aa-apply__success-id">Application ID: {success.applicationId}</span>
          <div className="aa-apply__actions" style={{ justifyContent: "center" }}>
            <button type="button" className="aa-apply__btn aa-apply__btn--primary" onClick={() => navigate(PATHS.home)}>
              Back to Home
            </button>
          </div>
        </div>
      </ApplyShell>
    );
  }

  return (
    <ApplyShell
      title="Become a Delivery Partner"
      subtitle="Join Aahaa and deliver happiness to customers."
      sections={sections}
      step={step}
    >
      <form className="aa-apply__card" onSubmit={onSubmit} noValidate>
        {step === 0 ? (
          <>
            <h2 className="aa-apply__section-title">Personal Details</h2>
            <p className="aa-apply__section-hint">We’ll use these details to contact you about your application.</p>
            <div className="aa-apply__grid">
              <Field label="Full Name" required error={errors.fullName}>
                <input autoComplete="name" placeholder="Enter your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={Boolean(errors.fullName)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="Mobile Number" required error={errors.mobileNumber}>
                  <input autoComplete="tel-national" inputMode="numeric" placeholder="10-digit mobile number" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} aria-invalid={Boolean(errors.mobileNumber)} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <input autoComplete="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
                </Field>
              </div>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="City" required error={errors.city}>
                  <input autoComplete="address-level2" placeholder="Enter your city" value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={Boolean(errors.city)} />
                </Field>
                <Field label="Pincode" required error={errors.pincode}>
                  <input autoComplete="postal-code" inputMode="numeric" placeholder="6-digit pincode" value={pincode} onChange={(e) => setPincode(e.target.value)} aria-invalid={Boolean(errors.pincode)} />
                </Field>
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="aa-apply__section-title">Work Details</h2>
            <div className="aa-apply__grid">
              <Field label="Do you own a vehicle?" required error={errors.ownsVehicle}>
                <div className="aa-apply__chips" role="group" aria-label="Do you own a vehicle?">
                  {VEHICLE_OWNERSHIP_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={ownsVehicle === option.value}
                      className={`aa-apply__chip${ownsVehicle === option.value ? " is-selected" : ""}`}
                      onClick={() => {
                        if (ownsVehicle !== option.value) {
                          setVehicleType("");
                          setVehicleRegistrationNumber("");
                          setOtherVehicleDescription("");
                        }
                        setOwnsVehicle(option.value);
                        setErrors((current) => ({
                          ...current,
                          ownsVehicle: "",
                          vehicleType: "",
                          vehicleRegistrationNumber: "",
                          otherVehicleDescription: "",
                        }));
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </Field>
              {ownsVehicle === true ? (
                <Field label="Which vehicle do you own?" required error={errors.vehicleType}>
                  <div className="aa-apply__chips" role="group" aria-label="Which vehicle do you own?">
                    {DELIVERY_VEHICLE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={vehicleType === option.value}
                        className={`aa-apply__chip${vehicleType === option.value ? " is-selected" : ""}`}
                        onClick={() => {
                          if (vehicleType !== option.value) {
                            setVehicleRegistrationNumber("");
                            setOtherVehicleDescription("");
                          }
                          setVehicleType(option.value);
                          setErrors((current) => ({
                            ...current,
                            vehicleType: "",
                            vehicleRegistrationNumber: "",
                            otherVehicleDescription: "",
                          }));
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </Field>
              ) : null}
              {ownsVehicle && requiresVehicleRegistration(vehicleType) ? (
                <Field label="Vehicle Registration Number" required error={errors.vehicleRegistrationNumber}>
                  <input
                    autoComplete="off"
                    placeholder="Enter registration number"
                    value={vehicleRegistrationNumber}
                    onChange={(e) => {
                      setVehicleRegistrationNumber(e.target.value);
                      setErrors((current) => ({
                        ...current,
                        vehicleRegistrationNumber: "",
                      }));
                    }}
                    aria-invalid={Boolean(errors.vehicleRegistrationNumber)}
                  />
                </Field>
              ) : null}
              {ownsVehicle && vehicleType === "other" ? (
                <Field label="Specify Your Vehicle Type" required error={errors.otherVehicleDescription}>
                  <input
                    autoComplete="off"
                    placeholder="Enter your vehicle type"
                    value={otherVehicleDescription}
                    onChange={(e) => {
                      setOtherVehicleDescription(e.target.value);
                      setErrors((current) => ({
                        ...current,
                        otherVehicleDescription: "",
                      }));
                    }}
                    aria-invalid={Boolean(errors.otherVehicleDescription)}
                  />
                </Field>
              ) : null}
              <Field label="Available Working Days" required error={errors.availableDays}>
                <div className="aa-apply__chips" role="group" aria-label="Available Working Days">
                  {DELIVERY_DAYS_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={availableDaysMode === option.value}
                      className={`aa-apply__chip${availableDaysMode === option.value ? " is-selected" : ""}`}
                      onClick={() => setAvailableDaysMode(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {availableDaysMode === "choose_days" ? (
                  <div className="aa-apply__chips" role="group" aria-label="Select working days">
                    {WEEKDAYS.map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={chosenDays.includes(value)}
                        className={`aa-apply__chip${chosenDays.includes(value) ? " is-selected" : ""}`}
                        onClick={() =>
                          setChosenDays((current) =>
                            current.includes(value)
                              ? current.filter((day) => day !== value)
                              : [...current, value],
                          )
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Field label="Available Working Hours" required>
                <div className="aa-apply__chips" role="group" aria-label="Available Working Hours">
                  <button
                    type="button"
                    aria-pressed={workingHoursMode === "full_app"}
                    className={`aa-apply__chip${workingHoursMode === "full_app" ? " is-selected" : ""}`}
                    onClick={() => setWorkingHoursMode("full_app")}
                  >
                    Full App Hours (6:00 PM – 9:00 PM)
                  </button>
                  <button
                    type="button"
                    aria-pressed={workingHoursMode === "custom"}
                    className={`aa-apply__chip${workingHoursMode === "custom" ? " is-selected" : ""}`}
                    onClick={() => setWorkingHoursMode("custom")}
                  >
                    Custom Timing
                  </button>
                </div>
              </Field>
              {workingHoursMode === "custom" ? (
                <div className="aa-apply__grid aa-apply__grid--2">
                  <Field label="Available From" required error={errors.availableFrom}>
                    <select value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} aria-invalid={Boolean(errors.availableFrom)}>
                      {DELIVERY_TIME_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                  <Field label="Available Until" required error={errors.availableUntil}>
                    <select value={availableUntil} onChange={(e) => setAvailableUntil(e.target.value)} aria-invalid={Boolean(errors.availableUntil)}>
                      {DELIVERY_TIME_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </Field>
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {formError ? <p className="aa-apply__form-error">{formError}</p> : null}
        <SectionNav
          canBack={step > 0}
          onBack={() => setStep((value) => Math.max(0, value - 1))}
          nextLabel={step === sections.length - 1 ? "Submit Application" : "Continue"}
          submitting={submitting}
        />
      </form>
    </ApplyShell>
  );
}
