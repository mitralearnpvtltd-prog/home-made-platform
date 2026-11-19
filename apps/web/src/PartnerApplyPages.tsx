import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
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

type FieldErrors = Record<string, string>;

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
  onToggle,
}: {
  label: string;
  required?: boolean;
  options: ReadonlyArray<{ value: string; label: string }>;
  values: string[];
  error?: string;
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="aa-apply__field aa-apply__fieldset">
      <legend>
        {label}
        {required ? <RequiredMark /> : null}
      </legend>
      <div className="aa-apply__chips">
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

function PhotoField({
  file,
  previewUrl,
  error,
  onChange,
}: {
  file: File | null;
  previewUrl: string | null;
  error?: string;
  onChange: (file: File | null, preview: string | null) => void;
}) {
  return (
    <Field
      label="Profile Photo"
      error={error}
      hint="Optional. JPEG, PNG or WebP up to 5 MB."
    >
      <div className="aa-apply__file">
        <div className="aa-apply__file-box">
          {previewUrl ? <img src={previewUrl} alt="" /> : null}
          <div>
            <strong>{file ? file.name : "Upload a clear photo of yourself"}</strong>
            <small>Optional — helps us recognise you</small>
          </div>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-invalid={error ? true : undefined}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const next = event.target.files?.[0] ?? null;
            if (!next) {
              onChange(null, null);
              return;
            }
            if (next.size > 5 * 1024 * 1024) {
              onChange(null, null);
              return;
            }
            const url = URL.createObjectURL(next);
            onChange(next, url);
          }}
        />
      </div>
    </Field>
  );
}

function SectionNav({
  canBack,
  onBack,
  nextLabel,
  submitting,
}: {
  canBack: boolean;
  onBack: () => void;
  nextLabel: string;
  submitting?: boolean;
}) {
  return (
    <div className="aa-apply__actions">
      {canBack ? (
        <button type="button" className="aa-apply__btn aa-apply__btn--ghost" onClick={onBack}>
          Previous
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

function isValidPincode(value: string) {
  return /^[1-9][0-9]{5}$/.test(value);
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function BecomeCookPage() {
  const sections = useMemo(
    () => ["Personal", "Kitchen", "Menu", "Availability", "Submit"],
    [],
  );
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [kitchenName, setKitchenName] = useState("");
  const [kitchenAddress, setKitchenAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [foodTypes, setFoodTypes] = useState<string[]>([]);

  const [foodCategories, setFoodCategories] = useState<string[]>([]);
  const [specialDishes, setSpecialDishes] = useState("");
  const [foodPreference, setFoodPreference] = useState("");

  const [fssai, setFssai] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);

  function toggleValue(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function validateStep(current: number): boolean {
    const nextErrors: FieldErrors = {};
    if (current === 0) {
      if (fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
      if (!isValidMobile(mobileNumber)) nextErrors.mobileNumber = "Enter a valid 10-digit mobile number.";
      if (!isValidEmail(email.trim())) nextErrors.email = "Enter a valid email address.";
    }
    if (current === 1) {
      if (kitchenName.trim().length < 2) nextErrors.kitchenName = "Enter your kitchen name.";
      if (kitchenAddress.trim().length < 5) nextErrors.kitchenAddress = "Enter your kitchen address.";
      if (city.trim().length < 2) nextErrors.city = "Enter your city.";
      if (!isValidPincode(pincode)) nextErrors.pincode = "Enter a valid 6-digit pincode.";
      const years = Number.parseInt(yearsExperience, 10);
      if (Number.isNaN(years) || years < 0 || years > 80) {
        nextErrors.yearsExperience = "Enter years of experience (0–80).";
      }
      if (foodTypes.length === 0) nextErrors.foodTypes = "Select at least one food type.";
    }
    if (current === 2) {
      if (foodCategories.length === 0) nextErrors.foodCategories = "Select at least one food category.";
      if (!foodPreference) nextErrors.foodPreference = "Select a food preference.";
    }
    if (current === 3) {
      if (!openingTime) nextErrors.openingTime = "Opening time is required.";
      if (!closingTime) nextErrors.closingTime = "Closing time is required.";
      if (openingTime && closingTime && timeToMinutes(closingTime) <= timeToMinutes(openingTime)) {
        nextErrors.closingTime =
          "Closing time must be later than opening time. Overnight hours are not supported.";
      }
      if (availableDays.length === 0) nextErrors.availableDays = "Select at least one available day.";
    }
    if (current === 4) {
      if (!termsAccepted) nextErrors.termsAccepted = "Please accept the Terms & Privacy Policy.";
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

    const formData = new FormData();
    formData.set("fullName", fullName.trim());
    formData.set("mobileNumber", mobileNumber.replace(/\D/g, "").slice(-10));
    formData.set("email", email.trim().toLowerCase());
    formData.set("kitchenName", kitchenName.trim());
    formData.set("kitchenAddress", kitchenAddress.trim());
    formData.set("city", city.trim());
    formData.set("pincode", pincode.trim());
    formData.set("yearsExperience", String(Number.parseInt(yearsExperience, 10)));
    formData.set("foodTypes", JSON.stringify(foodTypes));
    formData.set("foodCategories", JSON.stringify(foodCategories));
    if (specialDishes.trim()) formData.set("specialDishes", specialDishes.trim());
    formData.set("foodPreference", foodPreference);
    if (fssai.trim()) formData.set("fssaiRegistrationNumber", fssai.trim());
    formData.set("kitchenOpeningTime", openingTime);
    formData.set("kitchenClosingTime", closingTime);
    formData.set("availableDays", JSON.stringify(availableDays));
    formData.set("termsAccepted", "true");
    if (photo) formData.set("profilePhoto", photo);

    setSubmitting(true);
    try {
      const result = await submitCookApplication(formData);
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
      <ApplyShell title="Become an Aahaa Home Cook" subtitle="" sections={sections} step={sections.length - 1}>
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
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={Boolean(errors.fullName)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="Mobile Number" required error={errors.mobileNumber}>
                  <input inputMode="numeric" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} aria-invalid={Boolean(errors.mobileNumber)} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
                </Field>
              </div>
              <PhotoField
                file={photo}
                previewUrl={photoPreview}
                error={errors.photo}
                onChange={(file, preview) => {
                  setPhoto(file);
                  setPhotoPreview(preview);
                }}
              />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="aa-apply__section-title">Kitchen Details</h2>
            <p className="aa-apply__section-hint">Where do you cook, and what do you specialise in?</p>
            <div className="aa-apply__grid">
              <Field label="Kitchen Name" required error={errors.kitchenName}>
                <input value={kitchenName} onChange={(e) => setKitchenName(e.target.value)} aria-invalid={Boolean(errors.kitchenName)} />
              </Field>
              <Field label="Kitchen Address" required error={errors.kitchenAddress}>
                <textarea value={kitchenAddress} onChange={(e) => setKitchenAddress(e.target.value)} aria-invalid={Boolean(errors.kitchenAddress)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="City" required error={errors.city}>
                  <input value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={Boolean(errors.city)} />
                </Field>
                <Field label="Pincode" required error={errors.pincode}>
                  <input inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} aria-invalid={Boolean(errors.pincode)} />
                </Field>
              </div>
              <Field label="Years of Cooking Experience" required error={errors.yearsExperience}>
                <input inputMode="numeric" value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} aria-invalid={Boolean(errors.yearsExperience)} />
              </Field>
              <ChipGroup
                label="Types of Food"
                required
                options={[
                  { value: "homemade_meals", label: "Homemade Meals" },
                  { value: "snacks", label: "Snacks" },
                ]}
                values={foodTypes}
                error={errors.foodTypes}
                onToggle={(value) => toggleValue(foodTypes, value, setFoodTypes)}
              />
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="aa-apply__section-title">Food & Menu Details</h2>
            <p className="aa-apply__section-hint">Help customers discover your signature cooking.</p>
            <div className="aa-apply__grid">
              <ChipGroup
                label="Food Categories"
                required
                options={[
                  { value: "breakfast", label: "Breakfast" },
                  { value: "lunch", label: "Lunch" },
                  { value: "dinner", label: "Dinner" },
                  { value: "snacks", label: "Snacks" },
                ]}
                values={foodCategories}
                error={errors.foodCategories}
                onToggle={(value) => toggleValue(foodCategories, value, setFoodCategories)}
              />
              <Field label="Special Dishes" hint="Share your signature dishes and specialties.">
                <textarea value={specialDishes} onChange={(e) => setSpecialDishes(e.target.value)} />
              </Field>
              <Field label="Food Preference" required error={errors.foodPreference}>
                <select value={foodPreference} onChange={(e) => setFoodPreference(e.target.value)} aria-invalid={Boolean(errors.foodPreference)}>
                  <option value="">Select preference</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="non_vegetarian">Non-Vegetarian</option>
                  <option value="both">Both Vegetarian and Non-Vegetarian</option>
                </select>
              </Field>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="aa-apply__section-title">Business & Availability</h2>
            <p className="aa-apply__section-hint">When can customers order from your kitchen?</p>
            <div className="aa-apply__grid">
              <Field label="FSSAI Registration Number" hint="Optional, if applicable.">
                <input value={fssai} onChange={(e) => setFssai(e.target.value)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="Kitchen Opening Time" required error={errors.openingTime}>
                  <input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} aria-invalid={Boolean(errors.openingTime)} />
                </Field>
                <Field label="Kitchen Closing Time" required error={errors.closingTime}>
                  <input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} aria-invalid={Boolean(errors.closingTime)} />
                </Field>
              </div>
              <ChipGroup
                label="Available Days"
                required
                options={WEEKDAYS}
                values={availableDays}
                error={errors.availableDays}
                onToggle={(value) => toggleValue(availableDays, value, setAvailableDays)}
              />
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="aa-apply__section-title">Final Submission</h2>
            <p className="aa-apply__section-hint">Review your details, then send your application for review.</p>
            <div className="aa-apply__check">
              <input
                id="cook-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="cook-terms">
                I accept Aahaa&apos;s{" "}
                <a href={PATHS.terms} onClick={(e) => { e.preventDefault(); navigate(PATHS.terms); }}>
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href={PATHS.privacy} onClick={(e) => { e.preventDefault(); navigate(PATHS.privacy); }}>
                  Privacy Policy
                </a>
                .
                <RequiredMark />
              </label>
            </div>
            {errors.termsAccepted ? <p className="aa-apply__error">{errors.termsAccepted}</p> : null}
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

export function BecomeDeliveryPartnerPage() {
  const sections = useMemo(
    () => ["Personal", "Address", "Vehicle", "Preferences", "Submit"],
    [],
  );
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [currentAddress, setCurrentAddress] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const [vehicleRegistrationNumber, setVehicleRegistrationNumber] = useState("");
  const [drivingLicenseNumber, setDrivingLicenseNumber] = useState("");

  const [preferredDeliveryArea, setPreferredDeliveryArea] = useState("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [workPreference, setWorkPreference] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  function toggleValue(list: string[], value: string, setter: (next: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  function validateStep(current: number): boolean {
    const nextErrors: FieldErrors = {};
    if (current === 0) {
      if (fullName.trim().length < 2) nextErrors.fullName = "Enter your full name.";
      if (!isValidMobile(mobileNumber)) nextErrors.mobileNumber = "Enter a valid 10-digit mobile number.";
      if (!isValidEmail(email.trim())) nextErrors.email = "Enter a valid email address.";
    }
    if (current === 1) {
      if (currentAddress.trim().length < 5) nextErrors.currentAddress = "Enter your current address.";
      if (city.trim().length < 2) nextErrors.city = "Enter your city.";
      if (!isValidPincode(pincode)) nextErrors.pincode = "Enter a valid 6-digit pincode.";
    }
    if (current === 2) {
      if (vehicleRegistrationNumber.trim().length < 4) {
        nextErrors.vehicleRegistrationNumber = "Enter your vehicle registration number.";
      }
      if (drivingLicenseNumber.trim().length < 5) {
        nextErrors.drivingLicenseNumber = "Enter your driving licence number.";
      }
    }
    if (current === 3) {
      if (preferredDeliveryArea.trim().length < 3) {
        nextErrors.preferredDeliveryArea = "Enter your preferred delivery area.";
      }
      if (availableDays.length === 0) nextErrors.availableDays = "Select at least one working day.";
      if (!workPreference) nextErrors.workPreference = "Select a work preference.";
    }
    if (current === 4) {
      if (!termsAccepted) nextErrors.termsAccepted = "Please accept the Terms & Privacy Policy.";
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

    const formData = new FormData();
    formData.set("fullName", fullName.trim());
    formData.set("mobileNumber", mobileNumber.replace(/\D/g, "").slice(-10));
    formData.set("email", email.trim().toLowerCase());
    formData.set("currentAddress", currentAddress.trim());
    formData.set("city", city.trim());
    formData.set("pincode", pincode.trim());
    formData.set("vehicleRegistrationNumber", vehicleRegistrationNumber.trim());
    formData.set("drivingLicenseNumber", drivingLicenseNumber.trim());
    formData.set("preferredDeliveryArea", preferredDeliveryArea.trim());
    formData.set("availableDays", JSON.stringify(availableDays));
    formData.set("workPreference", workPreference);
    formData.set("termsAccepted", "true");
    if (photo) formData.set("profilePhoto", photo);

    setSubmitting(true);
    try {
      const result = await submitDeliveryPartnerApplication(formData);
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
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} aria-invalid={Boolean(errors.fullName)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="Mobile Number" required error={errors.mobileNumber}>
                  <input inputMode="numeric" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} aria-invalid={Boolean(errors.mobileNumber)} />
                </Field>
                <Field label="Email Address" required error={errors.email}>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={Boolean(errors.email)} />
                </Field>
              </div>
              <PhotoField
                file={photo}
                previewUrl={photoPreview}
                error={errors.photo}
                onChange={(file, preview) => {
                  setPhoto(file);
                  setPhotoPreview(preview);
                }}
              />
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <h2 className="aa-apply__section-title">Address Details</h2>
            <div className="aa-apply__grid">
              <Field label="Current Address" required error={errors.currentAddress}>
                <textarea value={currentAddress} onChange={(e) => setCurrentAddress(e.target.value)} aria-invalid={Boolean(errors.currentAddress)} />
              </Field>
              <div className="aa-apply__grid aa-apply__grid--2">
                <Field label="City" required error={errors.city}>
                  <input value={city} onChange={(e) => setCity(e.target.value)} aria-invalid={Boolean(errors.city)} />
                </Field>
                <Field label="Pincode" required error={errors.pincode}>
                  <input inputMode="numeric" value={pincode} onChange={(e) => setPincode(e.target.value)} aria-invalid={Boolean(errors.pincode)} />
                </Field>
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2 className="aa-apply__section-title">Vehicle Details</h2>
            <div className="aa-apply__grid aa-apply__grid--2">
              <Field label="Vehicle Registration Number" required error={errors.vehicleRegistrationNumber}>
                <input value={vehicleRegistrationNumber} onChange={(e) => setVehicleRegistrationNumber(e.target.value)} aria-invalid={Boolean(errors.vehicleRegistrationNumber)} />
              </Field>
              <Field label="Driving License Number" required error={errors.drivingLicenseNumber}>
                <input value={drivingLicenseNumber} onChange={(e) => setDrivingLicenseNumber(e.target.value)} aria-invalid={Boolean(errors.drivingLicenseNumber)} />
              </Field>
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2 className="aa-apply__section-title">Delivery Preferences</h2>
            <div className="aa-apply__grid">
              <Field label="Preferred Delivery Address / Delivery Area" required error={errors.preferredDeliveryArea}>
                <input value={preferredDeliveryArea} onChange={(e) => setPreferredDeliveryArea(e.target.value)} aria-invalid={Boolean(errors.preferredDeliveryArea)} />
              </Field>
              <ChipGroup
                label="Available Working Days"
                required
                options={WEEKDAYS}
                values={availableDays}
                error={errors.availableDays}
                onToggle={(value) => toggleValue(availableDays, value, setAvailableDays)}
              />
              <Field label="Work Preference" required error={errors.workPreference}>
                <select value={workPreference} onChange={(e) => setWorkPreference(e.target.value)} aria-invalid={Boolean(errors.workPreference)}>
                  <option value="">Select preference</option>
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                </select>
              </Field>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2 className="aa-apply__section-title">Final Submission</h2>
            <p className="aa-apply__section-hint">Confirm and submit your delivery partner application.</p>
            <div className="aa-apply__check">
              <input
                id="delivery-terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              <label htmlFor="delivery-terms">
                I accept Aahaa&apos;s{" "}
                <a href={PATHS.terms} onClick={(e) => { e.preventDefault(); navigate(PATHS.terms); }}>
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href={PATHS.privacy} onClick={(e) => { e.preventDefault(); navigate(PATHS.privacy); }}>
                  Privacy Policy
                </a>
                .
                <RequiredMark />
              </label>
            </div>
            {errors.termsAccepted ? <p className="aa-apply__error">{errors.termsAccepted}</p> : null}
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
