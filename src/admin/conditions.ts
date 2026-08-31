// ---------------------------------------------------------------------------
// Helpers for the visibility-condition editor. Conditions are the same
// declarative predicates the form engine evaluates (config/types Condition);
// this module only helps an administrator compose and read them safely:
// eligible controlling questions are limited to choice fields that exist, and
// a question can never be made to depend on itself or on anything downstream
// of it, so a cycle cannot be authored.
// ---------------------------------------------------------------------------
import type { Condition, FieldConfig, FormConfig } from '../config/types';

/** Every field in the form, flattened, with its section title for grouping.
 *  Cached per config object: the store produces a new config on every change,
 *  so the cache is always fresh and repeated renders stay cheap. */
const fieldsCache = new WeakMap<FormConfig, { field: FieldConfig; sectionTitle: string }[]>();
export function allFields(config: FormConfig): { field: FieldConfig; sectionTitle: string }[] {
  let v = fieldsCache.get(config);
  if (!v) {
    v = config.sections.flatMap((s) => s.fields.map((field) => ({ field, sectionTitle: s.title })));
    fieldsCache.set(config, v);
  }
  return v;
}

const CHOICE_TYPES = new Set(['radio', 'select', 'multiselect', 'checkbox']);

/** Field ids that `from` reaches through visibleWhen chains (its ancestors). */
function dependsOn(config: FormConfig, fromId: string, seen = new Set<string>()): Set<string> {
  if (seen.has(fromId)) return seen;
  seen.add(fromId);
  const f = allFields(config).find((x) => x.field.id === fromId)?.field;
  for (const c of f?.visibleWhen ?? []) dependsOn(config, c.field, seen);
  return seen;
}

/**
 * Questions allowed to control the visibility of `target`: choice questions
 * with defined options, excluding the target itself and anything that already
 * depends on the target (which would create a cycle).
 */
export function eligibleControllers(
  config: FormConfig,
  targetId: string,
): { field: FieldConfig; sectionTitle: string }[] {
  return allFields(config).filter(({ field }) => {
    if (field.id === targetId) return false;
    if (!CHOICE_TYPES.has(field.type) || !field.options?.length) return false;
    return !dependsOn(config, field.id).has(targetId);
  });
}

/** The operator appropriate to a controlling field's type. */
export function conditionFor(controller: FieldConfig, value: string): Condition {
  return controller.type === 'multiselect' || controller.type === 'checkbox'
    ? { field: controller.id, includes: value }
    : { field: controller.id, equals: value };
}

/** One predicate, in the administrator's language. */
function describeOne(config: FormConfig, c: Condition): string {
  const controller = allFields(config).find((x) => x.field.id === c.field)?.field;
  const name = controller ? `"${controller.label}"` : c.field;
  const opt = (v?: string) =>
    controller?.options?.find((o) => o.value === v)?.label ?? (v === undefined ? '' : `"${v}"`);
  if (c.equals !== undefined) return `${name} is "${opt(c.equals)}"`;
  if (c.notEquals !== undefined) return `${name} is not "${opt(c.notEquals)}"`;
  if (c.includes !== undefined) return `${name} includes "${opt(c.includes)}"`;
  if (c.in !== undefined) return `${name} is one of ${c.in.map((v) => `"${opt(v)}"`).join(', ')}`;
  if (c.isFilled !== undefined) return c.isFilled ? `${name} is answered` : `${name} is blank`;
  return name;
}

/** A whole rule ("shown when ...") in plain language, for any field. */
export function conditionText(config: FormConfig, field: FieldConfig): string | null {
  const parts: string[] = [];
  if (field.visibleWhen?.length) {
    parts.push(`Shown when ${field.visibleWhen.map((c) => describeOne(config, c)).join(' and ')}`);
  }
  if (field.suppressWhen?.length) {
    parts.push(`hidden when ${field.suppressWhen.map((c) => describeOne(config, c)).join(' and ')}`);
  }
  return parts.length ? parts.join('; ') : null;
}
