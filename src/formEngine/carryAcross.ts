// ---------------------------------------------------------------------------
// When the reporter type changes, the form reframes. Answers to questions the
// new path also asks are carried across; answers whose questions exist only on
// the other path are dropped along with their questions, so a stale hidden
// value can never drive branching or suppression on the new path (the vaccine
// error answer, for example, must not suppress the public path's Adverse Event
// section after a switch). Pure function, React-free, like the rest of the
// engine.
// ---------------------------------------------------------------------------
import { repeatCountKey, type FormConfig, type FormValues } from '../config/types';

function onPath(path: string | undefined, type: string): boolean {
  // An unset field path means the field follows its section everywhere.
  return path === undefined || path === 'both' || path === type;
}

export function carryAnswersAcross(
  config: FormConfig,
  values: FormValues,
  nextType: FormValues[string],
): FormValues {
  const type = String(nextType);
  const keep = new Set<string>();
  for (const section of config.sections) {
    if (!onPath(section.path, type)) continue;
    keep.add(repeatCountKey(section.id));
    for (const field of section.fields) {
      if (onPath(field.path, type)) keep.add(field.id);
    }
  }
  const next: FormValues = { reporterType: nextType };
  for (const [key, value] of Object.entries(values)) {
    if (key === 'reporterType') continue;
    // Repeated instances store under `${fieldId}__${instance}`.
    const base = key.replace(/__\d+$/, '');
    if (keep.has(key) || keep.has(base)) next[key] = value;
  }
  return next;
}
