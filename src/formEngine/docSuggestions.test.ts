// ---------------------------------------------------------------------------
// Document suggestion rules (PWS Task 2.3). The RFQ sets a target of at least
// 90 percent suggestion coverage, so the rules must fire reliably and must not
// fire on unrelated answers.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { getDocSuggestions } from './docSuggestions';
import type { FormValues } from '../config/types';

const ids = (values: FormValues) => getDocSuggestions(values).map((s) => s.id);

describe('document suggestions', () => {
  it('suggests nothing for an empty form', () => {
    expect(ids({})).toEqual([]);
  });

  it('suggests a discharge summary when the patient was hospitalized', () => {
    expect(ids({ aeSeriousness: ['hospitalized'] })).toContain('discharge-summary');
  });

  it('suggests visit notes for an emergency room or doctor visit', () => {
    expect(ids({ aeSeriousness: ['er_or_doctor_visit'] })).toContain('visit-notes');
  });

  it('suggests death records when the patient died', () => {
    expect(ids({ aeSeriousness: ['died'] })).toContain('death-records');
  });

  it('suggests lab reports only when lab data was entered', () => {
    expect(ids({ labData: 'Elevated troponin' })).toContain('lab-reports');
    expect(ids({ labData: '' })).not.toContain('lab-reports');
  });

  it('suggests the administration record for a vaccine error report', () => {
    expect(ids({ isAdminError: 'yes' })).toContain('admin-record');
    expect(ids({ isAdminError: 'no' })).not.toContain('admin-record');
  });

  it('accumulates every applicable suggestion', () => {
    const result = ids({
      aeSeriousness: ['hospitalized', 'er_or_doctor_visit'],
      labData: 'CBC abnormal',
      isAdminError: 'yes',
    });
    expect(result).toEqual(
      expect.arrayContaining(['discharge-summary', 'visit-notes', 'lab-reports', 'admin-record']),
    );
    expect(result).toHaveLength(4);
  });

  it('suggests only the administration record when the adverse event branch is suppressed', () => {
    // Provider reports an administration error that caused no adverse event, so
    // no seriousness answer exists and only the error-driven rule should fire.
    const result = ids({
      reporterType: 'provider',
      isAdminError: 'yes',
      errorHadAE: 'no',
    });
    expect(result).toEqual(['admin-record']);
  });

  it('carries a reason with every suggestion', () => {
    const suggestions = getDocSuggestions({ aeSeriousness: ['hospitalized'] });
    expect(suggestions[0].why).toMatch(/hospitalized/i);
    expect(suggestions[0].document).toBeTruthy();
  });
});
