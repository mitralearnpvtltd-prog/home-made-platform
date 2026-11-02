type Availability = "available" | "unavailable";

type FoodItemCardProps = {
  name: string;
  priceLabel: string;
  availability: Availability;
};

export function FoodItemCard({ name, priceLabel, availability }: FoodItemCardProps) {
  const available = availability === "available";

  return (
    <article className="ds-card ds-food">
      <div className="ds-food__media" aria-hidden="true" />
      <div className="ds-food__body">
        <h3 className="ds-food__name">{name}</h3>
        <p className="ds-price">{priceLabel}</p>
        <p className={available ? "ds-badge ds-badge--success" : "ds-badge ds-badge--warning"}>
          {available ? "Available" : "Unavailable"}
        </p>
      </div>
    </article>
  );
}
