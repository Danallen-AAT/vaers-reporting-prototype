// ---------------------------------------------------------------------------
// Validation is branch-aware: suppressed required fields must never block a
// valid submission, and only visible required fields are enforced.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { vaersForm } from '../config/vaersForm';
import { validateForm } from './validation';

describe('validation respects branching', () => {
  it('does not require the suppressed adverse-event fields', () => {
    const errors = validateForm(vaersForm, {
      reporterType: 'provider',
      isAdminError: 'yes',
      errorHadAE: 'no',
      reporterName: 'Test Provider',
      patientAgeAtVax: '40',
      patientSex: 'F',
      vaxType: 'covid19',
      vaxDate: '2026-01-01',
      errorType: ['wrong_dose'],
      errorDescription: 'Administered 0.5 mL instead of 0.3 mL.',
    });
    expect(errors.aeOnsetDate).toBeUndefined();
    expect(errors.aeDescription).toBeUndefined();
    expect(errors.aeSeriousness).toBeUndefined();
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('enforces visible required fields and ignores hidden ones', () => {
    const errors = validateForm(vaersForm, { reporterType: 'public' });
    expect(errors.reporterName).toBeDefined();
    expect(errors.patientAgeAtVax).toBeDefined();
    expect(errors.isAdminError).toBeUndefined(); // provider-only, hidden
  });

  it('flags a malformed email address', () => {
    const errors = validateForm(vaersForm, {
      reporterType: 'public',
      reporterName: 'A. Reporter',
      reporterEmail: 'not-an-email',
      patientAgeAtVax: '5',
      patientSex: 'M',
      vaxType: 'mmr',
      vaxDate: '2026-02-02',
      relationToPatient: 'parent',
    });
    expect(errors.reporterEmail).toMatch(/valid email/i);
  });
});
