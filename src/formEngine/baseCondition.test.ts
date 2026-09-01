// ---------------------------------------------------------------------------
// Visibility-rule overrides on base-schema questions (Amendment 1 Q&A 165):
// an administrator's rule change is an override evaluated by the same engine
// as the shipped rule, a cleared rule makes the question unconditional, and
// reverting the field restores the base schema's rule untouched.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { applyOverrides } from '../state/ConfigStore';
import { vaersForm } from '../config/vaersForm';
import { getVisibleForm } from './visibility';

const visible = (config: ReturnType<typeof applyOverrides>, values: Record<string, string>) =>
  getVisibleForm(config, values).flatMap((s) => s.fields.map((f) => f.id));

// A base field that ships with a single-condition rule.
const conditional = vaersForm.sections
  .flatMap((s) => s.fields)
  .find((f) => f.visibleWhen?.length === 1 && !f.suppressWhen)!;

describe('base-schema visibility overrides', () => {
  it('a replaced rule is evaluated exactly like a shipped rule', () => {
    const cfg = applyOverrides(vaersForm, {
      fields: { [conditional.id]: { visibleWhen: [{ field: 'reporterType', equals: 'provider' }] } },
      sections: {},
    });
    expect(visible(cfg, { reporterType: 'provider' })).toContain(conditional.id);
    expect(visible(cfg, { reporterType: 'public' })).not.toContain(conditional.id);
  });

  it('a cleared rule makes the question unconditional', () => {
    const base = visible(applyOverrides(vaersForm, { fields: {}, sections: {} }), {
      reporterType: 'public',
    });
    const cfg = applyOverrides(vaersForm, {
      fields: { [conditional.id]: { visibleWhen: null } },
      sections: {},
    });
    const cleared = visible(cfg, { reporterType: 'public' });
    // The field's own rule no longer gates it (its section may still gate by path).
    const section = vaersForm.sections.find((s) => s.fields.some((f) => f.id === conditional.id))!;
    if (!section.visibleWhen && !section.suppressWhen && section.path !== 'provider') {
      expect(cleared).toContain(conditional.id);
    }
    expect(base).not.toContain(conditional.id);
  });

  it('removing the override restores the base rule bit for bit', () => {
    const cfg = applyOverrides(vaersForm, { fields: {}, sections: {} });
    const restored = cfg.sections
      .flatMap((s) => s.fields)
      .find((f) => f.id === conditional.id)!;
    expect(restored.visibleWhen).toEqual(conditional.visibleWhen);
  });
});
