# Project Scope — Bus Food Delivery

**Status:** Approved  
**Approval date:** 22 October 2026  
**Approved by:** The authorized scope approver, authorized by the manager. No personal name is recorded.  
**Stage:** 1 — Project Scope Definition  
**Source:** Confirmed answers from project discussion, plus labelled proposals and open questions

This document does not invent unresolved business rules. **Confirmed** means a requirement already answered in this document. **Proposal** means a recommended default that is **not approved**. **Open** means no decision has been made. Unanswered items and proposed defaults are not confirmed requirements. Approval of this scope does not approve those proposals or resolve open decisions.

---

## 1. Purpose and success criteria

### Purpose

**Confirmed**
- Bus Food Delivery is a platform that lets bus passengers order food before boarding and during the journey, and receive it at a designated stop or delivery point.
- It exists to make it easier for passengers to get food while travelling by bus.
- This is intended to be a **real business**, not a student/demo project.

**Open**
- Launch city, real routes, and the commercial operating model beyond the statements above.

### Success for v1

**Confirmed**
- A passenger can place an order.
- The appropriate staff can manage and fulfil that order.

These success statements are true only at a high level. The passenger-place-order bullet is a confirmed, testable v1 outcome. The staff-fulfil bullet is a high-level goal, not a confirmed testable operating rule, until the open stop-identification, handover, assignment, and payment decisions are made.

**Placing an order** means the passenger submits a cart and an order record is created.

**Fulfilling an order** means staff process that order and the passenger receives the food at the designated stop or delivery point.

These are different. v1 can test placing an order from confirmed requirements. End-to-end fulfilment cannot be fully tested until the open fulfilment, payment, and stop-identification rules are decided.

---

## 2. Users and roles

**Confirmed roles**
- Passenger
- Restaurant staff
- Delivery staff
- Admin

**Confirmed access rule**
- Each role has access only to features relevant to that role.

That confirmed rule is incomplete until authorization details are reviewed. It does not approve login methods, delivery assignment, guest checkout, or the detailed permission bullets below.

The following are **proposals — require review, not approved**. They are not confirmed requirements:

- Restaurant staff, delivery staff, and admin must log in before using staff tools.
- Passengers may browse menus without an account.
- Passengers must log in to place an order, view order status, or cancel.
- A user has exactly one active role per login unless an admin later grants multiple roles.
- Restaurant staff can see and process only orders and menu availability for their own restaurant.
- Delivery staff can see only deliveries assigned to them, plus any unassigned ready orders if assignment-by-claim is approved.
- Admin can manage users, restaurants, menus, and orders across the system.
- Admin assigns staff accounts and roles. Staff cannot create admin accounts.
- A passenger cannot use restaurant, delivery, or admin features.
- Staff cannot place passenger orders from a staff account unless a later decision allows it.

**Open**
- Login method (email/password, phone/OTP, or other).
- Whether one person may hold more than one role.
- Whether guest checkout is allowed.
- Who assigns deliveries: admin, restaurant, delivery self-claim, or automatic assignment.

---

## 3. Confirmed v1 features

**Passenger**
- Browse food
- View item details
- Add to cart
- Place orders
- View order status
- Cancel eligible orders

**Restaurant staff**
- Manage authorized menu availability for their own restaurant
- Process incoming orders for their own restaurant
- Restaurant staff are not given admin-only work such as managing users, restaurants, full menus, or all orders. Who authors full menus remains unresolved.

**Delivery staff**
- View assigned deliveries (the assignment method is not confirmed)
- Update delivery status (allowed statuses are not confirmed)

**Admin**
- Manage users
- Manage restaurants
- Manage menus
- Manage orders

**Proposed feature bounds — require review, not approved**
These bounds are not confirmed:
- Admin creates and edits users, restaurants, and full menus.
- Restaurant staff toggle item availability and process orders for their own restaurant. Who authors full menus remains unresolved and is not decided by this document.
- One restaurant per order.
- When an order is ready, delivery staff can claim it, or admin can assign it. Automatic rider routing is not required.
- Login methods, the proposed order-status list, and platform/language choices in later sections are also unapproved unless explicitly marked confirmed.

---

## 4. Ordering time and cutoff

**Confirmed**
- Passengers can order **before boarding** and **during the journey**.
- Orders are limited by a **delivery cutoff**.

**Open**
- The cutoff rule itself is not decided.

**Proposed cutoff options — not approved**
- A: no orders in the last 20 minutes before the bus is due at the stop.
- B: each restaurant sets its own cutoff for each stop.

---

## 5. Workflow and business rules

**Confirmed**
- Food is received at a designated stop or delivery point.
- Passengers may order before boarding or during the journey, subject to cutoff.

The operating details below are **open**. Options are practical recommendations only. None of them is approved.

**Bus and stop identification — open**
- Option A: select route + stop name.
- Option B: enter bus number + stop.
- Option C: enter ticket/PNR.

**Food handover — open**
- Option A: delivery staff at the chosen stop.
- Option B: passenger pickup at the restaurant.
- Option C: handover on the bus.

**Restaurant selection — open**
- Option A: only restaurants linked to the selected route/stop.
- Option B: any restaurant.

**Late, early, or missed bus — open**
- Option A: restaurant or admin cancels; passenger sees cancelled.
- Option B: admin moves the order to another stop.
- Option C: automatic reroute (not recommended for v1).

**Cancellation — open**
- Confirmed: passengers can cancel eligible orders.
- Open: what “eligible” means, and who else can cancel.
- Option A: passenger can cancel only while status is `placed`. After that, restaurant or admin only.
- Option B: passenger can cancel until the order is `ready`.

**Payment and refunds — open**
- Option A: pay at handover (cash/UPI to staff).
- Option B: pay in the app before the kitchen starts.
- Option C: both.
- Refunds: either handled outside the app in v1, or in-app if later required.

**Pricing, taxes, fees, and totals — open**
- Who sets item prices.
- Whether taxes are included, added, or not handled in v1.
- Whether delivery fees exist, and who sets them.
- How the **final order total** is calculated and shown.
- What happens if a price changes while an item is in the cart.
- What happens if a price changes after an order is placed.

No pricing rule is approved.

**Proposed order statuses — not approved**
- placed
- accepted
- preparing
- ready
- out for delivery
- delivered
- cancelled
- Open: whether restaurant rejection needs a separate `rejected` status, or is recorded as `cancelled`.

---

## 6. Failure cases and exception paths

These cases can happen in a real food-delivery business. **The required handling is not decided.** They are in scope as situations the product must eventually account for, but the business rule for each remains **open**.

| Failure case | What it means | Status |
|---|---|---|
| Restaurant rejection | Restaurant cannot or will not fulfil a placed order. | Open. Need a visible outcome for passenger and staff. `rejected` vs `cancelled` is not decided. |
| Unavailable food | An item is shown, then becomes unavailable before or after the order is placed. | Open. Need whether the item is hidden, blocked at checkout, or removed after the restaurant updates availability. |
| Failed delivery | Delivery staff cannot complete handover at the designated point. | Open. Need who marks it failed and what the passenger sees. |
| Duplicate orders | The same passenger submits the same or similar order more than once. | Open. Need whether the system warns, blocks, or allows duplicates. |
| Payment disputes | Passenger and staff disagree about whether payment was made, or a refund is claimed. | Open. Need whether v1 records payment, supports refunds, or handles disputes outside the app. |
| Cutoff reached | Passenger tries to order after the cutoff. | Confirmed that a cutoff exists. Open: the exact rule and the message shown. |
| Incorrect bus/stop | Passenger orders for the wrong trip or stop. | Open. Need whether the passenger can edit the stop, or must cancel and reorder. |
| Missed or late bus | Bus does not arrive as expected. | Open. See missed-bus options above. |
| Unauthorized access | A user tries to use another role’s tools or another restaurant’s orders. | Confirmed that roles are separated. Proposed detailed authorization still requires review. |
| Connection loss | A user loses internet while browsing, placing, or updating an order. | Open. Need what is saved, retried, or shown as failed. |

No handling option above is approved.

---

## 7. Platform, language, region, and constraints

**Proposed defaults — not approved**
- Platform: one responsive website for passenger, restaurant, delivery, and admin.
- Language: English only in v1.
- First data: a small sample set of routes, stops, and restaurants, unless a real city/routes list is provided.

**Confirmed**
- Project deadline is unknown.

**Open**
- Required technology stack, if any. Stack selection belongs in Stage 2 after scope approval, unless a stack is already required.
- Intended city or real routes.
- Legal, tax, food-safety, and privacy rules.
- Brand or design rules.
- Notification methods for v1, if any (in-app, SMS, WhatsApp, email, or none).

**Proposed out of scope for v1 — not approved**
- Native iOS/Android apps
- Live bus GPS tracking
- Seat-level or on-bus cabin delivery, unless handover-on-bus is chosen
- Ticket/PNR verification, unless that identification method is chosen
- Multi-restaurant checkout
- Coupons, loyalty, ratings, and reviews
- In-app chat, SMS, WhatsApp, or email notifications
- Payment gateway, unless in-app payment is chosen
- Automated refunds, unless required
- Multiple languages
- Automatic stop rerouting

---

## 8. Dependencies

Needed before implementation. Not decided unless marked confirmed.

- Explicit approval of this scope — **Confirmed.** Approved on 22 October 2026 by the authorized scope approver.
- Bus/stop identification method
- Handover method
- Restaurant selection rule
- Cutoff rule
- Missed-bus rule
- Cancellation eligibility
- Payment, refund, and dispute approach
- Pricing, taxes, delivery fees, final order totals, and price-change rules
- Rules for restaurant rejection, unavailable food, failed delivery, and duplicate orders
- Notification methods
- City vs sample route data
- Login and staff-authorization model
- Privacy and data-protection constraints, if any
- Technology stack (Stage 2, unless already required)

---

## 9. Risks

**Scope and approval risks**
- Several fulfilment rules are still open. Without them, the product cannot be implemented as a complete real-business flow.
- Treating proposed defaults as approved would invent business requirements, which the protocol forbids.
- Deadline is unknown, so v1 size cannot be checked against a date.

**Privacy risk**
- This is intended to be a real business, so it may store names, phone numbers, order history, route/stop data, and payment-related information.
- No privacy, retention, or consent rule is confirmed.
- If staff authorization stays vague, one role may see another restaurant’s or passenger’s data.

**Unreliable internet risk**
- Passengers and staff may use the product on moving buses, at stops, or in kitchens with weak signal.
- Orders, status updates, or payment confirmation could be submitted twice, not submitted, or shown as successful when they failed.
- No offline or retry rule is confirmed.

**Incorrect bus/stop selection risk**
- If identification is easy to get wrong, food may go to the wrong stop or the wrong trip.
- The identification method is still open, so this risk cannot yet be designed away.

**Payment risks**
- This is a real business, but payment, refunds, dispute handling, and pricing/totals are still open.
- Pay-at-handover can cause unpaid food or cash disagreements.
- In-app payment needs refund and failure rules that do not exist yet.
- Duplicate orders plus unclear payment rules increase the chance of double charging or unpaid fulfilled orders.

**Other operational risks**
- Login is undecided, so access control cannot be finalized.
- Restaurant rejection and unavailable items can leave passengers with a placed order that cannot be fulfilled.
- Failed delivery has no confirmed outcome, so staff may leave orders stuck in a proposed status such as `out for delivery`. That status list is not approved.

---

## 10. Contradictions, missing sections, and untestable requirements

**Contradictions or tensions**
- The product is a **real business**, but payment, refunds, disputes, legal, and privacy rules are still open. Those cannot be treated as ready for launch.
- Success still says staff should “manage and fulfil” orders, but fulfilment is not fully testable yet. Placing an order is confirmed; fulfilling it is not a complete test until the open rules are decided.
- Passengers can cancel **eligible** orders, but eligibility is undefined. The feature is confirmed; the rule is not.
- A **designated stop or delivery point** is confirmed, but how the passenger identifies bus and stop is open.
- Delivery staff can view **assigned** deliveries, but assignment is only a proposal.
- Restaurant staff manage authorized menu availability and incoming orders for their own restaurant. Admin manage users, restaurants, menus, and orders. Who authors full menus is not decided.
- A **cutoff exists**, but the cutoff rule is not decided, so cutoff behavior cannot be tested yet.
- Passengers can place orders, but pricing, taxes, fees, and totals are open, so a correct bill cannot be tested yet.
- Order statuses are only a proposal, so status-based tests are not confirmed requirements.

**Missing scope sections**
The protocol asks Stage 1 to cover purpose, users, roles, features, workflows, business rules, dependencies, risks, constraints, and acceptance criteria. Those headings are present, but these topics are still missing as decided content:

- Notification methods (in-app, SMS, WhatsApp, email, or none)
- Hours of operation
- Item customization (size, spice, add-ons)
- Inventory vs simple availability toggle
- Data the system stores and how long it is kept
- Customer support / dispute process
- Pricing, taxes, delivery fees, final totals, and who sets prices
- Brand, visual identity, and accessibility targets (Stage 4, unless a brand rule is given now)

**Requirements that cannot yet be tested**

| Confirmed or intended behavior | Why it cannot be tested yet |
|---|---|
| Cancel eligible orders | “Eligible” is undefined. |
| Receive food at a designated stop | Bus/stop identification and handover are open. |
| Fulfil an order end to end | Handover, assignment, missed-bus, and payment rules are open. |
| Delivery cutoff | Cutoff rule is open. |
| Role-only access in detail | Detailed staff authorization is still a proposal. |
| Restaurant rejection | No approved outcome. |
| Unavailable food | No approved blocking or update rule. |
| Failed delivery | No approved status or next step. |
| Duplicate orders | No approved prevention or allowance rule. |
| Payment disputes | Payment and refund methods are open. |
| Correct payable amount | Pricing, taxes, delivery fees, totals, and price-change rules are open. |
| English-only UI | Language is a proposal, not confirmed. |
| Website-only v1 | Platform is a proposal, not confirmed. |

---

## 11. Acceptance criteria

**Placing an order** means the passenger submits a cart and an order record is created.

**Fulfilling an order** means staff process that order and the passenger receives the food at the designated stop or delivery point.

These are different. v1 can test placing an order from confirmed requirements. End-to-end fulfilment cannot be fully tested until the open fulfilment, payment, and stop-identification rules are decided.

### A. Testable now from confirmed requirements

1. A passenger can browse food and open item details.
2. A passenger can add items to a cart.
3. A passenger can **place** an order before boarding and during the journey. This checks that an order record can be created in both ordering windows. It does not require a decided bus/stop identification method, cutoff rule, or payable-total rule, and it does not mean food was delivered.
4. A passenger can view the status of an order they placed, using whatever statuses are later approved. The status list itself remains a proposal.
5. Restaurant staff can update authorized menu availability for their own restaurant.
6. Restaurant staff can process incoming orders for their own restaurant. This checks that staff can act on an incoming order. It does not define which processing actions exist and does not mean delivery is complete.
7. Delivery staff can view deliveries assigned to them. This does not confirm who assigns deliveries.
8. Delivery staff can update delivery status, using whatever statuses are later approved. Allowed statuses are not confirmed.
9. Admin can manage users, restaurants, menus, and orders according to assigned admin permissions. This does not decide who authors full menus beyond the confirmed admin “manage menus” feature.
10. A user in one confirmed role cannot use another role’s main features, at a basic level. Detailed data isolation remains dependent on unresolved authorization rules in group B.

### B. Confirmed features that are not fully testable until a business rule is decided

| Acceptance criterion | Depends on this unresolved rule |
|---|---|
| An order is **fulfilled** (food received at the designated stop or delivery point) | Bus/stop identification, handover method, assignment, missed-bus rule, and payment rule |
| Passenger can cancel an eligible order | Cancellation eligibility and who else may cancel |
| Order cannot be placed after cutoff | Exact cutoff rule |
| Each role sees only its relevant data, including other restaurants’ orders | Detailed staff-authorization proposal |
| Menu availability changes affect ordering | What happens if food becomes unavailable after it was shown or ordered |
| Placed order shows a correct payable amount | Pricing, taxes, delivery fees, final totals, and price-change rules |

### C. Criteria that exist only as proposals or open questions

These are **not** confirmed acceptance criteria:

- Passenger must log in to order, track, or cancel.
- One restaurant per order.
- Only restaurants linked to a route/stop are shown.
- Delivery staff claim ready orders.
- Payment is collected at handover or in app.
- Order follows the proposed status list.
- v1 is a responsive English-only website.
- Restaurant rejection, unavailable food, failed delivery, duplicate orders, or payment disputes are handled in a specific way.
- Taxes, delivery fees, or notifications work in a specific way.

Do not treat section C as approved test requirements.

---

## 12. Launch-readiness considerations

**Confirmed:** this product is intended to be a real business.

**Not confirmed:** that v1 is ready to launch as a real business.

Passing the software acceptance criteria in this approved scope is **not** launch approval. Real-business launch readiness requires **separate confirmation** of applicable:

- operational requirements
- privacy requirements
- payment requirements
- food-safety requirements
- legal requirements

Those requirements are **open**. This document does not define them.

Calling this a real business does not mean it is legally or operationally ready to launch.

This scope was explicitly approved on 22 October 2026 by the authorized scope approver. Unknown real-business rules stay **open**. Proposed defaults and proposed authorization rules require review. They are not approved business decisions.

---

## 13. Remaining decisions

These business decisions remain unresolved. Approval of this scope does not decide them. They still block a complete operating model and full end-to-end testing:

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
11. What notification methods are in v1, if any (in-app, SMS, WhatsApp, email, or none)?
12. Real city/routes or sample data?
13. Which operational, privacy, payment, food-safety, and legal requirements must be confirmed before real-business launch?
14. Who can approve this scope? Recorded: the authorized scope approver is the person who explicitly approved this document on 22 October 2026, as authorized by the manager. No personal name is recorded.
