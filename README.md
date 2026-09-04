# VAERS Reporting Prototype

A working prototype of a modernized public reporting form for the Vaccine Adverse Event Reporting System, built for a CDC solicitation.

**Demonstration only. Synthetic data. No real personal or health information, and nothing is stored or transmitted.**

---

## The idea in one sentence

**The form is data, not code.** Every question, label, validation rule, and branch lives in a configuration schema, and one generic renderer draws whatever the schema says. That single decision is what makes the low-code admin surface possible: a program owner can edit the live form with no developer and no redeploy.

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # the full suite; the count is printed at the end of every run
npm run typecheck  # tsc, no emit
npm run build      # production build to dist/
```

Deployed build: https://happy-tree-02634e910.7.azurestaticapps.net

Routes:

- `#/` the landing page
- `#/report` the reporting form, both reporter paths
- `#/admin` the low-code configuration surface (the sign-in accepts anything; it stands in for CDC single sign-on)
- `#/about` how it works, written for reviewers

## Verification

Every measured claim made about this prototype is produced by a script in
`verification/`, kept in the repository so any claim can be re-run rather than
taken on trust: performance under throttle (`perf.mjs`), behavioral checks that
press real keys (`verify_live.mjs`, `a11y_audit.mjs`), and horizontal-overflow
checks at handset width (`responsive.mjs`). See `verification/README.md`.

**The fastest way to understand the architecture:** open `#/admin`, change a field label, watch the preview on the right update as you type, then go to `#/` and see the same change on the real form. That round trip is the whole design in about fifteen seconds.

---

## How it fits together

```
config (the form as data)
  vaersForm.ts  ─┐
                 ├─→ applyOverrides() ─→ effective config ─┐
  admin overrides┘   (memoized)                            ├─→ formEngine ─→ FormRenderer ─→ UI
  (localStorage)                                           │    (pure)
                              user answers ────────────────┘
```

The admin surface holds no private copy of anything. It edits the same configuration the renderer reads, which is why an edit appears instantly.

### Layout

| Path | What lives there |
|---|---|
| `src/config/` | The form as data. `vaersForm.ts` is the entire form, all seven sections. `types.ts` defines the schema types. `locale.ts` is the language overlay, `es.ts` the Spanish content, `ui.ts` the interface strings. |
| `src/formEngine/` | Pure functions, no React. Branching, validation, structured output, document suggestion rules. |
| `src/state/` | React context. `ConfigStore` holds base schema plus overrides; `FormContext` holds answers and errors; `LocaleStore` holds the reporter's language. |
| `src/components/` | `FormRenderer` draws what the engine says is visible. `Field` renders every field type accessibly. |
| `src/admin/` | The low-code surface: section, field, and FAQ editors, with a live preview. |

---

## Two rules that keep this working

**1. Branching lives only in `src/config/vaersForm.ts`.** Never scatter conditionals through components. New conditional behavior goes in the schema as a `visibleWhen` or `suppressWhen` predicate:

```ts
// hidden when ALL of these hold
suppressWhen: [
  { field: 'isAdminError', equals: 'yes' },
  { field: 'errorHadAE',   equals: 'no'  },
]
```

**2. The engine stays pure.** No React imports in `src/formEngine/`. That is what lets the entire branching matrix be unit tested without rendering anything, and it is why the suite runs in milliseconds.

**3. Language is an overlay, never a fork.** The base schema is English. Any
other language is a flat map from string key to text, applied to the
configuration before it renders. Never copy the schema to translate it, and
never key a branching rule on a label.

---

## Language (Amendment 2, Q&A 270)

```
vaersForm.ts (English)  ─┐
                         ├─→ localizeConfig(config, locale, translations) ─→ the form in one language
es.ts + admin edits     ─┘
```

Rules compare answer **values**, and values are not translated, so the Spanish
form is the same instrument as the English one by construction. The submitted
record is keyed to VAERS data elements and carries values, so a report filed in
Spanish is byte-identical to the same report filed in English. Both are asserted
across the whole generated matrix in `src/config/locale.test.ts`.

Two kinds of text, and they are kept apart on purpose:

| | Where | Who edits it | How completeness is enforced |
|---|---|---|---|
| Questions, sections, surveys, FAQ | `config/locale.ts` keys, content in `config/es.ts` plus admin edits | CDC, through `#/admin` | The integrity check counts what a configuration needs against what it has. **A draft with a gap cannot be published.** |
| Buttons, validation, progress, navigation | `config/ui.ts` | developers | `Record<Locale, string>` per key, so a missing language is a compile error |

Adding a language:

1. Add it to `LOCALES` in `config/locale.ts`.
2. `ui.ts` stops compiling. Fill in the new column. That is the interface done.
3. Create the content map, the way `es.ts` does. `englishStrings(vaersForm, defaultFaqs)` produces every key with its English text to translate from.
4. Nothing else. No component changes, no new rules.

A string with no translation falls back to English for reporters, never to a
blank. Gaps are made loud in the configuration screen, where they can be fixed,
and silent on the form, where they cannot.

The Spanish shipped here demonstrates the mechanism. It has not been through
qualified-translator review, and production Spanish for a national reporting
instrument would be, with CDC owning the wording as it owns the English
(45 CFR 92.201(c)(2); OMB M-23-22 section 3.c).

---

## The branching, which is the scored behavior

The customer evaluates this directly and requires it to be correct in every case.

| Scenario | Adverse Event section |
|---|---|
| Public reporter | shown |
| Provider, no administration error | shown |
| Provider, error **with** adverse event | shown |
| **Provider, error with NO adverse event** | **entirely suppressed** |

That last row is the one that matters. When a provider reports a vaccine administration error that caused no adverse event, the whole Adverse Event section disappears, along with the recovery question in the patient section that depends on it. Validation follows automatically, because only visible fields are ever validated, so a suppressed required field can never block submission.

`src/formEngine/visibility.test.ts` covers all of it.

---

## Accessibility

Section 508 conformance is a requirement, not a preference. Accessibility is built into every component rather than retrofitted: semantic HTML, `fieldset` and `legend` for grouped inputs, `aria-describedby` and `aria-invalid` wiring, a focusing error summary, visible focus states, and AA contrast.

Keep it that way. Any new field type must be keyboard operable and screen reader labelled before it merges.

---

## What is deliberately not here

- **No backend.** Everything is client side.
- **No real authentication.** The admin login is a mock and accepts anything.
- **No real integration.** Submission emits structured JSON to the screen.
- **No real data.** Synthetic only, always.
- **No machine translation in the authoring surface.** Translations are typed and reviewed. See the language section above for why.
- **The admin screen and `#/about` stay in English.** The first is a CDC staff tool, the second is written for evaluators. Every reporter-facing surface is bilingual. Amendment 2 does not say which surfaces are in scope, so whether a CDC-facing screen is also required in Spanish is CDC's call; the mechanism is the same either way.

---

## Stack

React 19, TypeScript, Vite 6, Vitest with React Testing Library. Deployed as a static site to Azure Static Web Apps.

---

## License and use

Provided for evaluation under CDC RFQ 75D301-26-Q-00146. No license is granted:
all rights reserved by Allen App Tools LLC. Custom code produced under the
resulting contract will be delivered with Government rights under FAR
52.227-17, Rights in Data, Special Works, as Amendment 1 to the solicitation
directs for custom code.
