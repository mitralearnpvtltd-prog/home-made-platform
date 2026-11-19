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
                        {row.application_id} · {row.kitchen_name} · {row.city}
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
                        {row.applicationId} · {row.city} · {row.workPreference}
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
            <dl>
              {Object.entries(detail)
                .filter(([key]) => !["profilePhotoUrl", "id"].includes(key))
                .map(([key, value]) => (
                  <div key={key} style={{ display: "contents" }}>
                    <dt>{key}</dt>
                    <dd>{Array.isArray(value) ? value.join(", ") : String(value ?? "—")}</dd>
                  </div>
                ))}
            </dl>
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
