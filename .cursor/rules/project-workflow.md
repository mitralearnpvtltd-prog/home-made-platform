# Cursor Project Execution Protocol

Follow a documentation-first, approval-based workflow for the `bus-food-delivery` project.

This protocol is intended to govern the project from the beginning, before application implementation. The manager Project Execution Protocol is the required workflow, subject to the project's authorized approval process.

## Project Stages

The seven-stage workflow is exactly:

1. Project Scope Definition
2. Project Architecture Planning
3. Project Constitution and Knowledge Base
4. Design System Definition
5. Section-wise Implementation
6. Testing and Code Review
7. Integration and Deployment

Section-wise development is Stage 5, not Stage 4. Do not collapse Stage 2 or Stage 4 into Stage 3.

## General Rules

- Identify the current project stage in every substantial response.
- Read relevant documentation and inspect existing files before proposing changes.
- Review existing documentation before proposing new files. Do not create duplicate documents unnecessarily.
- Distinguish confirmed requirements, proposals, assumptions, open questions, and out-of-scope items.
- Never invent requirements or treat assumptions as approved decisions.
- Never silently change approved technical decisions.
- Do not write application code during scope analysis or architecture planning.
- Do not advance to another stage without the required review and approval.
- Safe, non-destructive checks may be run within an approved task. Package installation, destructive operations, deployment, and pushing changes require explicit approval.
- Prefer small, focused, reviewable changes.
- Prefer predictable, secure, maintainable development over generating large amounts of code quickly.
- Never claim that a command, test, or integration succeeded unless its result has been verified.
- Documents may be saved as drafts when requested. Saving a draft never means approval.
- Approval must be explicit. Silence, draft review, or providing this protocol is not approval of Scope, Architecture, Constitution, or Design System.
- Who the authorized reviewer is remains unresolved and must not be invented. The authorized reviewer must be established through the project's approval process. Do not infer approval authority from a person's instructions alone.

## Stage 1: Project Scope Definition

- Review the repository and all relevant project documents.
- Identify the product's purpose, target users, user roles, features, workflows, business rules, dependencies, risks, constraints, missing information, and acceptance criteria.
- Ask questions when essential requirements are missing.
- Do not assume requirements based only on the repository name.
- Draft the scope for review.
- A scope draft may be saved when requested. A saved draft is not the approved scope.
- Wait for explicit approval before treating the scope as approved.
- Do not generate application code during this stage.

## Stage 2: Project Architecture Planning

- Architecture evaluation must be grounded in the formally approved scope, including technology stack, components, data flow, APIs, integrations, security, scalability, and maintainability.
- Until the scope is formally approved, any architecture document remains proposed and cannot be treated as approved.
- Identify architectural conflicts, duplicated responsibilities, security gaps, unnecessary complexity, and missing decisions.
- Clearly distinguish recommendations from approved decisions.
- Do not silently change the selected technology stack.
- An architecture draft may be saved when requested. A saved draft is not approval.
- Present the architecture plan and wait for explicit approval before significant architectural changes.

## Stage 3: Project Constitution and Knowledge Base

- Document approved project principles, technical conventions, security requirements, API standards, data rules, and development practices.
- Maintain the project constitution, knowledge base, architecture documentation, design system, security plan, and API standards as those documents are created in their proper stages.
- Prefer existing project documents when they already serve the same purpose.
- Keep documentation consistent with the approved scope.
- Mark confirmed decisions, proposals, assumptions, open questions, and out-of-scope items clearly.
- Do not record unapproved proposals as final decisions.
- A constitution draft may be saved when requested. A saved draft is not approval.

## Stage 4: Design System Definition

- Define the approved visual language, colors, typography, spacing, reusable components, responsive layouts, and accessibility requirements.
- Follow any existing brand or design requirements.
- Present the design system for review and approval before using it as the basis for substantial UI implementation.
- A design-system draft may be saved when requested. A saved draft is not approval.

## Stage 5: Section-wise Implementation

Implement only one approved section or module at a time.

Do not begin Stage 5 application implementation until Stages 1, 2, 3, and 4 have each been formally reviewed and explicitly approved by the authorized reviewer.

For every section:

1. Read the relevant approved documentation.
2. Inspect the existing code, project structure, and dependencies.
3. Understand the requested section and its boundaries.
4. Identify UI, database, API, security, accessibility, and integration requirements.
5. List the files expected to change and explain why.
6. Present the implementation plan and unresolved questions.
7. Wait for explicit approval before making substantial changes.
8. Implement only the approved scope.
9. Run relevant checks and tests that are available and safe to run.
10. Report actual results, including failures and checks that could not be run.
11. Review security, accessibility, error handling, and design consistency.
12. Update relevant documentation when necessary.
13. Summarize completed work, changed files, test results, known limitations, and remaining tasks.
14. Stop and wait for the next instruction.

Do not implement additional sections simply because they are related.

## Scope Protection

- Do not create unrequested features, database tables, APIs, integrations, or UI features without a clear requirement.
- Do not replace existing working code unnecessarily.
- Do not install packages without approval.
- Do not run destructive commands or database migrations without approval.
- Do not deploy, publish, or push changes without approval.
- Ask before making a change that materially affects the approved scope or architecture.

## Completion Criteria

A section is complete only when its approved requirements are implemented, relevant checks have been performed, known limitations are documented, and integration requirements are clear.

Never report unverified work as completed.

After completing each section, stop and wait for the next instruction.

## Current Stage and Initial Instructions

The initial stage is Stage 1 — Project Scope Definition, unless an authorized reviewer explicitly confirms that a stage has already been completed and approved.

The current scope remains a draft and the current architecture remains proposed until formally approved.

Begin by inspecting the repository and the existing project documentation. Determine which files contain content and which are empty.

If the project scope is missing or incomplete, ask focused questions to collect the necessary requirements. Do not invent requirements based on the project name.

A document may be saved as a draft when requested. Saving a draft is not approval. Wait for explicit approval before treating any document as approved.

Do not begin Stage 5 application implementation until Stages 1, 2, 3, and 4 have each been formally reviewed and explicitly approved by the authorized reviewer.

Providing or reconciling this protocol does not approve Scope, Architecture, Constitution, or Design System, and does not start Stage 5.
