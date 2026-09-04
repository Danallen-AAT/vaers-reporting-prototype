# VAERS Form Model — fields, branching, plain-language (build content spec)

> First-pass model of the current **VAERS 2.0** form's data elements, structured for the config-driven engine. **Verify field-for-field against the live public form at `vaers.hhs.gov` (the writable VAERS 2.0 PDF)** before the final build — the RFQ requires "the data elements of the current VAERS form." This is enough to build the prototype now.

## The three branching decisions (the heart — PRS#1)
1. **Reporter type** (first question, drives everything):
   - `public` = patient / parent / guardian / caregiver → **plain-language labels**, clinical-only fields hidden/simplified.
   - `provider` = healthcare professional → **clinical labels**, full field set.
   *(Manufacturer/other exist on the real form; out of scope for the demo.)*
2. **Provider-only sub-branch — vaccine administration error (PWS 1.6.2):**
   - Ask providers: *"Are you reporting a vaccine administration error (e.g., wrong vaccine, wrong dose, expired product, wrong site/route)?"* → if **yes**, then:
   - *"Did the patient experience any adverse event or health problem?"* → if **NO adverse event**, **SUPPRESS the entire Adverse Event section** (onset, description, seriousness, recovery, etc.) and collect only Vaccine Error details. → if **yes**, show BOTH the Error section and the Adverse Event section.
3. **Seriousness follow-ups:** if any "serious" criterion is checked (death, hospitalization, etc.), reveal its detail fields (date of death, # hospital days, etc.).

## Sections & fields
Legend — Path: `both` | `public` | `provider`. Type: text/date/select/multiselect/checkbox/radio/textarea/number/file.

### 1. Reporter Information
| id | label (clinical) | publicLabel | type | path | required |
|---|---|---|---|---|---|
| reporterType | Reporter type | Who is filling this out? | radio (public/provider) | both | yes |
| reporterName | Reporter name | Your name | text | both | yes |
| reporterEmail | Reporter email | Your email | text | both | no |
| reporterPhone | Reporter phone | Your phone | text | both | no |
| facilityName | Facility/Provider name | Clinic or pharmacy name (if known) | text | both | no |
| relationToPatient | — | Your relationship to the patient | select (self/parent/guardian/caregiver) | public | yes |

### 2. Patient Information
| id | label | publicLabel | type | path | required |
|---|---|---|---|---|---|
| patientAgeAtVax | Age at vaccination | How old was the patient at the time of the shot? | number | both | yes |
| patientDob | Date of birth | Patient's date of birth | date | both | no |
| patientSex | Sex | Patient's sex | select (F/M/Unknown) | both | yes |
| patientState | State | State where the patient lives | select (US states) | both | no |
| patientRecovered | Recovered? | Has the patient recovered? | radio (yes/no/unknown) | both | conditional* |
*hidden when AE section is suppressed.

### 3. Vaccine(s) Administered — repeatable group (≥1)
| id | label | publicLabel | type | path | required |
|---|---|---|---|---|---|
| vaxType | Vaccine type | Which vaccine? | select (COVID-19, Influenza, MMR, Tdap, HPV, Shingles, Other…) | both | yes |
| vaxManufacturer | Manufacturer | Vaccine maker (if known) | text | both | no |
| vaxLot | Lot number | Lot number (on the card/record, if known) | text | both | no |
| vaxDoseNum | Dose number in series | Which dose was it? (1st, 2nd, booster…) | select | both | no |
| vaxRoute | Route of administration | How was the shot given? (e.g., into the arm muscle) | select (IM/SC/ID/Oral/Nasal/Unknown) | provider | no |
| vaxSite | Anatomical site | Where on the body was the shot given? | select (L/R arm, L/R thigh, other) | provider | no |
| vaxDate | Vaccination date/time | Date of the shot | date | both | yes |

### 4. Vaccine Administration Error — shown only if `isAdminError = yes` (provider)
| id | label | type | path | required |
|---|---|---|---|---|
| isAdminError | Are you reporting a vaccine administration error? | radio (yes/no) | provider | yes |
| errorType | Type of error | multiselect (wrong vaccine, wrong dose/amount, expired product, wrong site, wrong route, wrong age, storage/handling, other) | provider (if isAdminError) | yes |
| errorHadAE | Did the patient experience any adverse event/health problem? | radio (yes/no) | provider (if isAdminError) | yes |
| errorDescription | Describe the error | textarea | provider (if isAdminError) | yes |

### 5. Adverse Event — **SUPPRESSED when (isAdminError=yes AND errorHadAE=no)**
| id | label (clinical) | publicLabel | type | path | required |
|---|---|---|---|---|---|
| aeOnsetDate | AE onset date | When did the problem start? | date | both | yes |
| aeOnsetTime | Time to onset | About how long after the shot did it start? | text | both | no |
| aeDescription | Adverse event description | Describe what happened | textarea | both | yes |
| aeSeriousness | Seriousness criteria | How serious was it? (check all that apply) | multiselect: died / life-threatening / hospitalized / prolonged hospitalization / permanent disability / ER or doctor visit / birth defect / none | both | yes |
| aeDeathDate | Date of death | (shown if "died") | date | both | conditional |
| aeHospDays | # days hospitalized | (shown if "hospitalized") | number | both | conditional |
| aeTreatment | Treatment given | What treatment was given, if any? | textarea | both | no |
| aeOutcome | Current status | How is the patient now? | select (recovered/recovering/not recovered/unknown) | both | no |

### 6. Clinical Context — mostly provider; simplified/optional for public
| id | label | publicLabel | type | path |
|---|---|---|---|---|
| medHistory | Relevant medical history/conditions | Any health conditions we should know about? | textarea | both |
| allergies | Known allergies | Known allergies | textarea | both |
| concomitantMeds | Concomitant medications | Other medicines taken around the same time | textarea | both |
| priorVaxReactions | Prior adverse events after vaccination | Any past reactions to vaccines? | textarea | both |
| labData | Relevant lab/diagnostic test results | — | textarea | provider |
| illnessAtVax | Illness at time of vaccination | Was the patient sick when they got the shot? | textarea | public→simple / provider |

### 7. Attachments (Task 2 — stub only)
| id | label | type | notes |
|---|---|---|---|
| medicalRecordUpload | Upload supporting medical records | file (stub) | client-side only; **never store PHI**; suggest docs via rules (§ doc-suggestion) |
| freeText | Anything else you'd like to add | textarea | both |

## Doc-suggestion rules (Task 2.3 demo)
Simple, visible rules — e.g.: if `aeSeriousness` includes "hospitalized" → suggest "hospital discharge summary"; includes "ER or doctor visit" → suggest "visit notes"; `labData` non-empty → suggest "lab result reports"; `isAdminError` → suggest "vaccine administration record."

## Plain-language substitution table (public path)
| Clinical term | Public wording |
|---|---|
| Adverse event | Health problem or reaction after the vaccine |
| Onset date | When did the problem start? |
| Route of administration | How the shot was given |
| Anatomical site | Where on the body the shot was given |
| Concomitant medications | Other medicines taken around the same time |
| Seriousness criteria | How serious was it? |
| Relevant medical history | Health conditions we should know about |
| Contraindication | A reason the vaccine may not have been safe |

## Structured output (Task 1.9 demo)
On submit, emit a JSON object keyed by these field ids (VAERS-compatible mapping), e.g. `{ reporterType, patient:{...}, vaccines:[...], adverseEvent:{...}|null, adminError:{...}|null, meta:{ submittedAt, formVersion } }`. Show it on-screen and offer download — demonstrates integration-readiness without a real backend.

## Test scenarios for PRS#1 (must all pass)
1. Public reporter → sees plain labels, no provider-only fields (route/site/labData hidden).
2. Provider, no admin error → full clinical AE fields present.
3. Provider, admin error **with** AE → both Error section and AE section present.
4. Provider, admin error **with NO** AE → **AE section fully suppressed**, only Error details collected. ← the marquee behavior.
5. Seriousness "died" → date-of-death field appears; "hospitalized" → hospital-days appears.

## Language (Amendment 2, Q&A 270)

Spanish is a second **content set**, not a second form. The schema above is the
English base; `src/config/es.ts` maps every translatable string key to its
Spanish text, and `localizeConfig` applies the map before anything renders.

Keys are built from identity, so rewording never breaks a translation:

| Thing | Key |
|---|---|
| A question label | `field.<fieldId>.label` |
| Its plain-language variant | `field.<fieldId>.publicLabel` |
| An answer a reporter can choose | `field.<fieldId>.option.<value>` |
| Help text, tooltip, placeholder | `field.<fieldId>.helpText` and so on |
| A section heading | `section.<sectionId>.title` |
| A repeatable group's item and add labels | `section.<sectionId>.itemLabel` / `.addLabel` |
| A survey question | `survey.<surveyId>.q.<questionId>` |
| An FAQ entry | `faq.<faqId>.question` / `.answer` |

**Branching is unaffected, by construction.** Every predicate in this document
compares an answer *value* (`equals: 'yes'`, `includes: 'hospitalized'`), and
values are never translated. So all five PRS#1 scenarios above hold identically
in Spanish, and `src/config/locale.test.ts` asserts presentation, suppression
and the submitted record match across the whole generated matrix in both
languages, measured rather than asserted.

Interface text that is not part of the form (buttons, validation messages, the
completion rail, navigation) lives in `src/config/ui.ts`, typed per language so
a missing translation is a build failure.

**The publish gate.** The integrity check counts the translated strings a
configuration needs against the ones it has. A draft carrying any question,
section, survey line or FAQ entry without its Spanish cannot be published: the
publish is refused and names the question. New questions therefore arrive in
both languages or not at all.
