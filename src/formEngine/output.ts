// ---------------------------------------------------------------------------
// Structured output (PWS 1.9 preview). Assembles a clean, VAERS-compatible JSON
// object from the currently-visible answers only, demonstrating
// integration-readiness without a real backend. Nothing is persisted.
//
// Repeatable sections emit an array so that a report covering several vaccines
// given at one visit maps cleanly onto the VAERS record structure.
// ---------------------------------------------------------------------------
import { repeatFieldId, type FormConfig, type FormValues } from '../config/types';
import { getVisibleForm } from './visibility';

type Answer = string | string[] | boolean;

export interface StructuredOutput {
  reporterType: string | null;
  answers: Record<string, Answer>;
  /** One entry per instance, for each section that repeats. */
  repeated: Record<string, Array<Record<string, Answer>>>;
  meta: { formVersion: string };
}

function keep(v: unknown): v is Answer {
  if (v === undefined || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

export function buildStructuredOutput(config: FormConfig, values: FormValues): StructuredOutput {
  const answers: Record<string, Answer> = {};
  const repeated: Record<string, Array<Record<string, Answer>>> = {};

  for (const { section, fields, instances } of getVisibleForm(config, values)) {
    if (section.repeat) {
      const rows: Array<Record<string, Answer>> = [];
      for (let i = 0; i < instances; i++) {
        const row: Record<string, Answer> = {};
        for (const f of fields) {
          const v = values[repeatFieldId(f.id, i)];
          if (keep(v)) row[f.id] = v;
        }
        // Skip instances the reporter added but left entirely blank.
        if (Object.keys(row).length > 0) rows.push(row);
      }
      if (rows.length > 0) repeated[section.id] = rows;
      continue;
    }

    for (const f of fields) {
      const v = values[f.id];
      if (keep(v)) answers[f.id] = v;
    }
  }

  const reporterType = values.reporterType;
  return {
    reporterType: typeof reporterType === 'string' ? reporterType : null,
    answers,
    repeated,
    meta: { formVersion: config.version },
  };
}
