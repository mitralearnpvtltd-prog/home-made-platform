export const KITCHEN_HOURS_NOTICE =
  "Amma’s Kitchens are strictly available from 6:00 PM to 9:00 PM.";

type KitchenHoursNoticeProps = {
  className?: string;
};

/** Shared informational strip for kitchen availability hours. */
export function KitchenHoursNotice({ className }: KitchenHoursNoticeProps) {
  const classes = ["aahaa-kitchen-hours", className].filter(Boolean).join(" ");

  return (
    <p className={classes} role="note">
      <span className="aahaa-kitchen-hours__icon" aria-hidden="true">
        <KitchenHoursClockIcon />
      </span>
      <strong className="aahaa-kitchen-hours__text">{KITCHEN_HOURS_NOTICE}</strong>
    </p>
  );
}

/** Matches the stroke clock used across cook pages (`ClockIcon`). */
function KitchenHoursClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 5.8V9l2.4 1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
