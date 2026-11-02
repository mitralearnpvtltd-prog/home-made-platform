# Design System — Bus Food Delivery

**Status:** Approved visual baseline  
**Stage:** 4 — Design System Definition  
**Approval date:** 22 October 2026  
**Canonical tokens:** `apps/web/src/styles/tokens.css`  
**Component styles:** `apps/web/src/styles/global.css`

This document records the approved visual baseline. It does not approve optional product features, and it does not authorize a landing page or Stage 5 implementation.

Product requirements remain in `docs/PROJECT_SCOPE.md`. Technical architecture remains in `docs/PROJECT_ARCHITECTURE.md`. Those files were not changed by this work.

## 1. Implementation choices

- CSS custom properties are the only token source.
- Shared UI foundations are React components in `apps/web/src/components`.
- Tailwind CSS is not used.
- No component library is installed.
- Plus Jakarta Sans is loaded from Google Fonts in `apps/web/index.html`, with Segoe UI and sans-serif as fallbacks.
- `apps/web/src/DesignSystemPreview.tsx` shows the foundations. It is not a product page.

## 2. Color

Source brand values are unchanged. Semantic names describe their roles.

| Semantic token | Value | Source name |
|---|---|---|
| `--color-action` | `#FF4B2B` | Primary |
| `--color-action-tint` | `#FFE5E0` | Primary 500 |
| `--color-action-surface` | `#FFF6F5` | Primary 100 |
| `--color-text` | `#290600` | Text Primary |
| `--color-text-secondary` | `#AFA7A5` | Text Secondary |
| `--color-text-muted` | `#CAC5C5` | Text Light |
| `--color-icon` | `#AC9692` | Icon |
| `--color-border` | `#EAE7E6` | Stroke |
| `--color-surface-page` | `#F6F3F3` | Background |
| `--color-surface-card` | `#FFFFFF` | Card surface |
| `--color-on-action` | `#290600` | Text on the action color |

Primary 500 and Primary 100 in the source are light tints, not steps on a conventional 100–900 scale. The semantic names above are the names used in code.

Status colors are part of the approved visual baseline. They are not separate product requirements.

| Token | Value | Surface |
|---|---|---|
| `--color-status-success` | `#1F7A4D` | `#E8F6EE` |
| `--color-status-warning` | `#8A5A00` | `#FFF6E5` |
| `--color-status-error` | `#9F1239` | `#FDE8EE` |
| `--color-status-info` | `#2458A6` | `#E8F1FB` |
| `--color-on-destructive` | `#FFFFFF` | Used on the error color for destructive buttons |

## 3. Contrast

Calculated ratios for the approved pairs:

| Pair | Ratio | Use |
|---|---|---|
| `#290600` on `#F6F3F3` | 16.99:1 | Body text on the page |
| `#290600` on `#FF4B2B` | 5.62:1 | Primary button label |
| `#FFFFFF` on `#FF4B2B` | 3.34:1 | Not used for button text |
| `#AFA7A5` on `#F6F3F3` | 2.14:1 | Not used for important text |
| `#CAC5C5` on `#F6F3F3` | 1.55:1 | Decorative only |
| `#1F7A4D` on `#E8F6EE` | 4.77:1 | Success text |
| `#8A5A00` on `#FFF6E5` | 5.52:1 | Warning text |
| `#9F1239` on `#FDE8EE` | 6.85:1 | Error text |
| `#2458A6` on `#E8F1FB` | 6.09:1 | Info text |
| `#FFFFFF` on `#9F1239` | 8.02:1 | Destructive button label |

Important text uses `--color-text`. Status is never communicated by color alone. Status labels include words.

## 4. Typography

Font family: Plus Jakarta Sans.

| Token | Size | Use |
|---|---|---|
| `--text-hero` | `clamp(2rem, 5vw, 4rem)` | Preview title, 32–64px |
| `--text-section` | `clamp(1.75rem, 3vw, 2.25rem)` | Section heading, 28–36px |
| `--text-card` | `1.5rem` | Card heading, 24px |
| `--text-body` | `1.125rem` | Body, 18px |
| `--text-control` | `1rem` | Buttons, labels, inputs, 16px |
| `--text-caption` | `0.875rem` | Badges and hints, 14px |

Weights are 400, 500, 600, and 700. Hero line height is 1.1. Section line height is 1.2. Body line height is 1.5. Important instructions do not use 12px type.

## 5. Space, radius, shadow, and layout

Spacing tokens are 4, 8, 12, 16, 24, 32, and 48px. Control radius is 8px. Card radius is 12px. Raised cards use `--shadow-raised`. Page content width is 1120px, with 32px gutters. The preview grid becomes two columns at 768px. The approved breakpoint set is 360, 768, 1024, and 1280px. Touch targets are at least 44 by 44px. Focus uses a 2px solid `--color-text` ring. Button color transitions are 120ms and are removed when the user requests reduced motion.

## 6. Components

Implemented in `apps/web/src/components`:

| Component | States and notes |
|---|---|
| `Button` | Primary, secondary, outline, text, destructive, loading, and disabled |
| `IconButton` | Outline icon control with a required accessible name |
| `TextField` | Label, hint, error text, and `aria-invalid` |
| `Card` | Raised surface with optional title |
| `FoodItemCard` | Name, price label, and available or unavailable text |
| `StatusBadge` | Neutral, success, warning, error, and info, always with text |
| `Alert` | Success and error |
| `EmptyState` | Title and message |
| `ErrorState` | Title and message with `role="alert"` |

Search uses `TextField` with `type="search"`. A divider uses `hr.ds-divider`.

These product-specific patterns were not built, because they are not confirmed product requirements: discounts, ratings, dietary badges, phone login, date pickers, live journey tracking, payment breakdowns, and delivery-time estimates. Currency format and price rules remain open. The food card accepts a price label string and does not calculate a total.

## 7. Scope of this approval

The visual baseline is approved. Login, guest checkout, menus, order statuses, payment, notifications, and other open scope questions are not decided by this document. Do not start Stage 5 from this file alone.
