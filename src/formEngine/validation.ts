// ---------------------------------------------------------------------------
// Validation - only ever applied to currently-visible fields, so a suppressed
// branch (e.g. the hidden Adverse Event section) never blocks submission.
// ---------------------------------------------------------------------------
import { repeatFieldId, type FieldConfig, type FormConfig, type FormValues } from '../config/types';
import { getVisibleForm } from './visibility';
import { isBlankText } from './configCheck';

export type Errors = Record<string, string>;

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
): string | undefined {
  const value = values[repeatFieldId(field.id, instance)];

  if (isRequired(field) && isBlank(value)) {
    return 'This field is required.';
  }
  if (field.type === 'email' && typeof value === 'string' && value !== '') {
    if (!EMAIL_RE.test(value)) return 'Enter a valid email address.';
  }
  if (field.type === 'number' && typeof value === 'string' && value !== '') {
    const n = Number(value);
    if (Number.isNaN(n)) return 'Enter a number.';
    if (n < 0) return 'Enter a value of 0 or more.';
  }
  return undefined;
}

/**
 * Validate every visible field, across every instance of a repeated section.
 * Error keys use the same instance-aware id as the inputs, so a message always
 * lands on the control that produced it.
 */
export function validateForm(config: FormConfig, values: FormValues): Errors {
  const errors: Errors = {};
  for (const { fields, instances } of getVisibleForm(config, values)) {
    for (let i = 0; i < instances; i++) {
      for (const field of fields) {
        const err = validateField(field, values, i);
        if (err) errors[repeatFieldId(field.id, i)] = err;
      }
    }
  }
  return errors;
}
