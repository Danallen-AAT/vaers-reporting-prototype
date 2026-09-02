// ---------------------------------------------------------------------------
// Reachability has to be judged over the states the running form can actually
// hold, not over every combination of answer values.
//
// The case that motivated this: put a question in a provider-only section and
// gate it on a public-only answer. A cartesian product over values contains
// {reporterType: provider, relationToPatient: self} and concludes the question
// is reachable there. The form never holds that state, because choosing a path
// drops the other path's answers, so the question is reachable nowhere and a
// required VAERS element leaves the instrument silently.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { checkConfiguration } from './configCheck';
import { getVisibleForm } from './visibility';
import { vaersForm } from '../config/vaersForm';
import type { FormConfig } from '../config/types';

const clone = (c: FormConfig): FormConfig => JSON.parse(JSON.stringify(c));

/** A public-path choice question, and a section only providers ever see. */
function strandReporterName(): FormConfig {
  const c = clone(vaersForm);
  const publicOnlyChoice = c.sections
    .flatMap((s) => s.fields)
    .find((f) => f.path === 'public' && (f.options?.length ?? 0) > 0);
  const providerOnlySection = c.sections.find((s) => s.path === 'provider');
  if (!publicOnlyChoice || !providerOnlySection) return c;

  for (const section of c.sections) {
    const i = section.fields.findIndex((f) => f.id === 'reporterName');
    if (i === -1) continue;
    const [field] = section.fields.splice(i, 1);
    field.visibleWhen = [{ field: publicOnlyChoice.id, equals: publicOnlyChoice.options![0].value }];
    providerOnlySection.fields.push(field);
    break;
  }
  return c;
}

describe('reachability is judged over states the form can hold', () => {
  it('reports a question stranded by a path-crossing rule', () => {
    const config = strandReporterName();
    const result = checkConfiguration(config);
    expect(result.issues.some((i) => i.code === 'unreachable-field' && i.target === 'reporterName')).toBe(
      true,
    );
    expect(result.ok).toBe(false);
  });

  it('and the form agrees: it appears on neither path', () => {
    const config = strandReporterName();
    const shows = (values: Record<string, string>) =>
      getVisibleForm(config, values).some((s) => s.fields.some((f) => f.id === 'reporterName'));
    expect(shows({ reporterType: 'public' })).toBe(false);
    expect(shows({ reporterType: 'provider' })).toBe(false);
  });

  it('reports a question reachable only by answering and then reversing', () => {
    // The evaluator's attack, in two dropdowns: gate a required question on
    // "no adverse event". A provider filling forward never sees it, because
    // answering no removes the section it lives in. It appears only to someone
    // who answers the error question yes, answers no here, then goes back and
    // reverses the first answer, leaving a hidden answer still driving the
    // branch. That is not a state the form can be filled into.
    const config = clone(vaersForm);
    for (const section of config.sections) {
      const field = section.fields.find((f) => f.id === 'aeDescription');
      if (field) field.visibleWhen = [{ field: 'errorHadAE', equals: 'no' }];
    }
    const result = checkConfiguration(config);
    expect(
      result.issues.some((i) => i.code === 'unreachable-field' && i.target === 'aeDescription'),
    ).toBe(true);
  });

  it('reports a required question moved out of a path it used to serve', () => {
    // Three interactions in the shipped editor: pick the Section dropdown for a
    // required question and move it into a provider-only section. It stays
    // reachable, so reachability alone says nothing is wrong, while every
    // member of the public quietly stops being asked for it.
    const config = clone(vaersForm);
    const providerOnly = config.sections.find((s) => s.path === 'provider')!;
    for (const section of config.sections) {
      const i = section.fields.findIndex((f) => f.id === 'reporterName');
      if (i === -1) continue;
      providerOnly.fields.push(section.fields.splice(i, 1)[0]);
      break;
    }
    const result = checkConfiguration(config, vaersForm);
    const issue = result.issues.find((i) => i.code === 'lost-path' && i.target === 'reporterName');
    expect(issue?.message).toMatch(/members of the public/i);
    expect(issue?.message).toMatch(/required/i);
    expect(result.ok).toBe(false);
  });

  it('allows narrowing an optional question to one path', () => {
    // The surface exists to allow content decisions like this one, so the
    // guard has to distinguish them from a required question going missing.
    const config = clone(vaersForm);
    for (const section of config.sections) {
      const field = section.fields.find((f) => f.id === 'reporterEmail');
      if (field) field.path = 'provider';
    }
    expect(checkConfiguration(config, vaersForm).ok).toBe(true);
  });

  it('does not cry wolf: the shipped configuration still passes', () => {
    expect(checkConfiguration(vaersForm, vaersForm).ok).toBe(true);
  });
});
