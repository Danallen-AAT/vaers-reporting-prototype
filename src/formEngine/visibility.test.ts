// ---------------------------------------------------------------------------
// PRS#1 branching suite - the scored behavior. These assert exact field
// presentation/suppression against the real config, covering the five test
// scenarios enumerated in VAERS-FORM-MODEL.md. Must stay 100% green.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { vaersForm } from '../config/vaersForm';
import { isSectionVisible, visibleFieldIds } from './visibility';
import type { FormValues } from '../config/types';

const ids = (values: FormValues) => visibleFieldIds(vaersForm, values);
const section = (id: string) => vaersForm.sections.find((s) => s.id === id)!;

describe('reporter-type gate', () => {
  it('shows only the reporter-type question before a path is chosen', () => {
    const visible = ids({});
    expect(visible.has('reporterType')).toBe(true);
    expect(visible.size).toBe(1);
    // No downstream fields leak in.
    expect(visible.has('reporterName')).toBe(false);
    expect(visible.has('patientAgeAtVax')).toBe(false);
  });
});

describe('scenario 1 - public reporter', () => {
  const v: FormValues = { reporterType: 'public' };

  it('shows plain-language reporter/patient fields', () => {
    const visible = ids(v);
    expect(visible.has('reporterName')).toBe(true);
    expect(visible.has('relationToPatient')).toBe(true); // public-only
    expect(visible.has('patientAgeAtVax')).toBe(true);
  });

  it('hides all provider-only fields', () => {
    const visible = ids(v);
    for (const providerOnly of ['vaxRoute', 'vaxSite', 'labData', 'isAdminError']) {
      expect(visible.has(providerOnly)).toBe(false);
    }
  });

  it('shows the adverse-event section by default (no error branch on public)', () => {
    expect(isSectionVisible(section('adverseEvent'), v)).toBe(true);
    expect(ids(v).has('aeDescription')).toBe(true);
  });
});

describe('scenario 2 - provider, no administration error', () => {
  const v: FormValues = { reporterType: 'provider', isAdminError: 'no' };

  it('shows the full clinical field set incl. provider-only fields', () => {
    const visible = ids(v);
    expect(visible.has('vaxRoute')).toBe(true);
    expect(visible.has('vaxSite')).toBe(true);
    expect(visible.has('labData')).toBe(true);
    expect(visible.has('relationToPatient')).toBe(false); // public-only stays hidden
  });

  it('keeps the adverse-event section present and error sub-fields hidden', () => {
    const visible = ids(v);
    expect(visible.has('aeOnsetDate')).toBe(true);
    expect(visible.has('aeDescription')).toBe(true);
    expect(visible.has('errorType')).toBe(false);
    expect(visible.has('errorDescription')).toBe(false);
  });
});

describe('scenario 3 - provider, administration error WITH adverse event', () => {
  const v: FormValues = {
    reporterType: 'provider',
    isAdminError: 'yes',
    errorHadAE: 'yes',
  };

  it('shows BOTH the error section and the adverse-event section', () => {
    const visible = ids(v);
    // Error branch
    expect(visible.has('errorType')).toBe(true);
    expect(visible.has('errorDescription')).toBe(true);
    // Adverse event still present
    expect(isSectionVisible(section('adverseEvent'), v)).toBe(true);
    expect(visible.has('aeDescription')).toBe(true);
    expect(visible.has('aeSeriousness')).toBe(true);
  });
});

describe('scenario 4 - provider, administration error with NO adverse event (marquee)', () => {
  const v: FormValues = {
    reporterType: 'provider',
    isAdminError: 'yes',
    errorHadAE: 'no',
  };

  it('collects error details', () => {
    const visible = ids(v);
    expect(visible.has('errorType')).toBe(true);
    expect(visible.has('errorHadAE')).toBe(true);
    expect(visible.has('errorDescription')).toBe(true);
  });

  it('SUPPRESSES the entire adverse-event section', () => {
    expect(isSectionVisible(section('adverseEvent'), v)).toBe(false);
    const visible = ids(v);
    for (const aeField of [
      'aeOnsetDate',
      'aeDescription',
      'aeSeriousness',
      'aeTreatment',
      'aeOutcome',
    ]) {
      expect(visible.has(aeField)).toBe(false);
    }
  });

  it('also suppresses the AE-dependent recovery field in the patient section', () => {
    expect(ids(v).has('patientRecovered')).toBe(false);
  });
});

describe('scenario 5 - seriousness follow-ups', () => {
  const base: FormValues = { reporterType: 'provider', isAdminError: 'no' };

  it('reveals date-of-death only when "died" is checked', () => {
    expect(ids({ ...base, aeSeriousness: ['died'] }).has('aeDeathDate')).toBe(true);
    expect(ids({ ...base, aeSeriousness: ['hospitalized'] }).has('aeDeathDate')).toBe(false);
  });

  it('reveals hospital-days only when "hospitalized" is checked', () => {
    expect(ids({ ...base, aeSeriousness: ['hospitalized'] }).has('aeHospDays')).toBe(true);
    expect(ids({ ...base, aeSeriousness: ['died'] }).has('aeHospDays')).toBe(false);
  });

  it('reveals both when both criteria are checked', () => {
    const visible = ids({ ...base, aeSeriousness: ['died', 'hospitalized'] });
    expect(visible.has('aeDeathDate')).toBe(true);
    expect(visible.has('aeHospDays')).toBe(true);
  });
});

describe('guardrails', () => {
  it('never surfaces the provider error branch on the public path', () => {
    // Even if a stale value existed, path filtering must win.
    const visible = ids({ reporterType: 'public', isAdminError: 'yes' });
    expect(visible.has('isAdminError')).toBe(false);
    expect(visible.has('errorType')).toBe(false);
    expect(isSectionVisible(section('adminError'), { reporterType: 'public' })).toBe(false);
  });
});
