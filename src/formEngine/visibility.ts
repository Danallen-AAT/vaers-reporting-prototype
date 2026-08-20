// ---------------------------------------------------------------------------
// Branching engine (PRS#1). Pure functions over (config, values) - no React -
// so the exact field presentation/suppression can be unit-tested in isolation.
// ---------------------------------------------------------------------------
import {
  repeatCountKey,
  type Condition,
  type FieldConfig,
  type FormConfig,
  type FormValues,
  type ReporterPath,
  type SectionConfig,
} from '../config/types';

export type ActivePath = 'public' | 'provider' | undefined;

/** The chosen reporter path, or undefined before a reporter type is selected. */
export function getReporterPath(values: FormValues): ActivePath {
  const rt = values.reporterType;
  return rt === 'public' || rt === 'provider' ? rt : undefined;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/** Evaluate a single branching predicate against the current answers. */
export function evalCondition(cond: Condition, values: FormValues): boolean {
  const v = values[cond.field];
  if (cond.equals !== undefined) return v === cond.equals;
  if (cond.notEquals !== undefined) return v !== cond.notEquals;
  if (cond.in !== undefined) return typeof v === 'string' && cond.in.includes(v);
  if (cond.includes !== undefined) return Array.isArray(v) && v.includes(cond.includes);
  if (cond.isFilled !== undefined) return cond.isFilled ? !isEmpty(v) : isEmpty(v);
  return true;
}

/** AND across all conditions. An empty/undefined list is vacuously true. */
export function evalConditions(conds: Condition[] | undefined, values: FormValues): boolean {
  if (!conds || conds.length === 0) return true;
  return conds.every((c) => evalCondition(c, values));
}

/**
 * Whether a field/section on `fieldPath` is allowed for the active reporter
 * path. Everything is gated until a reporter type is chosen, so the form opens
 * as a single branching decision.
 */
export function pathMatches(fieldPath: ReporterPath, active: ActivePath): boolean {
  if (active === undefined) return false;
  if (fieldPath === 'both') return true;
  return fieldPath === active;
}

export function isFieldVisible(field: FieldConfig, values: FormValues): boolean {
  // The reporter-type question is the entry point and is always shown.
  if (field.id === 'reporterType') return true;
  if (!pathMatches(field.path, getReporterPath(values))) return false;
  if (!evalConditions(field.visibleWhen, values)) return false;
  if (field.suppressWhen && evalConditions(field.suppressWhen, values)) return false;
  return true;
}

export function isSectionVisible(section: SectionConfig, values: FormValues): boolean {
  const active = getReporterPath(values);
  // The section-level path gate only applies once a reporter type is chosen.
  // Before that, field-level visibility (which surfaces the reporter-type
  // entry point) governs - otherwise the opening question would be gated out.
  if (active !== undefined && section.path && !pathMatches(section.path, active)) return false;
  if (!evalConditions(section.visibleWhen, values)) return false;
  if (section.suppressWhen && evalConditions(section.suppressWhen, values)) return false;
  // A section with no currently-visible fields is itself hidden.
  return section.fields.some((f) => isFieldVisible(f, values));
}

export interface ResolvedSection {
  section: SectionConfig;
  fields: FieldConfig[];
  /** Instances to render. Always 1 for a section that does not repeat. */
  instances: number;
}

/**
 * How many instances of a repeatable section are present, clamped to the
 * configured bounds. Sections that do not repeat always return 1.
 */
export function getRepeatCount(section: SectionConfig, values: FormValues): number {
  if (!section.repeat) return 1;
  const raw = values[repeatCountKey(section.id)];
  const n = typeof raw === 'string' ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return section.repeat.min;
  return Math.min(Math.max(n, section.repeat.min), section.repeat.max);
}

/** The sections and fields to render right now, in config order. */
export function getVisibleForm(config: FormConfig, values: FormValues): ResolvedSection[] {
  const out: ResolvedSection[] = [];
  for (const section of config.sections) {
    if (!isSectionVisible(section, values)) continue;
    const fields = section.fields.filter((f) => isFieldVisible(f, values));
    if (fields.length > 0) {
      out.push({ section, fields, instances: getRepeatCount(section, values) });
    }
  }
  return out;
}

/** Flat set of currently-visible field ids - convenient for tests. */
export function visibleFieldIds(config: FormConfig, values: FormValues): Set<string> {
  const ids = new Set<string>();
  for (const { fields } of getVisibleForm(config, values)) {
    for (const f of fields) ids.add(f.id);
  }
  return ids;
}
