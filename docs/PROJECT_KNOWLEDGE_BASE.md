# Project Knowledge Base — Bus Food Delivery

**Status:** Draft for review — not approved  
**Stage:** 3 — Project Constitution and Knowledge Base  
**Prepared:** 22 October 2026  
**Product source:** `docs/PROJECT_SCOPE.md` (Approved, 22 October 2026)  
**Architecture source:** `docs/PROJECT_ARCHITECTURE.md` was not modified. The user approved that document and the technical decisions listed in section 16 on 22 October 2026. The file’s own status line was left unchanged.

Saving this draft is not approval of the Knowledge Base or the Constitution.

This file records confirmed decisions, proposals, assumptions, open questions, and out-of-scope items. It does not replace the approved scope and does not decide any open business rule.

Labels used below:

- **CONFIRMED** — explicitly approved.
- **PROPOSED** — a recommendation or default that is not approved.
- **ASSUMPTION** — a working interpretation that is not a decision.
- **OPEN QUESTION** — no decision has been made.
- **OUT OF SCOPE** — explicitly excluded. The scope’s proposed exclusion list is not yet **OUT OF SCOPE**.

---

## 1. Product vision

**CONFIRMED.** Bus Food Delivery lets bus passengers order food before boarding and during the journey, and receive it at a designated stop or delivery point. It is intended to be a real business. Full wording is in `docs/PROJECT_SCOPE.md`, section 1.

**OPEN QUESTION.** Launch city, real routes, and the commercial operating model beyond that statement.

## 2. Target users and user personas

**CONFIRMED roles:** passenger, restaurant staff, delivery staff, and admin. Each role may use only the features relevant to that role. The detailed permission bullets in scope section 2 are **PROPOSED**, not confirmed.

**ASSUMPTION.** “Restaurant staff” is the confirmed restaurant-side role. The master instructions also say “vendor.” That word does not create a homemade-provider role or a self-registration flow.

No personal names or personas have been approved.

## 3. Primary user problems

**CONFIRMED.** The product exists to make it easier for passengers to get food while travelling by bus.

**OPEN QUESTION.** Hours of operation, item customization, and customer-support process are not decided.

## 4. Business model

**CONFIRMED.** This is intended to be a real business, not a student or demo project.

**OPEN QUESTION.** Pricing, taxes, delivery fees, totals, payment, refunds, commissions, and who sets prices. No pricing rule is approved.

**CONFIRMED limitation.** Calling it a real business does not mean it is legally or operationally ready to launch. Privacy, payment, food-safety, and legal requirements remain open. Scope section 12.

## 5. MVP scope

**CONFIRMED high-level outcome.** A passenger can place an order. Placing an order means the passenger submits a cart and an order record is created.

**CONFIRMED high-level goal, not a finished test.** Appropriate staff can manage and fulfil that order. Fulfilment means the passenger receives the food at the designated stop or delivery point. End-to-end fulfilment cannot be fully tested until identification, handover, assignment, and payment decisions are made.

**CONFIRMED v1 features.**

- Passenger: browse food, view item details, add to cart, place orders, view order status, cancel eligible orders.
- Restaurant staff: manage authorized menu availability for their own restaurant, and process incoming orders for their own restaurant. They are not given admin-only user, restaurant, full-menu, or all-order administration.
- Delivery staff: view assigned deliveries, and update delivery status. Assignment method and allowed statuses are not confirmed.
- Admin: manage users, restaurants, menus, and orders.

**PROPOSED feature bounds, not confirmed.** Admin creates and edits users, restaurants, and full menus. One restaurant per order. Delivery staff claim a ready order, or admin assigns it. Who authors full menus remains unresolved.

## 6. Confirmed features

The confirmed feature list is section 5 of this knowledge base and scope section 3. Approval of the scope did not approve the proposals or open questions inside that document.

## 7. Out-of-scope features

**PROPOSED, not approved as OUT OF SCOPE.** Native iOS and Android apps, live bus GPS, seat-level or cabin delivery unless handover-on-bus is chosen, ticket or PNR verification unless that identification method is chosen, multi-restaurant checkout, coupons, loyalty, ratings, reviews, in-app chat, SMS, WhatsApp, or email notifications, a payment gateway unless in-app payment is chosen, automated refunds unless required, multiple languages, and automatic stop rerouting.

Do not treat this list as a confirmed exclusion.

## 8. User journeys

**CONFIRMED.** Passengers can order before boarding and during the journey, subject to a delivery cutoff. Food is received at a designated stop or delivery point.

**OPEN QUESTION.** How the passenger identifies the bus and stop. How handover happens. Which restaurants are shown. What happens if the bus is late or missed. When an order is eligible for cancellation and who else may cancel.

Practical options in scope section 5 are recommendations only. None is approved.

## 9. Order lifecycle

**CONFIRMED.** An order record is created when the passenger places an order. A cutoff exists. The cutoff rule is not decided.

**PROPOSED, not approved.** Both status lists below are unapproved. They also disagree with each other.

- Scope proposal: `placed`, `accepted`, `preparing`, `ready`, `out for delivery`, `delivered`, `cancelled`. Whether rejection is `rejected` or `cancelled` is open.
- Architecture proposal: Pending, Accepted, Rejected, Preparing, Ready for handover, Out for delivery, Completed, Cancelled.

**OPEN QUESTION.** Restaurant rejection, unavailable food, failed delivery, duplicate orders, payment disputes, cutoff messaging, incorrect bus or stop, missed bus, and connection loss. Scope section 6. No handling option is approved.

## 10. Vendor onboarding

**OPEN QUESTION.** Homemade food providers, vendor or restaurant self-registration, onboarding, approval workflows, and verification documents are not confirmed.

**CONFIRMED boundary.** Restaurant staff do not manage users, restaurants, full menus, or all orders. Who authors full menus is unresolved.

## 11. Bus and delivery operations

**CONFIRMED.** Delivery staff can view assigned deliveries and update delivery status, within the limits in section 5.

**OPEN QUESTION.** Bus and stop identification, handover location and actor, delivery assignment, route and trip data source, and real city data versus sample data.

**PROPOSED.** Routes, stops, trips, and operators are candidate architecture domains, not an approved schema.

## 12. Food listing and availability rules

**CONFIRMED.** Restaurant staff manage authorized menu availability for their own restaurant. Passengers can browse food and view item details.

**OPEN QUESTION.** Who authors full menus, categories, prices, and images. What happens when an item becomes unavailable before or after ordering. Inventory versus a simple availability toggle.

## 13. Payment and refund policies

**OPEN QUESTION.** Pay at handover, pay in the app, both, or another method. Refunds in or outside the app. Disputes. Taxes, delivery fees, final totals, and price changes before or after an order is placed.

No payment provider is selected. Payment webhooks are not authorized.

## 14. Notification requirements

**OPEN QUESTION.** In-app, SMS, WhatsApp, email, none, or another method.

**PROPOSED exclusion, not confirmed.** The scope lists in-app chat, SMS, WhatsApp, and email as proposed out of scope for v1.

## 15. Brand guidelines

**PROPOSED.** The master instructions contain brand tokens, including Plus Jakarta Sans and primary color `#FF4B2B`. They are input for Stage 4. They are not an approved design system.

`docs/DESIGN_SYSTEM.md` is a design-system task prompt, not an approved design system. Stage 4 has not started.

## 16. Technical architecture

**CONFIRMED by the user on 22 October 2026.**

- React + TypeScript + Vite for the frontend.
- Express + TypeScript as the only business API.
- Supabase PostgreSQL, Supabase Auth, and Row Level Security.
- A modular monolith.
- The proposed repository layout adapted to this `bus-food-delivery` repository.
- The manager’s documentation plan, with each document prepared at its designated stage.

These decisions do not authorize scaffolding, package installation, migrations, deployment, or Stage 5 implementation.

**Not confirmed by that decision.** Tailwind CSS, Vercel, a specific Node.js host, Next.js as an application, Supabase Storage access rules, maps, payment providers, notification providers, background jobs, and a monitoring product.

`docs/PROJECT_ARCHITECTURE.md` remains the architecture document and was not edited. Its internal status line was not changed. Proposals and open questions inside it stay proposals and open questions.

**PROPOSED repository layout, not yet created.**

```text
bus-food-delivery/
├── apps/
│   ├── web/
│   └── api/
├── supabase/
│   ├── migrations/
│   └── tests/
├── docs/
├── .env.example
├── .gitignore
└── README.md
```

## 17. Integrations

**CONFIRMED platform services for the approved architecture.** Supabase PostgreSQL, Supabase Auth, and Row Level Security.

**PROPOSED or conditional.** Supabase Storage, maps, payment gateways, and email, SMS, or push notifications. Use one only after the related product decision is approved.

**ASSUMPTION.** No third-party service is already contracted. The repository contains no Supabase project and no credentials.

## 18. Compliance and operational constraints

**OPEN QUESTION.** Privacy, data retention, consent, food safety, tax, and other legal requirements. Deadline is unknown.

**CONFIRMED.** Launch readiness is separate from scope approval and from acceptance criteria.

## 19. Open questions

These remain unresolved. Scope approval and architecture approval did not decide them.

1. How does a passenger identify the bus and delivery stop?
2. Who hands over the food, and where?
3. Which restaurants can a passenger order from?
4. What is the cutoff rule?
5. What happens if the bus is late or misses the stop?
6. When can an order be cancelled, and by whom?
7. How do payment, refunds, and payment disputes work in v1?
8. How should restaurant rejection, unavailable food, failed delivery, and duplicate orders be handled?
9. Which staff-authorization and login proposal is accepted?
10. How are prices, taxes, delivery fees, final order totals, and price changes handled?
11. What notification methods are in v1, if any?
12. Real city and routes, or sample data?
13. Which operational, privacy, payment, food-safety, and legal requirements must be confirmed before a real-business launch?
14. Are the proposed status lists, proposed feature bounds, and proposed v1 exclusions accepted?
15. Is the authorized scope approver also authorized to approve the Constitution, Knowledge Base, Design System, and later stages?

## 20. Assumptions

- **ASSUMPTION.** The repository is a documentation workspace. There is no application to preserve. Local branch `master` had no remote listed when inspected on 22 October 2026.
- **ASSUMPTION.** Restaurant staff are the confirmed food-provider operators unless a later decision adds homemade providers.
- **ASSUMPTION.** One Express API should own order, price, role, and status rules so those rules are not duplicated in the browser.
- **ASSUMPTION.** The service-role key must not be used for ordinary browser or request handling.

Assumptions are not approved decisions.

## 21. Decisions and decision dates

| Date | Decision | Status |
|---|---|---|
| 22 October 2026 | `docs/PROJECT_SCOPE.md` approved by the authorized scope approver. Open business rules inside it remain open. | CONFIRMED |
| 22 October 2026 | Architecture decisions in section 16 approved by the user. The architecture file was not edited. | CONFIRMED |
| 22 October 2026 | The PROJECT CONSTITUTION & ARCHITECTURE SETUP master instructions are the guiding workflow and technical planning reference. They do not approve every proposal inside them. | CONFIRMED as a reference |
| 22 October 2026 | This Knowledge Base and `docs/PROJECT_CONSTITUTION.md` prepared as Stage 3 drafts. | Not approved |

## 22. Future roadmap

**OPEN QUESTION.** No roadmap beyond the confirmed v1 features and the unresolved decisions has been approved.

Stage 4, Design System Definition, has not started. Stage 5, Section-wise Implementation, must not start until Stages 1, 2, 3, and 4 have each been explicitly approved. This draft does not supply that approval.

---

If this knowledge base conflicts with `docs/PROJECT_SCOPE.md`, the approved scope takes precedence for product requirements. Do not silently choose between them. Ask which requirement takes precedence.
