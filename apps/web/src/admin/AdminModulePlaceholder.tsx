export function AdminModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="ad-empty">
      <h2>{title}</h2>
      <p>{description}</p>
      <p className="ad-module-note" style={{ marginTop: "1rem" }}>
        This module is reserved in the admin navigation for a later milestone.
        No mock data is shown here.
      </p>
    </div>
  );
}
