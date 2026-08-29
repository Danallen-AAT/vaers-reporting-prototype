// ---------------------------------------------------------------------------
// Repeatable section groups. VAERS reports routinely cover more than one
// vaccine given at a single visit, so the vaccines section repeats. These
// assert the engine handles instances in visibility, validation and output.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { vaersForm } from '../config/vaersForm';
import { getVisibleForm, getRepeatCount } from './visibility';
import { validateForm } from './validation';
import { buildStructuredOutput } from './output';
import { repeatCountKey, repeatFieldId, type FormValues } from '../config/types';

const vaccines = vaersForm.sections.find((s) => s.id === 'vaccines')!;
const base: FormValues = { reporterType: 'provider', isAdminError: 'no' };

describe('repeat configuration', () => {
  it('marks the vaccines section repeatable with sane bounds', () => {
    expect(vaccines.repeat).toBeDefined();
    expect(vaccines.repeat!.min).toBe(1);
    expect(vaccines.repeat!.max).toBeGreaterThan(1);
  });

  it('defaults to the minimum instance count', () => {
    expect(getRepeatCount(vaccines, base)).toBe(1);
  });

  it('clamps to the configured bounds', () => {
    expect(getRepeatCount(vaccines, { [repeatCountKey('vaccines')]: '99' })).toBe(
      vaccines.repeat!.max,
    );
    expect(getRepeatCount(vaccines, { [repeatCountKey('vaccines')]: '0' })).toBe(1);
    expect(getRepeatCount(vaccines, { [repeatCountKey('vaccines')]: 'nonsense' })).toBe(1);
  });

  it('reports instance count on the resolved section, and 1 for others', () => {
    const resolved = getVisibleForm(vaersForm, { ...base, [repeatCountKey('vaccines')]: '3' });
    expect(resolved.find((r) => r.section.id === 'vaccines')!.instances).toBe(3);
    expect(resolved.find((r) => r.section.id === 'patient')!.instances).toBe(1);
  });
});

describe('validation across instances', () => {
  it('requires the required fields of every instance, keyed per instance', () => {
    const errors = validateForm(vaersForm, { ...base, [repeatCountKey('vaccines')]: '2' });
    // vaxType is required on both instances and keyed distinctly.
    expect(errors[repeatFieldId('vaxType', 0)]).toBeDefined();
    expect(errors[repeatFieldId('vaxType', 1)]).toBeDefined();
    expect(repeatFieldId('vaxType', 0)).toBe('vaxType');
    expect(repeatFieldId('vaxType', 1)).toBe('vaxType__1');
  });

  it('clears an instance error once that instance is filled', () => {
    const values: FormValues = {
      ...base,
      [repeatCountKey('vaccines')]: '2',
      vaxType: 'covid19',
      vaxDate: '2026-03-01',
    };
    const errors = validateForm(vaersForm, values);
    expect(errors['vaxType']).toBeUndefined();
    expect(errors['vaxType__1']).toBeDefined();
  });
});

describe('structured output', () => {
  it('emits a repeated section as an array, one row per filled instance', () => {
    const values: FormValues = {
      ...base,
      [repeatCountKey('vaccines')]: '2',
      vaxType: 'covid19',
      vaxDate: '2026-03-01',
      vaxType__1: 'influenza',
      vaxDate__1: '2026-03-01',
    };
    const out = buildStructuredOutput(vaersForm, values);
    expect(out.repeated.vaccines).toHaveLength(2);
    expect(out.repeated.vaccines[0]['vaers2_item17_vaccineType']).toBe('covid19');
    expect(out.repeated.vaccines[1]['vaers2_item17_vaccineType']).toBe('influenza');
    // Repeated fields must not leak into the flat answers map.
    expect(out.answers['vaers2_item17_vaccineType']).toBeUndefined();
  });

  it('drops instances the reporter added but left blank', () => {
    const values: FormValues = {
      ...base,
      [repeatCountKey('vaccines')]: '3',
      vaxType: 'mmr',
    };
    const out = buildStructuredOutput(vaersForm, values);
    expect(out.repeated.vaccines).toHaveLength(1);
  });

  it('still emits non-repeating answers normally', () => {
    const out = buildStructuredOutput(vaersForm, { ...base, reporterName: 'Dr. Test' });
    expect(out.answers['vaers2_item13_completedByName']).toBe('Dr. Test');
    expect(out.reporterType).toBe('provider');
  });
});
