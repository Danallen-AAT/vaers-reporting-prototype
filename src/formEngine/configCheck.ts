// ---------------------------------------------------------------------------
// Configuration integrity check (PRS#1, PWS 1.8).
//
// The low-code surface lets a CDC program officer change branching rules. That
// raises the obvious question: what stops a non-developer from saving a rule
// that contradicts itself, so a question can never appear again?
//
// This module answers it. It derives the decision variables from the rules
// themselves, generates the combination matrix, and evaluates the whole form
// against every combination. A question that never appears in any of them is
// unreachable, and that is reported before the edit is accepted rather than
// discovered later by a reporter. Pure functions, no React, so the same check
// runs in the test suite and behind the admin surface.
// ---------------------------------------------------------------------------
import type { Condition, FieldConfig, FormConfig, FormValues } from '../config/types';
import type { FaqItem } from '../config/faqs';
import { missingKeys, type Locale, type Translations } from '../config/locale';
import { getVisibleForm, visibleFieldIds } from './visibility';
import { carryAnswersAcross } from './carryAcross';

const CHOICE_TYPES = new Set(['radio', 'select', 'multiselect', 'checkbox']);
/** Ceiling on the generated matrix, so a rich configuration cannot hang the UI. */
const MAX_COMBINATIONS = 4096;

export type IssueCode =
  | 'empty-label'
  | 'empty-option-label'
  | 'empty-section-title'
  | 'unknown-controller'
  | 'unknown-option'
  | 'cycle'
  | 'unreachable-field'
  | 'unreachable-section'
  | 'lost-path'
  | 'missing-translation';

export interface ConfigIssue {
  code: IssueCode;
  /** The field or section the issue is about. */
  target: string;
  /** Plain language, written for a program officer rather than a developer. */
  message: string;
}

export interface ConfigCheckResult {
  /** True when the configuration is sound. Translation completeness is separate. */
  ok: boolean;
  /**
   * Integrity faults only: a question that can never appear, a rule that
   * contradicts itself, a control with no name. Wording that has not been
   * translated yet is not one of these. It is unfinished work rather than a
   * broken form, and reporting it here would make this check cry wolf about the
   * one thing it exists to be trusted on.
   */
  issues: ConfigIssue[];
  /** How many answer combinations were evaluated. */
  combinations: number;
  fieldsChecked: number;
  /** True when the matrix hit its ceiling and was cut short. */
  truncated: boolean;
  /**
   * Translation keys the configuration needs and the translation does not
   * carry. The issue list carries one entry per question or section, which is
   * what a person reads; this is the exact list, which is what the editor uses
   * to mark the individual inputs.
   */
  missingTranslations: string[];
  /** The same gaps, grouped per question, in language a program officer reads. */
  translationIssues: ConfigIssue[];
  /** True when every language the form publishes in is complete. */
  translationOk: boolean;
}

/**
 * A language the configuration must be complete in before it can go live.
 * Passing one turns "every question has a Spanish version" into a condition of
 * publishing rather than a thing someone remembers to check (PRS#19).
 */
export interface TranslationRequirement {
  locale: Locale;
  /** How the language is named to the person editing, for example "Spanish". */
  languageName: string;
  translations: Translations;
  faqs?: FaqItem[];
}

/**
 * The owner of a translation key, and how that owner is described to a person.
 * Keys are built from ids, so this is parsing rather than a second source of
 * truth: `field.vaxLot.tooltip` belongs to `vaxLot`, and so does
 * `field.vaxLot.option.covid19`.
 */
function keyOwner(key: string): { kind: string; id: string } {
  const [kind, id = ''] = key.split('.');
  return { kind, id };
}

/**
 * Characters that occupy no visual space and are announced by nothing: the
 * zero-width family, the byte order mark, and word joiner. A label made only of
 * these looks set in the editor and is silence to a screen reader, so they are
 * removed before asking whether anything is left.
 */
const INVISIBLE_CODEPOINTS = new Set([
  0x200b, 0x200c, 0x200d, 0x200e, 0x200f, // zero-width space through RTL mark
  0x2028, 0x2029, // line and paragraph separators
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, // bidirectional embedding controls
  0x2060, 0x2061, 0x2062, 0x2063, 0x2064, // word joiner and invisible operators
  0xfeff, // byte order mark, the classic invisible paste
]);

/**
 * True when the text carries nothing a person could see or hear. Whitespace is
 * the obvious case; the harder one is a label pasted full of zero-width
 * characters, which looks set in the editor and is silence to a screen reader.
 */
export function isBlankText(value: string | undefined): boolean {
  if (!value) return true;
  for (const ch of value) {
    if (ch.trim() === '') continue;
    if (INVISIBLE_CODEPOINTS.has(ch.codePointAt(0) ?? 0)) continue;
    return false;
  }
  return true;
}

function allFields(config: FormConfig): FieldConfig[] {
  return config.sections.flatMap((s) => s.fields);
}

/** Every predicate in the configuration, paired with the thing it governs. */
function allConditions(config: FormConfig): { owner: string; cond: Condition }[] {
  const out: { owner: string; cond: Condition }[] = [];
  for (const section of config.sections) {
    for (const c of section.visibleWhen ?? []) out.push({ owner: section.id, cond: c });
    for (const c of section.suppressWhen ?? []) out.push({ owner: section.id, cond: c });
    for (const field of section.fields) {
      for (const c of field.visibleWhen ?? []) out.push({ owner: field.id, cond: c });
      for (const c of field.suppressWhen ?? []) out.push({ owner: field.id, cond: c });
    }
  }
  return out;
}

/** The literal values a predicate compares against. */
function referencedValues(cond: Condition): string[] {
  const vals: string[] = [];
  if (cond.equals !== undefined) vals.push(cond.equals);
  if (cond.notEquals !== undefined) vals.push(cond.notEquals);
  if (cond.includes !== undefined) vals.push(cond.includes);
  for (const v of cond.in ?? []) vals.push(v);
  return vals;
}

/** Rule dependencies: the controllers each field's own rules read. */
function controllersOf(config: FormConfig): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const field of allFields(config)) {
    const deps = new Set<string>();
    for (const c of [...(field.visibleWhen ?? []), ...(field.suppressWhen ?? [])]) {
      deps.add(c.field);
    }
    map.set(field.id, deps);
  }
  return map;
}

function findCycle(config: FormConfig): string[] | null {
  const deps = controllersOf(config);
  const state = new Map<string, number>(); // 0 unvisited, 1 on the stack, 2 done
  let cycle: string[] | null = null;
  const walk = (id: string, path: string[]): void => {
    if (cycle) return;
    if (state.get(id) === 1) {
      cycle = [...path.slice(path.indexOf(id)), id];
      return;
    }
    if (state.get(id) === 2) return;
    state.set(id, 1);
    for (const next of deps.get(id) ?? []) walk(next, [...path, id]);
    state.set(id, 2);
  };
  for (const id of deps.keys()) walk(id, []);
  return cycle;
}

/**
 * Candidate answers for one decision variable. Only values the rules actually
 * compare against can change a branching outcome, so the matrix carries those,
 * plus unanswered, plus one unreferenced option standing for any other answer.
 * That keeps the matrix small without dropping a branch.
 */
function candidateValues(
  field: FieldConfig,
  referenced: Set<string>,
): (string | string[] | undefined)[] {
  const options = (field.options ?? []).map((o) => o.value);
  const picked = options.filter((v) => referenced.has(v));
  const spare = options.find((v) => !referenced.has(v));
  // With nothing referenced, no answer is interchangeable with another: the
  // reporter path, for one, is read directly rather than through a predicate,
  // so every option has to be tried.
  const scalars = picked.length > 0 ? [...picked, ...(spare ? [spare] : [])] : options;
  if (field.type === 'multiselect' || field.type === 'checkbox') {
    const chosen = picked.length > 0 ? picked : options;
    const arrays: string[][] = [[], ...chosen.map((v) => [v])];
    if (chosen.length > 1) arrays.push([...chosen]);
    return arrays;
  }
  return [undefined, ...scalars];
}

/**
 * The answers a reporter could still be holding in this state, having filled
 * the form forward.
 *
 * A question that is not on screen keeps whatever was typed into it, and that
 * retained answer goes on driving branching. So a combination can describe a
 * state a reporter reaches only by answering something, watching the question
 * disappear, and then reversing the answer that hid it. Reachability judged
 * over those states is too generous: it will certify a question as reachable
 * when no one filling the form in order will ever see it.
 *
 * Dropping answers to questions that are not visible, repeatedly until the set
 * stops changing, leaves the answers a forward pass can actually produce.
 */
function settleForward(config: FormConfig, values: FormValues): FormValues {
  let current = values;
  // Each pass can hide more questions, so iterate to a fixed point. The bound
  // is the number of questions, since each pass removes at least one or stops.
  for (let pass = 0; pass < config.sections.length + 1; pass += 1) {
    const visible = visibleFieldIds(config, current);
    const next: FormValues = {};
    for (const [key, value] of Object.entries(current)) {
      // The reporter path is chosen before anything else and always stands.
      if (key === 'reporterType') {
        next[key] = value;
        continue;
      }
      const base = key.replace(/__\d+$/, '');
      if (visible.has(key) || visible.has(base)) next[key] = value;
    }
    if (Object.keys(next).length === Object.keys(current).length) return next;
    current = next;
  }
  return current;
}

/**
 * Which reporter paths can still see each question. Reachability on its own is
 * too weak a property: a question moved into a provider-only section is still
 * reachable, and has silently stopped being collected from members of the
 * public. What matters is whether a question still reaches the people it used
 * to reach.
 */
function pathsReachingEachField(config: FormConfig, combos: FormValues[]): Map<string, Set<string>> {
  const byField = new Map<string, Set<string>>();
  for (const values of combos) {
    const path = values.reporterType;
    if (typeof path !== 'string') continue;
    for (const id of visibleFieldIds(config, values)) {
      const base = id.replace(/__\d+$/, '');
      for (const key of [id, base]) {
        const seen = byField.get(key) ?? new Set<string>();
        seen.add(path);
        byField.set(key, seen);
      }
    }
  }
  return byField;
}

export function checkConfiguration(
  config: FormConfig,
  baseline?: FormConfig,
  translation?: TranslationRequirement,
): ConfigCheckResult {
  const fields = allFields(config);
  const byId = new Map(fields.map((f) => [f.id, f]));
  const issues: ConfigIssue[] = [];

  // 1. Every question must still have a name to be announced by. An editor who
  //    clears a label leaves the label element in place with nothing in it,
  //    which is an unnamed control on the live form (WCAG 4.1.2, and the
  //    Chapter 504 promise that an authoring tool cannot produce inaccessible
  //    output). The public label falls back to the clinical one, so a blank
  //    clinical label is what breaks both paths.
  for (const section of config.sections) {
    if (isBlankText(section.title)) {
      issues.push({
        code: 'empty-section-title',
        target: section.id,
        message: 'A section has no heading. Every section needs a title reporters can see.',
      });
    }
    for (const field of section.fields) {
      if (isBlankText(field.label)) {
        issues.push({
          code: 'empty-label',
          target: field.id,
          message: `A question has no label, so a screen reader would announce it as unnamed. Give "${field.id}" a label, or remove the question.`,
        });
      }
      // A choice is a label too. An answer with nothing to read is an unnamed
      // control on the live form exactly as an unnamed question is.
      for (const option of field.options ?? []) {
        if (isBlankText(option.label)) {
          issues.push({
            code: 'empty-option-label',
            target: field.id,
            message: `An answer to "${field.label || field.id}" has nothing to read, so a reporter would meet a choice a screen reader announces as unnamed. Give every answer a label.`,
          });
        }
      }
    }
  }

  // 2. Every predicate must name a question that exists, and compare against a
  //    choice that question actually offers.
  const referencedByField = new Map<string, Set<string>>();
  for (const { owner, cond } of allConditions(config)) {
    const controller = byId.get(cond.field);
    if (!controller) {
      issues.push({
        code: 'unknown-controller',
        target: owner,
        message: `A rule points at "${cond.field}", which is not a question on this form.`,
      });
      continue;
    }
    const seen = referencedByField.get(cond.field) ?? new Set<string>();
    const options = controller.options ?? [];
    for (const v of referencedValues(cond)) {
      seen.add(v);
      if (options.length > 0 && !options.some((o) => o.value === v)) {
        issues.push({
          code: 'unknown-option',
          target: owner,
          message: `A rule waits for "${controller.label}" to be "${v}", which is not one of its answers.`,
        });
      }
    }
    referencedByField.set(cond.field, seen);
  }

  // 3. Rules must not chase each other in a circle.
  const cycle = findCycle(config);
  if (cycle) {
    issues.push({
      code: 'cycle',
      target: cycle[0],
      message: `These questions depend on each other in a loop: ${cycle.join(' to ')}.`,
    });
  }

  // 4. Generate the decision matrix and see what can actually appear.
  const candidates = [...referencedByField.keys()]
    .map((id) => byId.get(id))
    .filter((f): f is FieldConfig => !!f && CHOICE_TYPES.has(f.type) && (f.options?.length ?? 0) > 0);
  // The reporter path decides which half of the form exists at all, so it is
  // always the first decision variable and is never the one dropped.
  const rootField = byId.get('reporterType');
  const ordered = rootField
    ? [rootField, ...candidates.filter((f) => f.id !== rootField.id)]
    : candidates;

  // Take whole variables while the full cartesian still fits under the ceiling.
  // Dropping a variable keeps the remaining matrix exhaustive; truncating the
  // combination list part-way through would bias it toward the first answers.
  const variables: FieldConfig[] = [];
  let projected = 1;
  let truncated = false;
  for (const variable of ordered) {
    const width = candidateValues(variable, referencedByField.get(variable.id) ?? new Set()).length;
    if (projected * width > MAX_COMBINATIONS) {
      truncated = true;
      continue;
    }
    projected *= width;
    variables.push(variable);
  }

  let combos: FormValues[] = [{}];
  for (const variable of variables) {
    const values = candidateValues(variable, referencedByField.get(variable.id) ?? new Set());
    const next: FormValues[] = [];
    for (const base of combos) {
      for (const value of values) {
        if (value === undefined) next.push({ ...base });
        else next.push({ ...base, [variable.id]: value } as FormValues);
      }
    }
    combos = next;
  }

  const fieldsSeen = new Set<string>();
  const sectionsSeen = new Set<string>();
  const settled: FormValues[] = [];
  for (const raw of combos) {
    // A cartesian product over answer values includes states the running form
    // will not hold. Choosing the provider path drops answers to public-only
    // questions, so a rule depending on one of those can never be satisfied
    // there, and asking whether a question is reachable has to be asked of the
    // states the form can actually be in. Projecting each combination through
    // the same function the application uses on a path switch is what makes
    // the check's notion of reachable and the form's the same notion.
    const onPath =
      raw.reporterType === undefined ? raw : carryAnswersAcross(config, raw, raw.reporterType);
    const values = settleForward(config, onPath);
    settled.push(values);
    for (const id of visibleFieldIds(config, values)) {
      fieldsSeen.add(id);
      // Repeated instances store under `${fieldId}__${instance}`.
      fieldsSeen.add(id.replace(/__\d+$/, ''));
    }
    for (const resolved of getVisibleForm(config, values)) sectionsSeen.add(resolved.section.id);
  }

  for (const section of config.sections) {
    if (!sectionsSeen.has(section.id)) {
      issues.push({
        code: 'unreachable-section',
        target: section.id,
        message: `The "${section.title}" section can never appear, whatever the reporter answers.`,
      });
      continue;
    }
    for (const field of section.fields) {
      if (!fieldsSeen.has(field.id)) {
        issues.push({
          code: 'unreachable-field',
          target: field.id,
          message: `"${field.label}" can never appear, whatever the reporter answers.`,
        });
      }
    }
  }

  // A question can be reachable and still have stopped reaching people. Moving
  // one into a provider-only section leaves it reachable, and quietly removes
  // it from every member of the public who used to answer it. Comparing which
  // paths reach each question against the configuration as it shipped is what
  // catches that.
  if (baseline) {
    const now = pathsReachingEachField(config, settled);
    const before = pathsReachingEachField(baseline, settled);
    const labelOf = new Map(
      config.sections.flatMap((s) => s.fields).map((f) => [f.id, f.label || f.id]),
    );
    const requiredIds = new Set(
      config.sections
        .flatMap((s) => s.fields)
        .filter((f) => f.required === true)
        .map((f) => f.id),
    );
    const readable: Record<string, string> = {
      public: 'members of the public',
      provider: 'healthcare providers',
    };
    for (const [id, paths] of before) {
      if (!labelOf.has(id)) continue;
      // Narrowing an optional question to one path is a content decision the
      // surface exists to allow. A required one is different: the people who
      // lose it stop being asked for something the form says it must have, and
      // nothing else in the product would tell anyone.
      if (!requiredIds.has(id)) continue;
      const lost = [...paths].filter((p) => !(now.get(id) ?? new Set()).has(p));
      for (const path of lost) {
        issues.push({
          code: 'lost-path',
          target: id,
          message: `"${labelOf.get(id)}" is required, and no longer appears for ${readable[path] ?? path}, who saw it before. It would stop being collected from them entirely.`,
        });
      }
    }
  }

  // 6. Every question must exist in every language the form is published in.
  //    A question added in English alone would appear in Spanish as English
  //    text, which is not a bilingual form, it is a form with a hole in it. The
  //    gap is reported per question rather than per string, because a person
  //    fixes a question, and the exact key list is returned separately for the
  //    editor to mark the individual inputs.
  const missingTranslations = translation
    ? missingKeys(config, translation.translations, translation.faqs ?? [])
    : [];
  const translationIssues: ConfigIssue[] = [];
  if (translation && missingTranslations.length > 0) {
    const labelOfField = new Map(fields.map((f) => [f.id, f.label || f.id]));
    const titleOfSection = new Map(config.sections.map((s) => [s.id, s.title || s.id]));
    const byOwner = new Map<string, { target: string; describe: string; count: number }>();
    for (const key of missingTranslations) {
      const { kind, id } = keyOwner(key);
      const describe =
        kind === 'field'
          ? `the question "${labelOfField.get(id) ?? id}"`
          : kind === 'section'
            ? `the "${titleOfSection.get(id) ?? id}" section`
            : kind === 'survey'
              ? 'the satisfaction survey'
              : kind === 'faq'
                ? 'a frequently asked question'
                : 'the form title and introduction';
      const ownerKey = `${kind}:${id}`;
      const seen = byOwner.get(ownerKey);
      if (seen) seen.count += 1;
      else byOwner.set(ownerKey, { target: id || kind, describe, count: 1 });
    }
    for (const { target, describe, count } of byOwner.values()) {
      // Reads as its own sentence, because it is used both on its own in a list
      // and after a full stop in the refusal a publish returns.
      const sentence = `${describe} still needs ${translation.languageName} for ${count === 1 ? 'one piece of wording' : `${count} pieces of wording`}.`;
      translationIssues.push({
        code: 'missing-translation',
        target,
        message: sentence.charAt(0).toUpperCase() + sentence.slice(1),
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    combinations: combos.length,
    fieldsChecked: fields.length,
    truncated,
    missingTranslations,
    translationIssues,
    translationOk: missingTranslations.length === 0,
  };
}
