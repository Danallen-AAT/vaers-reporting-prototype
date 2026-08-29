# Verification harness

Every measured claim the quotation makes about this prototype is produced by one
of the scripts in this directory. They are kept in the repository, rather than
run once and discarded, so that any claim can be re-checked rather than taken on
trust.

Each script drives a real Chrome over the DevTools Protocol. Nothing here
inspects markup and infers behaviour: the checks press keys, navigate, throttle
the network and CPU, and read what the browser actually did.

## Running them

```bash
node verification/perf.mjs          # deployed build, no dev server needed
node verification/verify_live.mjs   # deployed build, no dev server needed
node verification/a11y_audit.mjs    # needs the dev server on :5173
node verification/verify_jump.mjs   # needs the dev server on :5173
```

Start the dev server first for the last two:

```bash
npm run dev
```

Chrome writes a scratch profile to `verification/.output`, which is disposable.

## What each one covers

| Script | Covers | Claim it backs |
|---|---|---|
| `perf.mjs` | Navigation and paint timing on the deployed build, cold cache, across an unthrottled profile and a Fast 3G profile with a fourfold CPU slowdown | PRS#4 page load under 3 seconds |
| `a11y_audit.mjs` | 21 behavioural checks: full tab sweep with the computed focus indicator at every stop, dialog focus containment and restoration, reflow at 200 percent, error announcement, and configuration-injection safety | Section 508 and WCAG 2.0 A and AA, and the ACR |
| `verify_live.mjs` | In-page jump targets on the deployed build: skip link, error summary links, and section chips | The routing defect described in the ACR, and its fix |
| `verify_jump.mjs` | The same jump behaviour against the dev build | Regression guard |

## A note on `a11y_audit.mjs`

The keyboard sweep records a truncated accessible name for readable console
output. An earlier version asserted against that truncated string, which made a
correct control ("Reporter information, in progress, 1 of 2 required answered")
look like a failure because the word "required" fell past the cutoff. The check
now asserts against the full accessible name and truncates only for display.

That is worth stating plainly: the defect was in the measurement, not in the
product, and it is exactly the kind of thing that turns a passing suite into a
misleading one. Automated tooling validates structure. Only exercising a product
validates behaviour, and only reading the harness validates the harness.
