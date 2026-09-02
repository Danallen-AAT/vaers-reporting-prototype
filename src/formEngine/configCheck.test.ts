// ---------------------------------------------------------------------------
// The configuration integrity check (PRS#1, PWS 1.8). The shipped form must
// pass its own check, and each class of authoring mistake a program officer
// could make through the low-code surface must be caught by it.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { checkConfiguration } from './configCheck';
import { vaersForm } from '../config/vaersForm';
import type { FormConfig } from '../config/types';

/** Deep copy so a test's edit cannot leak into the next test. */
const clone = (config: FormConfig): FormConfig => JSON.parse(JSON.stringify(config));

const withField = (mutate: (config: FormConfig) => void): FormConfig => {
  const next = clone(vaersForm);
  mutate(next);
  return next;
};

describe('configuration integrity check', () => {
  it('the shipped configuration passes its own check', () => {
    const result = checkConfiguration(vaersForm);
    expect(result.issues).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('evaluates a real matrix rather than a single case', () => {
    const result = checkConfiguration(vaersForm);
    expect(result.combinations).toBeGreaterThan(1);
    expect(result.fieldsChecked).toBeGreaterThan(20);
    expect(result.truncated).toBe(false);
  });

  it('matches the matrix figures quoted in Volume I, Tab 2-2', () => {
    // Volume I prints these two numbers. They are asserted here so the
    // quotation cannot drift away from what the code actually does.
    const result = checkConfiguration(vaersForm);
    expect(result.fieldsChecked).toBe(41);
    expect(result.combinations).toBe(324);
  });

  it('catches a question whose label has been cleared', () => {
    // Clearing a label leaves the label element with nothing in it, which is an
    // unnamed control on the live form. The authoring tool must not allow it.
    const config = withField((c) => {
      c.sections[0].fields[1].label = '';
    });
    const result = checkConfiguration(config);
    expect(result.ok).toBe(false);
    const issue = result.issues.find((i) => i.code === 'empty-label');
    expect(issue?.message).toMatch(/unnamed/i);
  });

  it('catches a label emptied to whitespace, not just to nothing', () => {
    const config = withField((c) => {
      c.sections[0].fields[1].label = '   ';
    });
    expect(checkConfiguration(config).issues.some((i) => i.code === 'empty-label')).toBe(true);
  });

  it('allows a cleared public label, which falls back to the clinical one', () => {
    const config = withField((c) => {
      c.sections[0].fields[1].publicLabel = '';
    });
    expect(checkConfiguration(config).ok).toBe(true);
  });

  it('catches a section whose heading has been cleared', () => {
    const config = withField((c) => {
      c.sections[0].title = '';
    });
    expect(checkConfiguration(config).issues.some((i) => i.code === 'empty-section-title')).toBe(
      true,
    );
  });

  it('catches a rule pointing at a question that does not exist', () => {
    const config = withField((c) => {
      c.sections[0].fields[1].visibleWhen = [{ field: 'noSuchQuestion', equals: 'yes' }];
    });
    const result = checkConfiguration(config);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'unknown-controller')).toBe(true);
  });

  it('catches a rule waiting for an answer the controlling question does not offer', () => {
    const config = withField((c) => {
      c.sections[0].fields[1].visibleWhen = [{ field: 'reporterType', equals: 'martian' }];
    });
    const result = checkConfiguration(config);
    expect(result.ok).toBe(false);
    const issue = result.issues.find((i) => i.code === 'unknown-option');
    expect(issue?.message).toMatch(/martian/);
  });

  it('catches a rule that makes a question unreachable', () => {
    // reporterType cannot be both public and provider at once, so a question
    // gated on both can never appear. This is the mistake the gate exists for.
    const config = withField((c) => {
      c.sections[0].fields[1].visibleWhen = [
        { field: 'reporterType', equals: 'public' },
        { field: 'reporterType', equals: 'provider' },
      ];
    });
    const result = checkConfiguration(config);
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.code === 'unreachable-field')).toBe(true);
  });

  it('reports the unreachable question in plain language, naming it', () => {
    const config = withField((c) => {
      c.sections[0].fields[1].visibleWhen = [
        { field: 'reporterType', equals: 'public' },
        { field: 'reporterType', equals: 'provider' },
      ];
    });
    const { issues } = checkConfiguration(config);
    const issue = issues.find((i) => i.code === 'unreachable-field');
    expect(issue?.message).toMatch(/can never appear/i);
    expect(issue?.message).not.toMatch(/undefined/);
  });
});
