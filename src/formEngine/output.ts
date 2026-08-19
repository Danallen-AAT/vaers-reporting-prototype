// ---------------------------------------------------------------------------
// Structured output (PWS 1.9 preview). Assembles a clean, VAERS-compatible JSON
// object from the currently-visible answers only - demonstrating
// integration-readiness without a real backend. Nothing is persisted.
// ---------------------------------------------------------------------------
import type { FormConfig, FormValues } from '../config/types';
import { getVisibleForm } from './visibility';

export interface StructuredOutput {
  reporterType: string | null;
  answers: Record<string, string | string[] | boolean>;
  meta: { formVersion: string };
}

export function buildStructuredOutput(config: FormConfig, values: FormValues): StructuredOutput {
  const answers: Record<string, string | string[] | boolean> = {};
  for (const { fields } of getVisibleForm(config, values)) {
    for (const f of fields) {
      const v = values[f.id];
      if (v === undefined || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      answers[f.id] = v;
    }
  }
  const reporterType = values.reporterType;
  return {
    reporterType: typeof reporterType === 'string' ? reporterType : null,
    answers,
    meta: { formVersion: config.version },
  };
}
