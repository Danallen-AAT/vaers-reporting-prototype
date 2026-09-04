// ---------------------------------------------------------------------------
// Validation - only ever applied to currently-visible fields, so a suppressed
// branch (e.g. the hidden Adverse Event section) never blocks submission.
// ---------------------------------------------------------------------------
import { repeatFieldId, type FieldConfig, type FormConfig, type FormValues } from '../config/types';
import { getVisibleForm } from './visibility';
import { isBlankText } from './configCheck';

export type Errors = Record<string, string>;

/**
 * The four things validation can say, in whatever language the reporter is
 * reading. They are passed in rather than imported so the engine stays free of
 * both React and the interface string table: it decides that an answer is
 * missing, and the caller decides how to say so.
 */
export interface ValidationMessages {
  required: string;
  email: string;
  number: string;
  min0: string;
  future: string;
  /** Takes {field}, the label of the date this one must not precede. */
  before: string;
}

const EN: ValidationMessages = {
  required: 'This field is required.',
  email: 'Enter a valid email address.',
  number: 'Enter a number.',
  min0: 'Enter a value of 0 or more.',
  future: 'This date is in the future. Check it and enter the date it happened.',
  before: 'This date is before {field}. Check both dates.',
};

/** Today, as the yyyy-mm-dd string a date input produces, in local time. */
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A visible field is required if flagged `true` or `'conditional'`. */
export function isRequired(field: FieldConfig): boolean {
  return field.required === true || field.required === 'conditional';
}

function isBlank(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  // A space bar is not an answer, and neither are invisible characters, so a
  // required question is not satisfied by either.
  if (typeof v === 'string') return isBlankText(v);
  return false;
}

export function validateField(
  field: FieldConfig,
  values: FormValues,
  instance = 0,
  messages: ValidationMessages = EN,
  labelOf?: (fieldId: string) => string,
): string | undefined {
  const value = values[repeatFieldId(field.id, instance)];

  if (isRequired(field) && isBlank(value)) {
    return messages.required;
  }
  if (field.type === 'email' && typeof value === 'string' && value !== '') {
    if (!EMAIL_RE.test(value)) return messages.email;
  }
  if (field.type === 'number' && typeof value === 'string' && value !== '') {
    const n = Number(value);
    if (Number.isNaN(n)) return messages.number;
    if (n < 0) return messages.min0;
  }
  // Date sanity. The rules live in the schema, so a program officer can see
  // them; the engine only applies them. ISO yyyy-mm-dd compares correctly as a
  // string, which is what a date input always produces.
  if (field.type === 'date' && typeof value === 'string' && value !== '') {
    if (field.notInFuture && value > todayISO()) return messages.future;
    if (field.notBefore) {
      const other = values[repeatFieldId(field.notBefore, instance)] ?? values[field.notBefore];
      if (typeof other === 'string' && other !== '' && value < other) {
        return messages.before.replace('{field}', labelOf?.(field.notBefore) ?? field.notBefore);
      }
    }
  }
  return undefined;
}

/**
 * Validate every visible field, across every instance of a repeated section.
 * Error keys use the same instance-aware id as the inputs, so a message always
 * lands on the control that produced it.
 */
export function validateForm(
  config: FormConfig,
  values: FormValues,
  messages: ValidationMessages = EN,
): Errors {
  const errors: Errors = {};
  const labels = new Map(
    config.sections.flatMap((s) => s.fields).map((f) => [f.id, f.label || f.id]),
  );
  const labelOf = (id: string) => labels.get(id) ?? id;
  for (const { fields, instances } of getVisibleForm(config, values)) {
    for (let i = 0; i < instances; i++) {
      for (const field of fields) {
        const err = validateField(field, values, i, messages, labelOf);
        if (err) errors[repeatFieldId(field.id, i)] = err;
      }
    }
  }
  return errors;
}
