# VAERS Reporting Prototype, project conventions

Context for anyone working in this repo, human or AI.

## What this is

A working prototype of a modernized public reporting form for the Vaccine Adverse Event Reporting System (VAERS), built to demonstrate a config-driven approach to complex branching government forms.

**Demonstration only. Synthetic data. No real personal or health information, ever.**

## The core architectural idea

**The form is data, not code.** Sections, fields, field types, validation, branching rules, help text, and plain-language variants all live in a TypeScript schema. A single generic renderer builds the UI from that schema.

This is not incidental. It is what makes the low-code admin surface possible: an administrator edits the same configuration the renderer reads, so the live form updates with no code change and no redeploy.

## Stack

- React 19, TypeScript, Vite 6
- Vitest with React Testing Library
- Deployed as a static site to Azure Static Web Apps
- No backend. Fully client side.
- State via React context, kept deliberately small

## What the prototype demonstrates

1. **Branching submission form**, two reporter paths from one config-driven engine:
   - Public reporter: plain-language wording, clinical-only fields hidden
   - Healthcare provider: clinical fields, plus the vaccine-administration-error-with-no-adverse-event branch that suppresses the entire Adverse Event section
2. **Intelligent assistance**: inline validation, contextual help text, reactive FAQ panel
3. **Low-code configuration surface**: an admin screen where a program owner edits a question label, help text, or FAQ entry, adds a new question point-and-click, and sets the answer that makes it appear; the live form re-renders from configuration
4. **Section 508 accessibility** built into every component from the start, not retrofitted
5. **Functional client-side upload** with the Phase 1 document policy (accepted types and size limits as configuration), listing and removal, plus a free-text field; nothing is read, stored, or transmitted
6. **Document suggestion rules**, for example a provider indicating hospitalization is prompted to attach a discharge summary
7. **Post-submission satisfaction survey**
8. **Structured output**, emitting clean VAERS-compatible JSON on submit
9. **Performance**, targeting a page load under three seconds with a lean bundle

Field-level detail, branching rules, and plain-language substitutions are in `VAERS-FORM-MODEL.md`.

## Behavior that must be correct

- **Branching correctness.** Field presentation and suppression must be right in every combination of public versus provider and the provider error-with-no-adverse-event case. A dedicated test suite covers this and must stay green.
- **Responsiveness.** Correct rendering and functional completion on mobile and modern desktop browsers.
- **Accessibility.** Section 508 conformance, targeting WCAG 2.0 Level A and AA.
- **Performance.** Page load under three seconds.

## Two rules that keep the architecture intact

**1. Branching lives only in `src/config/vaersForm.ts`.** Never scatter conditionals through components. New conditional behavior is expressed in the schema as a `visibleWhen` or `suppressWhen` predicate.

**2. The form engine stays pure.** No React imports in `src/formEngine/`. That is what allows the entire branching matrix to be unit tested without rendering anything.

## Layout

| Path | Contents |
|---|---|
| `src/config/` | The form as data. `vaersForm.ts` is the whole form; `types.ts` defines the schema types. |
| `src/formEngine/` | Pure functions: branching, validation, structured output, document suggestion rules. |
| `src/state/` | React context. `ConfigStore` holds base schema plus admin overrides; `FormContext` holds answers and errors. |
| `src/components/` | `FormRenderer` draws what the engine says is visible; `Field` renders every field type accessibly. |
| `src/admin/` | The low-code surface: section, field, and FAQ editors with a live preview. |

## Scope guardrails

Do not:
- Add real authentication or user management. The admin login is intentionally a mock.
- Store or transmit real personal or health information. Synthetic data only. The upload validates and lists locally; file contents are never read, stored, or transmitted.
- Build real backend integration. Structured JSON output is the demonstration.
- Over-engineer infrastructure.

Do invest in:
- Branching correctness and its tests
- The configuration and admin surface
- Accessibility
- Interaction polish and a smooth end-to-end run

## Conventions

- Keep the test suite green. Branching tests are not optional.
- Accessibility is a merge requirement, not a follow-up. Any new field type must be keyboard operable and screen reader labelled.
- Match the surrounding code style. Comment density is moderate and explains why, not what.
- No em dashes in code, comments, UI strings, or documentation.

## Reference

The public VAERS 2.0 form at `vaers.hhs.gov` is the source for data elements. Verify field definitions against it.
