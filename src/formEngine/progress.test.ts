// ---------------------------------------------------------------------------
// Completion progress. The important property is that progress is derived from
// the same branching engine as visibility, so a suppressed section leaves the
// readout instead of sitting permanently unfinished.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { vaersForm } from '../config/vaersForm';
import { getFormProgress } from './progress';
import { repeatCountKey, type FormValues } from '../config/types';

const provider: FormValues = { reporterType: 'provider', isAdminError: 'no' };
const pub: FormValues = { reporterType: 'public' };

const ids = (v: FormValues) => getFormProgress(vaersForm, v).sections.map((s) => s.id);
const byId = (v: FormValues, id: string) =>
  getFormProgress(vaersForm, v).sections.find((s) => s.id === id);

describe('shape', () => {
  it('reports nothing before a reporter type is chosen beyond the entry section', () => {
    const p = getFormProgress(vaersForm, {});
    // Only the section carrying the reporter-type question can be visible.
    expect(p.sections.length).toBeLessThanOrEqual(1);
    expect(p.complete).toBe(false);
  });

  it('counts required answers, not all answers', () => {
    const p = getFormProgress(vaersForm, provider);
    expect(p.requiredTotal).toBeGreaterThan(0);
    // reporterType is answered and required, nothing else is.
    expect(p.requiredFilled).toBeGreaterThan(0);
    expect(p.requiredFilled).toBeLessThan(p.requiredTotal);
    expect(p.percent).toBeGreaterThan(0);
    expect(p.percent).toBeLessThan(100);
  });

  it('never reports a percentage outside 0 to 100', () => {
    for (const v of [{}, pub, provider, { ...provider, isAdminError: 'yes' }]) {
      const p = getFormProgress(vaersForm, v);
      expect(p.percent).toBeGreaterThanOrEqual(0);
      expect(p.percent).toBeLessThanOrEqual(100);
    }
  });
});

describe('section state', () => {
  it('marks a section with required fields and no answers as empty', () => {
    expect(byId(provider, 'vaccines')!.state).toBe('empty');
  });

  it('moves to partial once some but not all required fields are answered', () => {
    const s = byId({ ...provider, vaxType: 'covid19' }, 'vaccines')!;
    expect(s.state).toBe('partial');
    expect(s.filled).toBeGreaterThan(0);
    expect(s.filled).toBeLessThan(s.required);
  });

  it('reaches complete when every required field in the section is answered', () => {
    const s = byId({ ...provider, vaxType: 'covid19', vaxDate: '2026-03-01' }, 'vaccines')!;
    expect(s.state).toBe('complete');
    expect(s.filled).toBe(s.required);
  });

  it('uses a distinct optional state rather than pre-ticking sections with nothing required', () => {
    const s = byId(provider, 'clinical');
    if (s) {
      expect(s.required).toBe(0);
      expect(s.state).toBe('optional');
      // An untouched optional section must not read as done.
      expect(s.state).not.toBe('complete');
    }
  });

  it('marks an all-optional section complete once the reporter has answered something', () => {
    const s = byId({ ...provider, medHistory: 'Asthma' }, 'clinical');
    if (s) expect(s.state).toBe('complete');
  });
});

describe('branching is respected', () => {
  it('drops the adverse event section from progress when it is suppressed', () => {
    const suppressed: FormValues = {
      reporterType: 'provider',
      isAdminError: 'yes',
      errorHadAE: 'no',
    };
    expect(ids({ ...provider })).toContain('adverseEvent');
    expect(ids(suppressed)).not.toContain('adverseEvent');
  });

  it('does not count required fields of a suppressed section toward the total', () => {
    const shown = getFormProgress(vaersForm, { reporterType: 'provider', isAdminError: 'yes', errorHadAE: 'yes' });
    const hidden = getFormProgress(vaersForm, { reporterType: 'provider', isAdminError: 'yes', errorHadAE: 'no' });
    expect(hidden.requiredTotal).toBeLessThan(shown.requiredTotal);
  });

  it('excludes provider-only sections from the public path', () => {
    expect(ids(pub)).not.toContain('adminError');
  });
});

describe('repeat instances', () => {
  it('counts required fields once per instance', () => {
    const one = byId({ ...provider, [repeatCountKey('vaccines')]: '1' }, 'vaccines')!;
    const three = byId({ ...provider, [repeatCountKey('vaccines')]: '3' }, 'vaccines')!;
    expect(three.required).toBe(one.required * 3);
  });

  it('stays partial while a later instance is still blank', () => {
    const s = byId(
      { ...provider, [repeatCountKey('vaccines')]: '2', vaxType: 'covid19', vaxDate: '2026-03-01' },
      'vaccines',
    )!;
    expect(s.state).toBe('partial');
  });
});

describe('plain-language titles', () => {
  it('uses the public title on the public path where one exists', () => {
    const clinical = getFormProgress(vaersForm, pub, false).sections;
    const plain = getFormProgress(vaersForm, pub, true).sections;
    const differing = plain.filter((p, i) => p.title !== clinical[i].title);
    expect(differing.length).toBeGreaterThan(0);
  });
});
