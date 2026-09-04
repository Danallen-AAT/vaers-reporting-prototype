// ---------------------------------------------------------------------------
// Date sanity (PWS 1.3, intelligent assistance).
//
// Found by a reviewer exercising the deployed prototype: a vaccination dated
// 2099, an onset twenty six years before the vaccination, and a date of birth
// in 2030 were all accepted and reached the submitted record. A form that takes
// those without comment is not assisting anybody.
//
// The rules live in the schema, like the branching rules, so a program officer
// can see and change them. These tests exercise the engine that applies them.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { vaersForm } from '../config/vaersForm';
import { validateForm } from './validation';
import type { FormValues } from '../config/types';

const base: FormValues = {
  reporterType: 'provider',
  reporterName: 'A. Nurse',
  patientAgeAtVax: '42',
  patientSex: 'F',
  patientRecovered: 'yes',
  vaxType: 'covid19',
  aeDescription: 'Fever.',
  aeSeriousness: ['none'],
};

const yesterday = () => {
  const d = new Date(Date.now() - 86400000);
  return d.toISOString().slice(0, 10);
};
const nextYear = () => `${new Date().getFullYear() + 1}-01-01`;

describe('dates that cannot be right', () => {
  it('rejects a vaccination date in the future', () => {
    const errors = validateForm(vaersForm, { ...base, vaxDate: '2099-01-01' });
    expect(errors.vaxDate).toMatch(/future/i);
  });

  it('rejects a date of birth in the future', () => {
    const errors = validateForm(vaersForm, { ...base, patientDob: nextYear() });
    expect(errors.patientDob).toMatch(/future/i);
  });

  it('rejects an onset before the vaccination it followed', () => {
    const errors = validateForm(vaersForm, {
      ...base,
      vaxDate: '2026-01-05',
      aeOnsetDate: '2000-01-01',
    });
    expect(errors.aeOnsetDate).toMatch(/before/i);
    expect(errors.aeOnsetDate).toContain('Vaccination date');
  });

  it('rejects a death before the onset it followed', () => {
    const errors = validateForm(vaersForm, {
      ...base,
      vaxDate: '2026-01-05',
      aeOnsetDate: '2026-01-06',
      aeSeriousness: ['died'],
      aeDeathDate: '2026-01-01',
    });
    expect(errors.aeDeathDate).toMatch(/before/i);
  });
});

describe('dates that are fine', () => {
  it('accepts a vaccination yesterday with onset today', () => {
    const errors = validateForm(vaersForm, {
      ...base,
      vaxDate: yesterday(),
      aeOnsetDate: new Date().toISOString().slice(0, 10),
    });
    expect(errors.vaxDate).toBeUndefined();
    expect(errors.aeOnsetDate).toBeUndefined();
  });

  it('accepts onset on the same day as the vaccination', () => {
    const errors = validateForm(vaersForm, {
      ...base,
      vaxDate: '2026-01-05',
      aeOnsetDate: '2026-01-05',
    });
    expect(errors.aeOnsetDate).toBeUndefined();
  });

  it('says nothing about a date question left blank', () => {
    const errors = validateForm(vaersForm, { ...base, vaxDate: '2026-01-05' });
    expect(errors.patientDob).toBeUndefined();
  });
});
