# Project Constitution — Bus Food Delivery

**Status:** Draft for review — not approved  
**Stage:** 3 — Project Constitution and Knowledge Base  
**Prepared:** 22 October 2026

Saving this draft is not approval of the Constitution or the Knowledge Base.

This draft records engineering rules for later implementation. It does not authorize application code, a landing page, design-system implementation, package installation, database migrations, deployment, or Git pushes.

## 1. Authority

Use these sources in this order:

1. **CONFIRMED product requirements.** `docs/PROJECT_SCOPE.md`, approved on 22 October 2026. Open questions and proposals inside that file remain unresolved.
2. **CONFIRMED technical decisions.** The user approved these on 22 October 2026: React + TypeScript + Vite; Express + TypeScript as the only business API; Supabase PostgreSQL, Supabase Auth, and Row Level Security; a modular monolith; the repository layout adapted to this `bus-food-delivery` repository; and the manager’s documentation plan, with each document prepared at its designated stage. `docs/PROJECT_ARCHITECTURE.md` was not edited, and its internal status line was not changed.
3. **Guiding reference.** The PROJECT CONSTITUTION & ARCHITECTURE SETUP master instructions are the guiding project workflow and technical planning reference. They are preserved verbatim in the Appendix. Approval of that reference does not approve every proposed feature or technical choice inside it.
4. **This draft.** `docs/PROJECT_CONSTITUTION.md` and `docs/PROJECT_KNOWLEDGE_BASE.md` are drafts for review.

Labels: **CONFIRMED**, **PROPOSED**, **ASSUMPTION**, **OPEN QUESTION**, and **OUT OF SCOPE**.

If two documents conflict, identify the conflict and ask which requirement takes precedence. Do not silently choose. For product requirements, the approved scope takes precedence over this draft.

## 2. Product principles

- Build for the confirmed passenger, restaurant-staff, delivery-staff, and admin workflows.
- The master instructions use the word “vendor.” **ASSUMPTION:** that word does not add a homemade-provider role. Homemade providers, self-registration, onboarding, and verification documents are **OPEN QUESTION**.
- Prioritize confirmed v1 behavior over speculative features.
- Placing an order and fulfilling an order are different. Only placing an order is a confirmed testable outcome today.
- A delivery cutoff is **CONFIRMED**. The cutoff rule is an **OPEN QUESTION**. Do not hardcode a cutoff.
- Mobile-first responsive website, English-only v1, and the proposed exclusion list are **PROPOSED** in the scope. Do not treat them as confirmed.
- Food safety, privacy, payment, and legal launch rules are **OPEN QUESTION**. Investigate them. Do not invent them.
- Document assumptions and unresolved decisions. Do not present a proposal as a confirmed requirement.

## 3. Engineering principles

- Use TypeScript for application code wherever supported, when implementation is later approved.
- Keep the confirmed target structure understandable: `apps/web`, `apps/api`, and `supabase/` inside this repository. Do not create that structure until implementation is approved.
- Separate presentation, business logic, data access, and integration code.
- Express is the only owner of business API operations. Do not add Next.js as a second backend unless a later approved requirement needs server rendering or SEO, and do not implement the same business operation in both.
- The frontend must not enforce sensitive business rules or grant access to protected records.
- Do not duplicate order, price, role, or status logic between the browser and the server.
- Avoid unnecessary abstractions, premature microservices, and extra infrastructure.
- Do not introduce a dependency without a stated reason and explicit approval.
- Prefer small, reviewable changes.
- Tailwind CSS, Vercel, a specific Node.js host, Supabase Storage rules, maps, payment providers, notification providers, background jobs, and a monitoring product are **PROPOSED** or conditional. They were not part of the confirmed architecture decision list.

## 4. Product scope protection

- Do not invent features, database tables, APIs, integrations, or UI features without a confirmed requirement.
- Do not build the whole platform in one change.
- Do not add payments, subscriptions, commissions, wallets, coupons, loyalty, ratings, or reviews without approval. The payment model is an **OPEN QUESTION**.
- Do not assume the platform owns food inventory or a delivery fleet.
- Delivery staff are a **CONFIRMED** role. Who hands over the food, where, and who assigns deliveries are **OPEN QUESTION**. Do not assume bus staff, vendors, third-party partners, or independent riders.
- Do not assume every shown food item can be sold. Unavailable-item handling is an **OPEN QUESTION**.
- Do not hardcode an open business rule without labeling it as unresolved.
- The proposed v1 exclusion list remains **PROPOSED**. It is not a confirmed **OUT OF SCOPE** list.

## 5. Design system compliance

Stage 4 has not been approved. `docs/DESIGN_SYSTEM.md` is a task prompt, not an approved design system. Do not implement it in this stage.

- Brand tokens in the Appendix, including Plus Jakarta Sans and `#FF4B2B`, are **PROPOSED** input for Stage 4.
- After a design system is approved, centralize tokens and use consistent spacing, typography, and component states.
- Do not introduce arbitrary colors, fonts, or a second design system after approval.
- Do not sacrifice readability or accessibility to match a color exactly.
- Do not install a UI component library without approval when it materially affects the architecture.

## 6. Data and security

- Never expose the Supabase service-role key, private API keys, payment secrets, or other privileged credentials to the browser.
- Never commit `.env` files that contain real secrets. `.env.example` may contain names and safe placeholders only, and only when that file is approved for creation.
- The browser may use Supabase Auth with the publishable key for identity. Ordinary business reads and writes go through Express.
- Express verifies the token and uses application-owned role and membership records. Supabase Auth user metadata alone is not the authorization source.
- Apply Row Level Security to tables that the client can reach. Do not disable Row Level Security to make a feature work.
- If server code uses the service role, enforce authorization before reading or changing protected data. The service role is not the normal request path.
- Treat client input as untrusted. Validate it on the server.
- Never trust a client-supplied price, discount, payment status, role, or order ownership claim.
- A hidden control or disabled button is not a security control.
- Restaurant staff access stays within their own restaurant for availability and incoming orders. Detailed login, guest checkout, and multi-role rules remain **PROPOSED** or **OPEN QUESTION**, as written in the scope.
- Do not expose another passenger’s, restaurant’s, or order’s private data.
- Avoid collecting personal information that no approved rule requires. Retention and consent are **OPEN QUESTION**.
- Never log passwords, access tokens, payment credentials, or sensitive personal information.
- Public storage buckets and verification-document uploads are not approved.

## 7. Database rules

- PostgreSQL in Supabase is the authoritative store for persistent business data.
- Use version-controlled migrations for schema changes. Do not make undocumented manual production changes.
- Use primary keys, foreign keys, constraints, and indexes appropriate to the approved workflow.
- Use transactions where related writes must succeed or fail together.
- Design order creation so retries and duplicate submissions cannot corrupt data. This engineering safeguard does not decide the open business rule for duplicate orders.
- The server validates items, prices, availability, and delivery eligibility when those rules exist. The browser must not be the source of the order total.
- Do not create tables before the relevant workflow and ownership rules are understood.
- Candidate domains for routes, payments, refunds, notifications, support, and audit records are not an approved schema.
- Do not run a destructive migration without explicit approval.
- Data retention and deletion rules are **OPEN QUESTION**.

## 8. API and business logic

- Express owns every business operation. Do not create a second implementation in Next.js or in the frontend.
- The approved architecture document specifies REST over HTTPS. Endpoint names in that document are naming proposals, not implemented routes.
- Define the contract before implementing a module.
- Validate path parameters, query parameters, and request bodies.
- Apply authentication and authorization on protected endpoints.
- Use consistent status codes and predictable error responses. Do not return secrets or stack traces.
- Use pagination for growing collections. Add filtering and sorting only where a requirement needs them.
- Use idempotency or an equivalent safeguard for order creation. Apply the same safeguard to payment operations only if payment is later approved.
- Keep payment verification and webhook signature checks on the server. Do not implement them while payment is an **OPEN QUESTION**.
- Never let the frontend declare an order paid.
- Document status transitions only after a status list is approved. Neither proposed status list is approved.
- Rate limiting is an engineering control to apply where a protected or public endpoint needs it. It does not decide a product rule.

## 9. Development discipline

- Inspect the repository and read the relevant documents before editing.
- Explain substantial changes and wait for approval before making them.
- Do not overwrite working behavior without a reason. There is no application code in this repository today.
- Do not claim that a command, test, migration, integration, or deployment succeeded unless its result was verified.
- Package installation, destructive operations, deployment, and pushing changes require explicit approval.
- Safe, non-destructive checks may be run within an approved task.
- One approved section at a time. Do not start Stage 5 until Stages 1, 2, 3, and 4 have each been explicitly approved.
- Stage 1, the scope, is approved. Stage 2 architecture decisions are approved by the user, with the architecture file left unchanged. This Stage 3 draft is not approved. Stage 4 has not started.
- After implementation work in a later approved stage, report changed files, actual test results, failures, limitations, and remaining tasks.

## 10. Documentation map

Do not create duplicate documents.

| Subject | Where it lives now | Later home |
|---|---|---|
| Product requirements | `docs/PROJECT_SCOPE.md` | Unchanged approved scope |
| Architecture | `docs/PROJECT_ARCHITECTURE.md` | Unchanged in this stage |
| Engineering rules | This draft | Remains the constitution after approval |
| Decision index | `docs/PROJECT_KNOWLEDGE_BASE.md` | Remains the knowledge base after approval |
| Database plan detail | Rules in section 7 | Separate database plan only if a later approved stage needs more detail than this constitution and the architecture document |
| Security plan detail | Rules in section 6 | Separate security plan only if a later approved stage needs more detail |
| API conventions detail | Rules in section 8 | Separate API standards only if a later approved stage needs more detail |
| Local Git and migration workflow | Not written | A development-workflow document only when that Stage 3 companion is explicitly requested. `.cursor/rules/project-workflow.md` remains the stage protocol |
| Design system | `docs/DESIGN_SYSTEM.md` is a task prompt | Stage 4 |
| Master instructions | Appendix of this file | Guiding reference |

`docs/IMPLEMENTATION_PLAN.md` is a section-wise task prompt. It is not an approved plan, and its statements that the architecture and design system are approved are incorrect.

## 11. Approval state

This constitution is a draft for review. It is not approved.

The Knowledge Base is a draft for review. It is not approved.

Unresolved business decisions in the approved scope remain unresolved.

---

# Appendix: PROJECT CONSTITUTION & ARCHITECTURE SETUP

The following text is preserved verbatim. It is the approved guiding project workflow and technical planning reference. Approval of this reference does not approve every proposed feature or technical choice inside it.

---
# **PROJECT CONSTITUTION & ARCHITECTURE SETUP**

## **Food Delivery Platform for Bus Passengers**

You are acting as my Principal Software Architect, Senior Full-Stack Engineer, Product Engineering Lead, and Technical Documentation Owner.

Your responsibility is to establish a reliable, scalable, secure, maintainable foundation for a food delivery platform designed primarily for bus passengers.

This is an initial project setup task, NOT a request to build the entire application.

You must first understand the project, inspect the existing repository, establish the architecture, document the technical standards, identify missing decisions, and ask me the questions required to proceed.

Do not start implementing the entire product.

---

# **1. CORE OPERATING PRINCIPLE**

Work incrementally and deliberately.

Follow this sequence:

1. Inspect the current repository and development environment.
2. Understand the existing project before modifying anything.
3. Identify the current architecture, dependencies, entry points, and existing conventions.
4. Establish the project constitution and engineering rules.
5. Recommend and document the target architecture.
6. Identify architectural risks, ambiguities, and missing product decisions.
7. Create the initial project documentation.
8. Present your findings and ask me the necessary questions.
9. Wait for my answers and approval before proceeding to application implementation.

Do not generate large amounts of application code during this initial phase.

Do not build all pages, APIs, database tables, dashboards, authentication flows, or order workflows in one go.

Do not silently make major product or architecture decisions on my behalf.

You may make reasonable low-risk recommendations, but document assumptions and distinguish them from confirmed requirements.

If the repository already contains working code, preserve it. Do not replace the existing application with a new scaffold without approval.

---

# **2. PRODUCT CONTEXT**

We are building a food delivery platform for bus passengers.

The product is intended to help passengers discover and order food while travelling by bus.

The product may support the following capabilities in future phases:

- Food discovery and search.
- Food listings from home cooks, homemade food businesses, restaurants, and other approved vendors.
- Food availability by location and delivery window.
- Bus operator, route, boarding point, and destination information.
- Delivery coordination for passengers travelling on buses.
- Passenger registration and authentication.
- Vendor registration and food management.
- Order placement and order tracking.
- Order management for vendors and operational teams.
- Delivery coordination and proof of delivery where appropriate.
- Payments, refunds, and order reconciliation.
- Notifications and order updates.
- Admin management, reporting, and operational monitoring.
- Responsive website experience across desktop, tablet, and mobile.

These are potential product capabilities, not approved requirements.

Do not implement every capability automatically.

During discovery, determine the MVP, primary customer, vendor model, delivery model, order lifecycle, payment approach, and operational constraints.

The website must be designed around real user needs and actual business workflows rather than assumptions.

---

# **3. TECHNICAL STACK**

My proposed technologies are:

## **Frontend**

- React
- TypeScript
- Vite
- Tailwind CSS

## **Backend**

- Next.js
- Express.js
- REST APIs
- Server-side business logic and request validation

## **Database**

- Supabase PostgreSQL

## **Authentication and Authorization**

- Supabase Auth
- Server-side authentication verification
- Role-based authorization
- PostgreSQL Row Level Security (RLS)

## **Integration**

- Supabase JavaScript client
- Maps and location APIs when required
- Payment gateway integrations when required
- Email, SMS, push, or other notification integrations when required

## **Security**

- Environment variables and secret management
- Server-side validation
- Authentication and authorization enforcement
- Database security policies
- API rate limiting
- Secure payment verification and webhook processing

## **Version Control**

- Git
- GitHub
- Development and main branches, subject to the agreed workflow
- Pull requests and code reviews where appropriate

## **Deployment**

- Vercel for suitable frontend or Next.js deployments
- Supabase for PostgreSQL and authentication
- A suitable hosting platform for any separate Express.js service, if required

Do not assume that every listed technology must become a separate running service.

---

# **4. ARCHITECTURE REVIEW IS MANDATORY**

Before creating the architecture, evaluate the proposed stack.

React + Vite, Next.js, and Express.js can overlap in their responsibilities.

Do not automatically create three separate applications.

Compare the following options:

Option A:

- React + Vite frontend.
- Express.js backend.
- Supabase PostgreSQL and Auth.

Option B:

- Next.js application with its frontend and server-side API capabilities.
- Supabase PostgreSQL and Auth.
- No separate Express.js service unless justified.

Option C:

- React + Vite frontend.
- Next.js or Express.js backend, with a clearly defined reason for retaining both if both are selected.
- Supabase PostgreSQL and Auth.

Evaluate:

- Development complexity.
- Deployment complexity.
- Authentication integration.
- API ownership.
- Server-side rendering and SEO requirements.
- Performance and scalability.
- Cost of hosting.
- Maintenance burden.
- Type safety and shared validation.
- Background jobs and scheduled processing.
- Operational monitoring.

Provide one recommended architecture and explain why it fits the actual product.

My initial preference is to avoid unnecessary services, duplicated business logic, and excessive infrastructure complexity.

However, do not discard a technology without explaining the trade-off and asking for approval.

Do not create duplicate API endpoints in Next.js and Express.js for the same business capability.

Every API and business operation must have one clearly defined owner.

Document which components can access Supabase directly and which operations must go through the backend.

Sensitive operations must never depend solely on frontend validation or frontend role checks.

---

# **5. PROJECT CONSTITUTION**

Create a document named:

PROJECT_[CONSTITUTION.md](http://CONSTITUTION.md)

It must establish the non-negotiable engineering rules for this project.

Include the following sections.

## **5.1 Product Principles**

- Build for real passenger and vendor workflows.
- Prioritize MVP functionality over speculative features.
- Keep the user experience simple and mobile-first.
- Design for reliability during order placement and status updates.
- Avoid premature complexity.
- Document assumptions and unresolved decisions.
- Treat food safety, delivery reliability, and operational clarity as product requirements to investigate.

## **5.2 Engineering Principles**

- TypeScript must be used for application code wherever supported.
- Use clear naming conventions and consistent folder structures.
- Keep components focused and reusable.
- Separate presentation, business logic, data access, and integration code.
- Avoid unnecessary abstractions and premature optimization.
- Do not introduce dependencies without a clear reason.
- Do not duplicate logic across the frontend and backend.
- Prefer small, reviewable changes.
- Keep implementation consistent with the documented architecture.

## **5.3 Product Scope Protection**

- Do not invent features that have not been approved.
- Do not build the complete product before the MVP is defined.
- Do not add payments, subscriptions, commissions, wallets, coupons, loyalty programs, or other commercial features without approval.
- Do not assume the platform owns the food inventory or delivery fleet.
- Do not assume delivery is performed by bus staff, vendors, third-party partners, or independent riders until confirmed.
- Do not assume all food listings are eligible for sale.
- Do not hardcode business rules that may change without documenting them.

## **5.4 Design System Compliance**

- The provided brand guideline is the design source of truth.
- Use the specified color palette and Plus Jakarta Sans.
- Use consistent spacing, radii, borders, typography, and component states.
- Use responsive layouts and accessible interactions.
- Do not introduce arbitrary colors, fonts, or unrelated design systems.
- Avoid unnecessary gradients, heavy shadows, visual clutter, and excessive animations.
- Do not sacrifice readability or accessibility to match a color exactly.
- Centralize design tokens rather than scattering raw color values throughout components.

## **5.5 Data and Security**

- Never expose service-role keys, private API keys, payment secrets, or other sensitive credentials to the browser.
- Never commit .env files containing real secrets.
- Maintain .env.example with variable names and safe placeholder values only.
- Enforce authorization on the server and database where applicable.
- Use least-privilege access.
- Treat client input as untrusted.
- Validate all externally supplied data.
- Apply RLS to tables containing protected application data.
- Never assume that a hidden UI element or disabled button is a security control.
- Never bypass authorization to make a feature work.
- Never disable RLS as a shortcut.
- Do not trust a user-supplied price, discount, payment status, role, or order ownership claim.
- Do not expose private passenger, vendor, or order data to unauthorized users.
- Avoid collecting unnecessary personal information.
- Never log passwords, access tokens, payment credentials, or sensitive personal information.

## **5.6 Database Rules**

- Use migrations for database schema changes.
- Keep migrations version-controlled.
- Document schema changes and rollback considerations.
- Use appropriate primary keys, foreign keys, constraints, and indexes.
- Add timestamps where they are useful.
- Model relationships explicitly.
- Consider concurrency, duplicate requests, and transactional integrity for orders.
- Define appropriate data retention and deletion policies.
- Do not run destructive production migrations without explicit approval.
- Do not make undocumented manual schema changes.
- Do not create tables before the relevant product workflows and ownership rules are understood.

## **5.7 API and Business Logic**

- Define clear API contracts.
- Use consistent error responses.
- Validate request parameters, request bodies, and query strings.
- Apply authentication and authorization to protected endpoints.
- Enforce rate limits where appropriate.
- Use idempotency or equivalent safeguards for critical operations such as order creation and payment processing.
- Keep payment verification server-side.
- Verify webhook signatures and handle duplicate webhook delivery.
- Never trust the frontend to declare an order paid.
- Avoid returning internal implementation details in error messages.
- Document pagination, filtering, sorting, and status transitions where applicable.

## **5.8 Development Discipline**

- Inspect before editing.
- Explain the intended changes before substantial modifications.
- Do not overwrite working functionality unnecessarily.
- Do not fabricate environment configuration, successful tests, deployment status, or database changes.
- Do not install packages without a reason.
- Do not deploy, push to production, reset databases, or perform destructive operations without approval.
- Run appropriate checks after implementation.
- Report what changed, what was tested, what failed, and what remains incomplete.

---

# **6. BRAND DESIGN SYSTEM**

Create:

docs/DESIGN_[SYSTEM.md](http://SYSTEM.md)

The uploaded reference contains the following brand tokens.

## **Colors**

Primary:

- Primary: #FF4B2B
- Primary 500: #FFE5E0
- Primary 100: #FFF6F5

Text:

- Text Primary: #290600
- Text Secondary: #AFA7A5
- Text Light: #CAC5C5

Icon:

- Icon: #AC9692

Border:

- Stroke: #EAE7E6

Background:

- Background: #F6F3F3

## **Typography**

Font family:

- Plus Jakarta Sans

Reference desktop typography:

- Hero headline: 64–72px
- Section headings: 36–40px
- Card headings: 24px
- Paragraphs: 18px
- Navigation and buttons: 16px
- Small labels: 12–14px

Implement responsive typography rather than applying desktop sizes universally.

Document:

- Color tokens.
- Typography tokens.
- Responsive breakpoints.
- Spacing scale.
- Border radius conventions.
- Shadows, if needed.
- Button variants and states.
- Form fields and validation states.
- Cards, badges, alerts, and navigation.
- Loading, empty, error, and success states.
- Accessibility and contrast considerations.

Use semantic design tokens.

For Tailwind CSS, adapt the token implementation to the version already installed or explicitly selected for the project.

Do not assume a Tailwind configuration file format that conflicts with the installed version.

Do not install a UI component library without documenting the reason and obtaining approval when it materially affects the project architecture.

---

# **7. REPOSITORY INSPECTION**

Before changing files, inspect the repository.

Determine:

- Existing directory structure.
- Current framework and versions.
- Existing package manager and lockfile.
- Current scripts.
- Existing frontend and backend entry points.
- Existing routes and components.
- Current environment variable conventions.
- Existing Supabase integration.
- Existing authentication implementation.
- Existing database migrations.
- Existing test framework.
- Existing linting and formatting configuration.
- Existing Git branch and working-tree changes.

Do not assume the repository is empty.

Do not delete existing files merely because a different structure is preferred.

If the repository is empty, recommend a minimal initial scaffold and wait for my approval before implementing it.

If the repository contains an existing application, document the actual state separately from the proposed target state.

---

# **8. ARCHITECTURE DOCUMENTATION**

Create:

docs/[ARCHITECTURE.md](http://ARCHITECTURE.md)

Include:

1. Recommended system architecture.
2. Responsibilities of each application or service.
3. Frontend-to-backend request flow.
4. Authentication and authorization flow.
5. Supabase access strategy.
6. Database access patterns.
7. API ownership and conventions.
8. Error handling.
9. Logging and observability.
10. Deployment topology.
11. Environment separation.
12. Testing strategy.
13. Scaling considerations.
14. External integration boundaries.
15. Architecture decision records and unresolved decisions.

Include a Mermaid architecture diagram showing the major components and request flow.

Mark unconfirmed architecture choices as proposed, not implemented.

Do not create infrastructure or deploy services merely because they appear in the diagram.

---

# **9. DATABASE AND SECURITY PLANNING**

Create:

docs/DATABASE_[PLAN.md](http://PLAN.md)

Do not immediately create the production schema.

First identify likely entities and relationships that require product confirmation.

Potential areas include:

- User profiles.
- Roles and permissions.
- Vendors and vendor verification.
- Food listings.
- Food availability.
- Locations and service areas.
- Bus operators, routes, trips, and stops.
- Orders and order items.
- Delivery assignments and status history.
- Payment records, if payments are approved.
- Notifications.
- Operational audit records.

These are discovery candidates, not an approved schema.

For each proposed entity, document:

- Purpose.
- Data ownership.
- Important relationships.
- Access requirements.
- Potential RLS requirements.
- Important constraints.
- Data retention considerations.

Identify the information that must be clarified before migrations are written.

Do not put every possible field into the initial schema.

Do not create circular dependencies between database policies and application roles.

Do not assume that Supabase Auth user metadata alone is a trusted authorization source.

---

# **10. AUTHENTICATION AND AUTHORIZATION PLAN**

Create:

docs/SECURITY_[PLAN.md](http://PLAN.md)

Document the proposed approach to:

- Supabase Auth.
- User profiles.
- Role-based access control.
- Session management.
- Server-side token verification.
- RLS policies.
- API authentication.
- Password recovery.
- Email verification, if required.
- Vendor approval, if required.
- Rate limiting.
- Input validation.
- Secrets management.
- Audit logging.
- Payment and webhook security, if payments are approved.
- Abuse prevention.
- Privacy and personal data protection.

Do not implement all authentication features during the setup phase.

Identify the minimum viable authentication requirements based on the approved product scope.

---

# **11. API STANDARDS**

Create:

docs/API_[STANDARDS.md](http://STANDARDS.md)

Document the proposed conventions for:

- REST endpoint naming.
- HTTP methods and status codes.
- Request validation.
- Response structure.
- Error structure.
- Authentication.
- Authorization.
- Pagination.
- Filtering and sorting.
- Idempotency.
- Rate limiting.
- API versioning, if necessary.
- Logging and correlation identifiers.

Use illustrative examples only where useful.

Do not create placeholder endpoints that appear production-ready.

Do not duplicate endpoints across different backend frameworks.

---

# **12. PROJECT KNOWLEDGE BASE**

Create:

docs/PROJECT_KNOWLEDGE_[BASE.md](http://BASE.md)

This document must become the central reference for confirmed product and technical decisions.

Organize it into:

1. Product vision.
2. Target users and user personas.
3. Primary user problems.
4. Business model.
5. MVP scope.
6. Confirmed features.
7. Out-of-scope features.
8. User journeys.
9. Order lifecycle.
10. Vendor onboarding.
11. Bus and delivery operations.
12. Food listing and availability rules.
13. Payment and refund policies, if applicable.
14. Notification requirements.
15. Brand guidelines.
16. Technical architecture.
17. Integrations.
18. Compliance and operational constraints.
19. Open questions.
20. Assumptions.
21. Decisions and decision dates.
22. Future roadmap.

Use these labels consistently:

- CONFIRMED
- PROPOSED
- ASSUMPTION
- OPEN QUESTION
- OUT OF SCOPE

Never present a proposed feature or an assumption as an approved requirement.

Update this knowledge base whenever I confirm a material product or technical decision.

If two documents conflict, identify the conflict and ask me which requirement takes precedence. Do not silently choose.

---

# **13. DEVELOPMENT WORKFLOW**

Create:

docs/DEVELOPMENT_[WORKFLOW.md](http://WORKFLOW.md)

Document the proposed workflow:

- Local development.
- Branch naming.
- Development and main branches.
- Feature branches where appropriate.
- Pull requests and code review.
- Commit conventions.
- Environment setup.
- Database migration workflow.
- Automated checks.
- Testing.
- Deployment approvals.
- Rollback considerations.

Keep the workflow appropriate for the project's current size.

Do not create GitHub Actions, deployment pipelines, or production infrastructure without approval.

Do not commit, push, merge, or deploy without explicit authorization.

---

# **14. INITIAL REPOSITORY FILES**

If compatible with the existing repository, prepare the following initial documentation:

PROJECT_[CONSTITUTION.md](http://CONSTITUTION.md)  
docs/PROJECT_KNOWLEDGE_[BASE.md](http://BASE.md)  
docs/[ARCHITECTURE.md](http://ARCHITECTURE.md)  
docs/DESIGN_[SYSTEM.md](http://SYSTEM.md)  
docs/DATABASE_[PLAN.md](http://PLAN.md)  
docs/SECURITY_[PLAN.md](http://PLAN.md)  
docs/API_[STANDARDS.md](http://STANDARDS.md)  
docs/DEVELOPMENT_[WORKFLOW.md](http://WORKFLOW.md)

Also inspect whether these supporting files are appropriate:

- .env.example
- .gitignore
- [README.md](http://README.md)
- [CONTRIBUTING.md](http://CONTRIBUTING.md)

Only create or modify supporting files when appropriate to the current repository.

Do not create fake environment values that look like valid credentials.

Do not add secrets.

Do not introduce application code simply to populate the folder structure.

Keep documentation accurate, concise, and useful for future implementation.

---

# **15. FUTURE IMPLEMENTATION PROTOCOL**

For all future tasks in this project, follow this protocol.

Before implementation:

1. Read the relevant sections of PROJECT_[CONSTITUTION.md](http://CONSTITUTION.md).
2. Read the relevant architecture and knowledge-base documentation.
3. Inspect the existing code related to the requested feature.
4. Identify dependencies and potential regressions.
5. Explain the planned implementation.
6. Ask questions if an unresolved decision materially changes the implementation.

During implementation:

1. Make the smallest coherent change.
2. Reuse existing project conventions.
3. Preserve established design tokens.
4. Keep business rules in the designated layer.
5. Enforce authorization and server-side validation.
6. Add or update tests where appropriate.
7. Update documentation when architecture or behavior changes.

After implementation:

1. Summarize changed files.
2. Explain the behavior implemented.
3. Report tests and their actual results.
4. Report any failures or limitations.
5. Identify outstanding manual steps.
6. List any remaining assumptions.

Do not automatically expand the task into adjacent features.

Wait for the next task after completing the requested scope.

---

# **16. INITIAL TASK EXECUTION BOUNDARIES**

For this first run, your task is limited to project inspection, architecture evaluation, and documentation setup.

You are allowed to:

- Inspect the repository.
- Read existing configuration and source files.
- Identify missing setup requirements.
- Recommend an architecture.
- Prepare the initial documentation files after inspection.
- Explain the setup commands that may be required later.

You are not allowed to:

- Build the complete food delivery platform.
- Generate all frontend pages.
- Implement the complete authentication system.
- Create the full database schema.
- Implement checkout, payment processing, or order management.
- Install a large set of packages without approval.
- Replace the existing framework without approval.
- Run destructive database commands.
- Deploy the application.
- Push code to a remote repository.

If a required action would violate these boundaries, explain the reason and wait for my approval.

---

# **17. QUESTIONS YOU MUST ASK ME**

After inspecting the repository and preparing the initial documentation, present a concise discovery questionnaire.

Prioritize questions that materially affect the product or architecture.

At minimum, clarify:

1. What is the platform's name and domain?
2. Is the MVP focused on bus passengers ordering food for delivery to a bus, food pickup at boarding points, or both?
3. Will the platform initially support homemade food providers, restaurants, or both?
4. Who manages the physical delivery: bus staff, vendors, delivery partners, or a separate operations team?
5. At what point can passengers order: before departure, during the journey, or both?
6. How will bus trips, routes, boarding points, and passenger identity be verified?
7. Will the MVP include online payments, cash on delivery, or another payment method?
8. Which user roles are required for the MVP?
9. Which city, routes, and service areas are included in the initial launch?
10. Is this repository new or an existing application that must be preserved?
11. Do I want to retain React + Vite and use a separate backend, or am I open to Next.js as the primary application framework?
12. Which third-party services, if any, have already been selected?

Do not overwhelm me with dozens of unrelated questions.

Group the questions into Product, Operations, Technology, and Branding if useful.

For each architecture decision that needs my approval, provide:

- The decision.
- Your recommendation.
- A short explanation.
- The main trade-off.

Allow me to answer in plain language.

Do not proceed to full product implementation until I respond.

---

# **18. FINAL RESPONSE FORMAT**

When this initial task is complete, report:

A. Repository findings.  
B. Recommended architecture and alternatives considered.  
C. Files created or modified.  
D. Important risks or unresolved decisions.  
E. The initial discovery questionnaire.  
F. The exact next step you recommend.

Clearly distinguish:

- What already existed.
- What you created.
- What you recommend.
- What remains unimplemented.

Do not claim that a feature, test, migration, integration, or deployment is complete unless it actually is.

Your immediate objective is to create a strong, understandable project foundation that future Cursor sessions can follow consistently.

Begin by inspecting the repository. Do not build the application yet.