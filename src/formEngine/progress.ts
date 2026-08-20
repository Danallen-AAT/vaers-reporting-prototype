// ---------------------------------------------------------------------------
// Completion progress. Pure functions over (config, values) - no React - so the
// same rules that decide what is visible also decide what counts as done.
//
// Progress is derived from the branching engine rather than from a fixed list
// of sections. That matters: when a provider reports an administration error
// with no adverse event, the whole Adverse event section is suppressed, and it
// must also disappear from the progress readout rather than sit there forever
// incomplete. Deriving both from getVisibleForm is what keeps them honest.
// ---------------------------------------------------------------------------
import {
  repeatFieldId,
  type FieldConfig,
  type FormConfig,
  type FormValues,
  type SectionConfig,
} from '../config/types';
import { getVisibleForm } from './visibility';

/**
 * `optional` is a distinct state, not a flavour of complete. A section with no
 * required fields has nothing outstanding, but showing it ticked before anyone
 * has touched it reads as a bug, so it gets its own neutral marker.
 */
export type SectionState = 'empty' | 'partial' | 'complete' | 'optional';

export interface SectionProgress {
  id: string;
  /** Resolved for the active path, so the readout matches the headings. */
  title: string;
  state: SectionState;
  /** Required visible fields, summed across repeat instances. */
  required: number;
  /** How many of those carry an answer. */
  filled: number;
}

export interface FormProgress {
  sections: SectionProgress[];
  requiredTotal: number;
  requiredFilled: number;
  /** 0 to 100, of required fields only. */
  percent: number;
  /** Every required field on every visible section has an answer. */
  complete: boolean;
}

/** An unchecked box and an empty array are both "not answered". */
function hasValue(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false;
  if (Array.isArray(v)) return v.length > 0;
  if (v === false) return false;
  return true;
}

function isRequired(f: FieldConfig): boolean {
  return f.required === true || f.required === 'conditional';
}

function titleOf(s: SectionConfig, isPublic: boolean): string {
  return isPublic && s.publicTitle ? s.publicTitle : s.title;
}

export function getFormProgress(
  config: FormConfig,
  values: FormValues,
  isPublic = false,
): FormProgress {
  const sections: SectionProgress[] = [];
  let requiredTotal = 0;
  let requiredFilled = 0;

  for (const { section, fields, instances } of getVisibleForm(config, values)) {
    let required = 0;
    let filled = 0;
    let touched = false;

    for (let i = 0; i < instances; i++) {
      for (const f of fields) {
        const answered = hasValue(values[repeatFieldId(f.id, i)]);
        if (answered) touched = true;
        if (isRequired(f)) {
          required++;
          if (answered) filled++;
        }
      }
    }

    requiredTotal += required;
    requiredFilled += filled;

    let state: SectionState;
    if (required === 0) state = touched ? 'complete' : 'optional';
    else if (filled === 0) state = 'empty';
    else if (filled === required) state = 'complete';
    else state = 'partial';

    sections.push({ id: section.id, title: titleOf(section, isPublic), state, required, filled });
  }

  return {
    sections,
    requiredTotal,
    requiredFilled,
    percent: requiredTotal === 0 ? 0 : Math.round((requiredFilled / requiredTotal) * 100),
    complete: requiredTotal > 0 && requiredFilled === requiredTotal,
  };
}
