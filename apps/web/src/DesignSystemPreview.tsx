import { Alert } from "./components/Alert";
import { Button, IconButton } from "./components/Button";
import { Card } from "./components/Card";
import { FoodItemCard } from "./components/FoodItemCard";
import { EmptyState, ErrorState } from "./components/StateMessage";
import { StatusBadge } from "./components/StatusBadge";
import { TextField } from "./components/TextField";

const swatches = [
  ["Action", "var(--color-action)"],
  ["Action tint", "var(--color-action-tint)"],
  ["Page", "var(--color-surface-page)"],
  ["Text", "var(--color-text)"],
  ["Border", "var(--color-border)"],
];

export function DesignSystemPreview() {
  return (
    <main className="ds-page">
      <h1 className="ds-hero">Design system preview</h1>
      <p className="ds-note">
        Shared tokens and components only. This screen is not a product page.
      </p>

      <h2 className="ds-section-title">Color</h2>
      <div className="ds-row">
        {swatches.map(([name, color]) => (
          <div className="ds-swatch" key={name}>
            <span className="ds-swatch__chip" style={{ background: color }} />
            <span>{name}</span>
          </div>
        ))}
      </div>

      <h2 className="ds-section-title">Actions</h2>
      <div className="ds-row">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="text">Text</Button>
        <Button variant="destructive">Destructive</Button>
        <Button loading>Save</Button>
        <Button disabled>Disabled</Button>
        <IconButton label="Add">
          <span aria-hidden="true">+</span>
        </IconButton>
      </div>

      <h2 className="ds-section-title">Forms</h2>
      <div className="ds-grid">
        <TextField label="Item name" hint="Shown to passengers." />
        <TextField label="Search food" type="search" />
        <TextField label="Quantity" error="Enter a number." defaultValue="a" />
      </div>

      <h2 className="ds-section-title">Content</h2>
      <div className="ds-grid">
        <Card title="Card title">
          <p>A neutral surface for grouped information.</p>
        </Card>
        <FoodItemCard name="Sample item" priceLabel="Price label" availability="available" />
        <FoodItemCard name="Sample item" priceLabel="Price label" availability="unavailable" />
      </div>
      <div className="ds-row">
        <StatusBadge>Neutral</StatusBadge>
        <StatusBadge tone="success">Success</StatusBadge>
        <StatusBadge tone="warning">Warning</StatusBadge>
        <StatusBadge tone="error">Error</StatusBadge>
        <StatusBadge tone="info">Info</StatusBadge>
      </div>

      <h2 className="ds-section-title">Feedback</h2>
      <div className="ds-stack">
        <Alert tone="success">The example action succeeded.</Alert>
        <Alert>The example action failed.</Alert>
        <EmptyState title="Nothing here" message="There is no sample content to show." />
        <ErrorState title="Something went wrong" message="The example could not be loaded." />
        <hr className="ds-divider" />
      </div>
    </main>
  );
}
