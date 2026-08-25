// ---------------------------------------------------------------------------
// Structured output (PWS 1.9). Assembles a clean, VAERS-compatible JSON object
// from the currently-visible answers only. Nothing is persisted.
//
// Repeatable sections emit an array so that a report covering several vaccines
// given at one visit maps cleanly onto the VAERS record structure.
//
// THE MAPPING BOUNDARY
// Every answer is keyed by the field's `vaersElement` where one is set, and by
// the internal field id where one is not. PWS Section 9 states that CDC
// furnishes the authoritative data element definitions at kickoff, so no target
// names exist yet and every field currently falls back to its internal id.
//
// `meta.mapping` reports that state rather than hiding it: how many visible
// fields carry a target element, and which ones do not. Mapping completeness is
// therefore measurable from the moment the specification arrives, which is what
// PRS#6 (VAERS-compatible transmission, end-to-end validation against the
// CDC-provided specification) is graded on.
//
// This file is the only place that knows about the target schema. A change to
// CDC's structure is an edit here, not a rework of the form engine.
// ---------------------------------------------------------------------------
import { repeatFieldId, type FieldConfig, type FormConfig, type FormValues } from '../config/types';
import { getVisibleForm } from './visibility';

type Answer = string | string[] | boolean;

export interface MappingStatus {
  /** Visible fields that carry an answer. */
  answered: number;
  /** Of those, how many resolve to a CDC data element rather than an internal id. */
  mapped: number;
  /** Internal ids still awaiting a target element, sorted for stable output. */
  unmapped: string[];
}

export interface StructuredOutput {
  reporterType: string | null;
  answers: Record<string, Answer>;
  /** One entry per instance, for each section that repeats. */
  repeated: Record<string, Array<Record<string, Answer>>>;
  meta: { formVersion: string; mapping: MappingStatus };
}

function keep(v: unknown): v is Answer {
  if (v === undefined || v === '') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

/** The target key for a field: its CDC data element, or its internal id. */
export function outputKey(field: FieldConfig): string {
  return field.vaersElement ?? field.id;
}

export function buildStructuredOutput(config: FormConfig, values: FormValues): StructuredOutput {
  const answers: Record<string, Answer> = {};
  const repeated: Record<string, Array<Record<string, Answer>>> = {};
  let answered = 0;
  let mapped = 0;
  const unmapped = new Set<string>();

  const record = (f: FieldConfig) => {
    answered += 1;
    if (f.vaersElement) mapped += 1;
    else unmapped.add(f.id);
  };

  for (const { section, fields, instances } of getVisibleForm(config, values)) {
    if (section.repeat) {
      const rows: Array<Record<string, Answer>> = [];
      for (let i = 0; i < instances; i++) {
        const row: Record<string, Answer> = {};
        for (const f of fields) {
          const v = values[repeatFieldId(f.id, i)];
          if (keep(v)) {
            row[outputKey(f)] = v;
            record(f);
          }
        }
        // Skip instances the reporter added but left entirely blank.
        if (Object.keys(row).length > 0) rows.push(row);
      }
      if (rows.length > 0) repeated[section.id] = rows;
      continue;
    }

    for (const f of fields) {
      const v = values[f.id];
      if (keep(v)) {
        answers[outputKey(f)] = v;
        record(f);
      }
    }
  }

  const reporterType = values.reporterType;
  return {
    reporterType: typeof reporterType === 'string' ? reporterType : null,
    answers,
    repeated,
    meta: {
      formVersion: config.version,
      mapping: { answered, mapped, unmapped: [...unmapped].sort() },
    },
  };
}
