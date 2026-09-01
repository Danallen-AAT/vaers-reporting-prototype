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
import { getVisibleForm, visibleFieldIds } from './visibility';

const CHOICE_TYPES = new Set(['radio', 'select', 'multiselect', 'checkbox']);
/** Ceiling on the generated matrix, so a rich configuration cannot hang the UI. */
const MAX_COMBINATIONS = 4096;

export type IssueCode =
  | 'unknown-controller'
  | 'unknown-option'
  | 'cycle'
  | 'unreachable-field'
  | 'unreachable-section';

export interface ConfigIssue {
  code: IssueCode;
  /** The field or section the issue is about. */
  target: string;
  /** Plain language, written for a program officer rather than a developer. */
  message: string;
}

export interface ConfigCheckResult {
  ok: boolean;
  issues: ConfigIssue[];
  /** How many answer combinations were evaluated. */
  combinations: number;
  fieldsChecked: number;
  /** True when the matrix hit its ceiling and was cut short. */
  truncated: boolean;
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

export function checkConfiguration(config: FormConfig): ConfigCheckResult {
  const fields = allFields(config);
  const byId = new Map(fields.map((f) => [f.id, f]));
  const issues: ConfigIssue[] = [];

  // 1. Every predicate must name a question that exists, and compare against a
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

  // 2. Rules must not chase each other in a circle.
  const cycle = findCycle(config);
  if (cycle) {
    issues.push({
      code: 'cycle',
      target: cycle[0],
      message: `These questions depend on each other in a loop: ${cycle.join(' to ')}.`,
    });
  }

  // 3. Generate the decision matrix and see what can actually appear.
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
  for (const values of combos) {
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

  return {
    ok: issues.length === 0,
    issues,
    combinations: combos.length,
    fieldsChecked: fields.length,
    truncated,
  };
}
