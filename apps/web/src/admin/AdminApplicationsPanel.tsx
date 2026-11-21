import { useEffect, useState } from "react";
import {
  ApiError,
  getAdminCookApplication,
  getAdminDeliveryPartnerApplication,
  listAdminCookApplications,
  listAdminDeliveryPartnerApplications,
  reviewAdminCookApplication,
  reviewAdminDeliveryPartnerApplication,
  type AdminCookApplicationListItem,
  type AdminDeliveryPartnerListItem,
} from "../lib/api";
import { navigate, PATHS } from "../navigation";
import "../styles/apply.css";

type Tab = "cook" | "delivery";

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.length ? value.join(", ") : "—";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function displayTime(value: unknown): string {
  if (typeof value !== "string") return "—";
  const match = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!match) return value;
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

function displayWeekdays(value: unknown): string {
  if (!Array.isArray(value)) return "—";
  return value
    .filter((day): day is string => typeof day === "string")
    .map((day) => `${day.charAt(0).toUpperCase()}${day.slice(1)}`)
    .join(", ") || "—";
}

function displayAvailableDaysMode(value: unknown): string {
  const labels: Record<string, string> = {
    all_days: "All Days",
    weekdays: "Weekdays",
    weekends: "Weekends",
    choose_days: "Choose Days",
  };
  return typeof value === "string" ? labels[value] ?? "Not recorded" : "Not recorded";
}

function displayWorkPreference(value: unknown): string {
  if (value === "full_time") return "Full Time";
  if (value === "part_time") return "Part Time";
  return displayValue(value);
}

function displayVehicleType(value: unknown): string {
  const labels: Record<string, string> = {
    bike: "Bike",
    car: "Car",
    auto: "Auto",
    other: "Other",
  };
  return typeof value === "string" ? labels[value] ?? value : "Not recorded";
}

function displayWorkingHoursMode(value: unknown): string {
  if (value === "full_app") return "Full App Hours (6:00 PM–9:00 PM)";
  if (value === "custom") return "Custom Timing";
  return "Not recorded";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function displayDailyAvailability(
  schedule: unknown,
  days: unknown,
  fallbackFrom: unknown,
  fallbackUntil: unknown,
): string {
  if (!Array.isArray(days)) return "—";
  return days
    .filter((day): day is string => typeof day === "string")
    .map((day) => {
      const daily = isRecord(schedule) && isRecord(schedule[day])
        ? schedule[day]
        : undefined;
      const dayLabel = `${day.charAt(0).toUpperCase()}${day.slice(1)}`;
      const from = daily?.from ?? fallbackFrom;
      const until = daily?.until ?? fallbackUntil;
      return `${dayLabel}: ${displayTime(from)}–${displayTime(until)}`;
    })
    .join(" · ") || "—";
}

export function AdminApplicationsPanel({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cookRows, setCookRows] = useState<AdminCookApplicationListItem[]>([]);
  const [deliveryRows, setDeliveryRows] = useState<AdminDeliveryPartnerListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setTab(initialTab);
    setSelectedId(null);
    setDetail(null);
  }, [initialTab]);

  async function loadLists() {
    setLoading(true);
    setError(null);
    try {
      const [cooks, partners] = await Promise.all([
        listAdminCookApplications(),
        listAdminDeliveryPartnerApplications(),
      ]);
      setCookRows(cooks);
      setDeliveryRows(partners);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load applications. Admin access is required.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLists();
  }, []);

  async function openDetail(id: string) {
    setSelectedId(id);
    setDetail(null);
    setReviewNotes("");
    setError(null);
    try {
      const data =
        tab === "cook"
          ? await getAdminCookApplication(id)
          : await getAdminDeliveryPartnerApplication(id);
      setDetail(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load application.");
    }
  }

  async function review(status: "approved" | "rejected") {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      if (tab === "cook") {
        await reviewAdminCookApplication(selectedId, {
          status,
          reviewNotes: reviewNotes.trim() || undefined,
        });
      } else {
        await reviewAdminDeliveryPartnerApplication(selectedId, {
          status,
          reviewNotes: reviewNotes.trim() || undefined,
        });
      }
      await loadLists();
      await openDetail(selectedId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to update application.");
    } finally {
      setBusy(false);
    }
  }

  function switchTab(next: Tab) {
    setTab(next);
    setSelectedId(null);
    setDetail(null);
    navigate(
      next === "cook" ? PATHS.adminCookApplications : PATHS.adminDeliveryApplications,
    );
  }

  return (
    <div className="aa-admin" style={{ minHeight: 0, padding: 0, background: "transparent" }}>
      <div className="aa-admin__shell" style={{ width: "100%", margin: 0 }}>
        <p style={{ color: "#6d7a72", marginTop: 0 }}>
          Review partner applications with approve/reject controls. Profile photos use private
          signed URLs.
        </p>

        <div className="aa-admin__tabs" role="tablist">
          <button
            type="button"
            className={tab === "cook" ? "is-active" : ""}
            onClick={() => switchTab("cook")}
          >
            Home cooks
          </button>
          <button
            type="button"
            className={tab === "delivery" ? "is-active" : ""}
            onClick={() => switchTab("delivery")}
          >
            Delivery partners
          </button>
        </div>

        {error ? <p className="aa-apply__form-error">{error}</p> : null}
        {loading ? <p>Loading applications…</p> : null}

        {!loading ? (
          <div className="aa-admin__list">
            {tab === "cook"
              ? cookRows.map((row) => (
                  <article key={row.id} className="aa-admin__row">
                    <div>
                      <h3>
                        {row.full_name}{" "}
                        <span className={`aa-admin__badge is-${row.status}`}>{row.status}</span>
                      </h3>
                      <p>
                        {row.application_id} · {row.city}
                      </p>
                      <p>
                        {row.email} · {row.mobile_number} · Submitted{" "}
                        {new Date(row.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="aa-apply__btn aa-apply__btn--ghost"
                      onClick={() => void openDetail(row.id)}
                    >
                      Review
                    </button>
                  </article>
                ))
              : deliveryRows.map((row) => (
                  <article key={row.id} className="aa-admin__row">
                    <div>
                      <h3>
                        {row.fullName}{" "}
                        <span className={`aa-admin__badge is-${row.status}`}>{row.status}</span>
                      </h3>
                      <p>
                        {row.applicationId} · {row.city}
                        {row.workPreference
                          ? ` · ${displayWorkPreference(row.workPreference)}`
                          : ""}
                      </p>
                      <p>
                        {row.email} · {row.mobileNumber}
                      </p>
                      <p>Submitted {new Date(row.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      className="aa-apply__btn aa-apply__btn--ghost"
                      onClick={() => void openDetail(row.id)}
                    >
                      Review
                    </button>
                  </article>
                ))}
            {(tab === "cook" ? cookRows : deliveryRows).length === 0 ? (
              <p style={{ color: "#6d7a72" }}>No applications yet.</p>
            ) : null}
          </div>
        ) : null}

        {detail ? (
          <section className="aa-admin__detail" aria-live="polite">
            <h2 style={{ marginTop: 0 }}>
              {String(detail.fullName ?? detail.full_name ?? "Application")} (
              {String(detail.applicationId ?? detail.application_id)})
            </h2>
            <p>
              {typeof detail.profilePhotoUrl === "string" && detail.profilePhotoUrl ? (
                <img src={detail.profilePhotoUrl} alt="Applicant profile" />
              ) : (
                <span className="aa-admin__photo-placeholder" aria-label="No profile photo uploaded">
                  No photo
                </span>
              )}
            </p>
            {tab === "cook" ? (
              <div className="aa-admin__cook-details">
                <p className="aa-admin__cook-status">
                  Status <span className={`aa-admin__badge is-${String(detail.status ?? "pending")}`}>{displayValue(detail.status)}</span>
                </p>
                {([
                  {
                    title: "Personal Details",
                    fields: [
                      ["Full Name", detail.fullName],
                      ["Mobile Number", detail.mobileNumber],
                      ["Email Address", detail.email],
                      ["City", detail.city],
                      ["Pincode", detail.pincode],
                    ],
                  },
                  {
                    title: "Food Details",
                    fields: [
                      ["Food Preference", detail.foodPreference === "non_vegetarian" ? "Non-Vegetarian" : detail.foodPreference === "both" ? "Both Vegetarian and Non-Vegetarian" : detail.foodPreference === "vegetarian" ? "Vegetarian" : detail.foodPreference],
                      ["Selected Food References", detail.foodReferences],
                    ],
                  },
                  {
                    title: "Kitchen Availability",
                    fields: [
                      ["Available Days", displayWeekdays(detail.availableDays)],
                      [
                        "Daily Timings",
                        displayDailyAvailability(
                          detail.availabilityByDay,
                          detail.availableDays,
                          detail.availableFrom ?? detail.kitchenOpeningTime,
                          detail.availableUntil ?? detail.kitchenClosingTime,
                        ),
                      ],
                    ],
                  },
                ]).map((group) => (
                  <section key={group.title}>
                    <h3>{group.title}</h3>
                    <dl>
                      {group.fields.map(([label, value]) => (
                        <div key={String(label)}>
                          <dt>{String(label)}</dt>
                          <dd>{displayValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
              </div>
            ) : (
              <div className="aa-admin__cook-details">
                <p className="aa-admin__cook-status">
                  Status <span className={`aa-admin__badge is-${String(detail.status ?? "pending")}`}>{displayValue(detail.status)}</span>
                </p>
                {([
                  {
                    title: "Personal Details",
                    fields: [
                      ["Full Name", detail.fullName],
                      ["Mobile Number", detail.mobileNumber],
                      ["Email Address", detail.email],
                      ["City", detail.city],
                      ["Pincode", detail.pincode],
                    ],
                  },
                  {
                    title: "Work Details",
                    fields: [
                      [
                        "Do you own a vehicle?",
                        detail.ownsVehicle === true
                          ? "Yes"
                          : detail.ownsVehicle === false
                            ? "No"
                            : "Not recorded",
                      ],
                      [
                        "Which vehicle do you own?",
                        detail.ownsVehicle === true
                          ? displayVehicleType(detail.vehicleType)
                          : detail.ownsVehicle === false
                            ? "Not applicable"
                            : "Not recorded",
                      ],
                      [
                        "Vehicle Registration Number",
                        detail.ownsVehicle === false || detail.vehicleType === "other"
                          ? "Not applicable"
                          : detail.vehicleRegistrationNumber,
                      ],
                      [
                        "Specify Your Vehicle Type",
                        detail.vehicleType === "other"
                          ? detail.otherVehicleDescription
                          : detail.ownsVehicle === false
                            ? "Not applicable"
                            : "Not recorded",
                      ],
                      ...(detail.ownsVehicle === false &&
                      typeof detail.canArrangeVehicle === "boolean"
                        ? [[
                            "Will you arrange your own vehicle for Aahaa deliveries?",
                            detail.canArrangeVehicle ? "Yes" : "No",
                          ]]
                        : []),
                      ...(detail.workPreference !== null &&
                      detail.workPreference !== undefined &&
                      detail.workPreference !== ""
                        ? [["Work Preference", displayWorkPreference(detail.workPreference)]]
                        : []),
                      ["Working Days Option", displayAvailableDaysMode(detail.availableDaysMode)],
                      ["Available Working Days", displayWeekdays(detail.availableDays)],
                      ["Working Hours Option", displayWorkingHoursMode(detail.workingHoursMode)],
                      ["Available From", displayTime(detail.availableFrom)],
                      ["Available Until", displayTime(detail.availableUntil)],
                    ],
                  },
                ]).map((group) => (
                  <section key={group.title}>
                    <h3>{group.title}</h3>
                    <dl>
                      {group.fields.map(([label, value]) => (
                        <div key={String(label)}>
                          <dt>{String(label)}</dt>
                          <dd>{displayValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                ))}
                {[
                  detail.currentAddress,
                  detail.drivingLicenseNumber,
                  detail.preferredDeliveryArea,
                ].some((value) => typeof value === "string" && value.trim()) ? (
                  <section>
                    <h3>Details from Previous Application</h3>
                    <dl>
                      {[
                        ["Current Address", detail.currentAddress],
                        ["Driving License Number", detail.drivingLicenseNumber],
                        ["Preferred Delivery Area", detail.preferredDeliveryArea],
                      ]
                        .filter(([, value]) => typeof value === "string" && value.trim())
                        .map(([label, value]) => (
                          <div key={String(label)}>
                            <dt>{String(label)}</dt>
                            <dd>{displayValue(value)}</dd>
                          </div>
                        ))}
                    </dl>
                  </section>
                ) : null}
              </div>
            )}
            {detail.status === "pending" ? (
              <div style={{ marginTop: "1.25rem" }}>
                <label className="aa-apply__field">
                  Review notes
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Optional notes for the decision"
                  />
                </label>
                <div className="aa-apply__actions">
                  <button
                    type="button"
                    className="aa-apply__btn aa-apply__btn--ghost"
                    disabled={busy}
                    onClick={() => void review("rejected")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="aa-apply__btn aa-apply__btn--primary"
                    disabled={busy}
                    onClick={() => void review("approved")}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
