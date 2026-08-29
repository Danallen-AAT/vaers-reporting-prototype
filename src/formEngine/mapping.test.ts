// ---------------------------------------------------------------------------
// The mapping boundary (PWS 1.9, PRS#6).
//
// CDC furnishes the authoritative data element definitions at kickoff, so no
// field carries a `vaersElement` yet. These tests fix the behaviour on both
// sides of that event: today every answer falls back to its internal id and is
// reported as unmapped, and the moment a target element is set the same answer
// is emitted under the CDC key with no other change to the engine.
// ---------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';
import type { FormConfig } from '../config/types';
import { buildStructuredOutput, outputKey } from './output';
import { vaersForm } from '../config/vaersForm';

const minimal: FormConfig = {
  version: 'test-1',
  title: 'Mapping fixture',
  sections: [
    {
      id: 'reporter',
      title: 'Reporter',
      fields: [
        { id: 'reporterType', label: 'Reporter type', type: 'radio', path: 'both',
          options: [{ value: 'public', label: 'Public' }, { value: 'provider', label: 'Provider' }] },
        { id: 'lotNumber', label: 'Lot number', type: 'text', path: 'both' },
      ],
    },
  ],
  surveys: vaersForm.surveys,
};

const withTarget = (): FormConfig => ({
  ...minimal,
  sections: [
    {
      ...minimal.sections[0],
      fields: minimal.sections[0].fields.map((f) =>
        f.id === 'lotNumber' ? { ...f, vaersElement: 'VAX_LOT' } : f,
      ),
    },
  ],
});

describe('mapping boundary', () => {
  it('falls back to the internal id when no CDC element is set', () => {
    expect(outputKey({ id: 'lotNumber', label: 'Lot number', type: 'text', path: 'both' }))
      .toBe('lotNumber');
  });

  it('uses the CDC data element when one is set', () => {
    expect(outputKey({ id: 'lotNumber', label: 'Lot number', type: 'text', path: 'both',
      vaersElement: 'VAX_LOT' })).toBe('VAX_LOT');
  });

  it('emits answers under the internal id and reports them unmapped', () => {
    const out = buildStructuredOutput(minimal, { reporterType: 'provider', lotNumber: 'AB123' });
    expect(out.answers.lotNumber).toBe('AB123');
    expect(out.answers.VAX_LOT).toBeUndefined();
    expect(out.meta.mapping.mapped).toBe(0);
    expect(out.meta.mapping.unmapped).toContain('lotNumber');
  });

  it('moves the same answer to the CDC key once the element is supplied', () => {
    const out = buildStructuredOutput(withTarget(), { reporterType: 'provider', lotNumber: 'AB123' });
    expect(out.answers.VAX_LOT).toBe('AB123');
    expect(out.answers.lotNumber).toBeUndefined();
    expect(out.meta.mapping.mapped).toBe(1);
    expect(out.meta.mapping.unmapped).not.toContain('lotNumber');
  });

  it('counts only answered visible fields, not the whole schema', () => {
    const out = buildStructuredOutput(minimal, { reporterType: 'provider' });
    expect(out.meta.mapping.answered).toBe(1);
    expect(out.meta.mapping.unmapped).toEqual(['reporterType']);
  });

  it('maps the real form to published VAERS 2.0 items where a counterpart exists', () => {
    const out = buildStructuredOutput(vaersForm, { reporterType: 'public' });
    expect(out.meta.mapping.answered).toBeGreaterThan(0);
    // Every answered field on this minimal submission has a printed-form home.
    expect(out.meta.mapping.mapped).toBe(out.meta.mapping.answered);
    expect(out.answers['vaers2_item13_formCompletedBy']).toBe('public');
  });

  it('keeps modernized-workflow fields deliberately unmapped until the CDC definitions arrive', () => {
    const out = buildStructuredOutput(vaersForm, {
      reporterType: 'provider',
      isAdminError: 'yes',
      errorType: 'wrong_dose',
      errorHadAE: 'no',
      errorDescription: 'Wrong dose administered.',
    });
    for (const id of ['isAdminError', 'errorType', 'errorHadAE', 'errorDescription']) {
      expect(out.meta.mapping.unmapped).toContain(id);
      expect(out.answers[id]).toBeDefined();
    }
    // The printed form has no administration-error items; these await PWS Section 9.
    expect(out.meta.mapping.mapped).toBeGreaterThan(0);
  });
});
