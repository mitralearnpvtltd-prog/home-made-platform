import { useEffect, useMemo, useState } from "react";
import { ApiError, getAdminDashboard, type AdminDashboard } from "../lib/api";
import { navigate, PATHS } from "../navigation";

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function SalesChart({
  series,
}: {
  series: AdminDashboard["salesOverview"];
}) {
  const max = Math.max(...series.map((point) => point.revenue), 1);
  const width = 560;
  const height = 180;
  const padX = 24;
  const padY = 18;
  const gap = (width - padX * 2) / Math.max(series.length, 1);

  if (series.every((point) => point.orderCount === 0 && point.revenue === 0)) {
    return (
      <div className="ad-chart__empty">
        No paid order activity in the last 14 days yet.
      </div>
    );
  }

  return (
    <svg className="ad-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales overview">
      {series.map((point, index) => {
        const barHeight = (point.revenue / max) * (height - padY * 2);
        const x = padX + index * gap + gap * 0.18;
        const y = height - padY - barHeight;
        const barWidth = gap * 0.64;
        return (
          <g key={point.date}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(barHeight, 2)}
              rx={6}
              fill={point.revenue > 0 ? "#1b7a4d" : "#d7e6dc"}
            />
            {index % 2 === 0 ? (
              <text
                x={x + barWidth / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="9"
                fill="#6d7a72"
              >
                {point.date.slice(5)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void getAdminDashboard(controller.signal)
      .then((dashboard) => setData(dashboard))
      .catch((err) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Unable to load dashboard metrics.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const metrics = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Total orders", value: String(data.metrics.totalOrders) },
      { label: "Today's orders", value: String(data.metrics.todayOrders) },
      { label: "Pending orders", value: String(data.metrics.pendingOrders) },
      { label: "Completed orders", value: String(data.metrics.completedOrders) },
      {
        label: "Total revenue",
        value: money(data.metrics.totalRevenue),
        note: data.notes.revenue,
      },
      {
        label: "Kitchens",
        value: String(data.metrics.listedKitchens),
        note: data.notes.kitchens,
      },
      {
        label: "Registered customers",
        value: String(data.metrics.registeredCustomers),
        note: data.notes.customers,
      },
      {
        label: "Pending cook apps",
        value: String(data.metrics.pendingCookApplications),
      },
      {
        label: "Pending delivery apps",
        value: String(data.metrics.pendingDeliveryApplications),
      },
    ];
  }, [data]);

  if (loading) {
    return <div className="ad-empty"><p>Loading live dashboard…</p></div>;
  }

  if (error || !data) {
    return (
      <div className="ad-error">
        <strong>Dashboard unavailable</strong>
        <p>{error ?? "No dashboard data returned."}</p>
      </div>
    );
  }

  return (
    <>
      <section className="ad-metrics" aria-label="Key metrics">
        {metrics.map((metric) => (
          <article key={metric.label} className="ad-metric">
            <small>{metric.label}</small>
            <strong>{metric.value}</strong>
            {metric.note ? <span>{metric.note}</span> : null}
          </article>
        ))}
      </section>

      <section className="ad-grid-2">
        <article className="ad-card">
          <div className="ad-card__head">
            <h2>Sales overview</h2>
            <small>Last 14 days · paid revenue</small>
          </div>
          <SalesChart series={data.salesOverview} />
        </article>

        <article className="ad-card">
          <div className="ad-card__head">
            <h2>Recent applications</h2>
            <button
              type="button"
              className="ad-btn ad-btn--ghost"
              onClick={() => navigate(PATHS.adminCookApplications)}
            >
              Review
            </button>
          </div>
          {data.recentApplications.length === 0 ? (
            <p className="ad-module-note">No applications submitted yet.</p>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Applicant</th>
                  <th>Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentApplications.map((row) => (
                  <tr key={`${row.type}-${row.id}`}>
                    <td>
                      <strong>{row.fullName}</strong>
                      <div>{row.applicationId}</div>
                    </td>
                    <td>{row.type === "cook" ? "Cook" : "Delivery"}</td>
                    <td>
                      <span className={`ad-badge is-${row.status}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </section>

      <article className="ad-card">
        <div className="ad-card__head">
          <h2>Recent orders</h2>
          <small>Latest platform orders</small>
        </div>
        {data.recentOrders.length === 0 ? (
          <p className="ad-module-note">No orders found yet.</p>
        ) : (
          <table className="ad-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Collector</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {data.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>{order.collectorName}</td>
                  <td>
                    <span className={`ad-badge is-${order.status}`}>{order.status}</span>
                  </td>
                  <td>
                    <span className={`ad-badge is-${order.paymentStatus}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>{money(order.total)}</td>
                  <td>{new Date(order.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </>
  );
}
