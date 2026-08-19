// ---------------------------------------------------------------------------
// Config store - the override layer must change content WITHOUT touching the
// base schema or the branching predicates (so PRS#1 stays intact under edits).
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { applyOverrides, type ConfigOverrides } from './ConfigStore';
import { vaersForm } from '../config/vaersForm';
import type { FormConfig } from '../config/types';

function field(cfg: FormConfig, id: string) {
  for (const s of cfg.sections) {
    const f = s.fields.find((x) => x.id === id);
    if (f) return f;
  }
  throw new Error(`field ${id} not found`);
}
const noOverrides: ConfigOverrides = { fields: {}, sections: {} };

describe('applyOverrides', () => {
  it('leaves content unchanged with empty overrides', () => {
    const out = applyOverrides(vaersForm, noOverrides);
    expect(field(out, 'reporterName').label).toBe('Reporter name');
  });

  it('overrides a field label and help text without mutating the base schema', () => {
    const ov: ConfigOverrides = {
      fields: { reporterName: { label: 'Full legal name', helpText: 'As it appears on record' } },
      sections: {},
    };
    const out = applyOverrides(vaersForm, ov);
    expect(field(out, 'reporterName').label).toBe('Full legal name');
    expect(field(out, 'reporterName').helpText).toBe('As it appears on record');
    // Base schema is untouched.
    expect(field(vaersForm, 'reporterName').label).toBe('Reporter name');
  });

  it('preserves branching predicates on overridden fields', () => {
    const ov: ConfigOverrides = { fields: { errorType: { label: 'Error category' } }, sections: {} };
    const out = applyOverrides(vaersForm, ov);
    const errorType = field(out, 'errorType');
    expect(errorType.label).toBe('Error category');
    expect(errorType.visibleWhen).toEqual([{ field: 'isAdminError', equals: 'yes' }]);
  });

  it('preserves suppression rules on overridden sections', () => {
    const ov: ConfigOverrides = { fields: {}, sections: { adverseEvent: { title: 'Reaction details' } } };
    const out = applyOverrides(vaersForm, ov);
    const ae = out.sections.find((s) => s.id === 'adverseEvent')!;
    expect(ae.title).toBe('Reaction details');
    expect(ae.suppressWhen).toEqual([
      { field: 'isAdminError', equals: 'yes' },
      { field: 'errorHadAE', equals: 'no' },
    ]);
  });
});
