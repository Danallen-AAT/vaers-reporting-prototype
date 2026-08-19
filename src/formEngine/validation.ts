// ---------------------------------------------------------------------------
// Validation - only ever applied to currently-visible fields, so a suppressed
// branch (e.g. the hidden Adverse Event section) never blocks submission.
// ---------------------------------------------------------------------------
import type { FieldConfig, FormConfig, FormValues } from '../config/types';
import { getVisibleForm } from './visibility';

export type Errors = Record<string, string>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A visible field is required if flagged `true` or `'conditional'`. */
export function isRequired(field: FieldConfig): boolean {
  return field.required === true || field.required === 'conditional';
}

function isBlank(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function validateField(field: FieldConfig, values: FormValues): string | undefined {
  const value = values[field.id];

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

/** Validate every visible field; returns a map of fieldId -> message. */
export function validateForm(config: FormConfig, values: FormValues): Errors {
  const errors: Errors = {};
  for (const { fields } of getVisibleForm(config, values)) {
    for (const field of fields) {
      const err = validateField(field, values);
      if (err) errors[field.id] = err;
    }
  }
  return errors;
}
