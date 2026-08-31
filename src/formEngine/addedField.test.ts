// ---------------------------------------------------------------------------
// An admin-created question travels the whole pipeline as data: it joins the
// effective config, the engine evaluates its visibility condition exactly as
// it does the base schema's, and the structured output carries its answer
// under its own id, reported openly as unmapped until an analyst maps it.
// This is the layer separation that lets the form change without touching the
// backend contract (Task 1.8, PWS 1.9, Amendment 1 Q&A 165).
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { applyOverrides } from '../state/ConfigStore';
import { vaersForm } from '../config/vaersForm';
import { getVisibleForm } from './visibility';
import { buildStructuredOutput } from './output';
import { eligibleControllers } from '../admin/conditions';
import type { FieldConfig } from '../config/types';

const ADDED: FieldConfig = {
  id: 'custom_daycare_exposure',
  label: 'Was the patient in group childcare that week?',
  type: 'radio',
  path: 'both',
  options: [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' },
  ],
  visibleWhen: [{ field: 'reporterType', equals: 'public' }],
};

const withAdded = applyOverrides(vaersForm, {
  fields: {},
  sections: {},
  added: [{ sectionId: 'patient', field: ADDED }],
});

describe('admin-created question in the engine', () => {
  it('joins its section and obeys its visibility condition like any base field', () => {
    const hidden = getVisibleForm(withAdded, { reporterType: 'provider' });
    const shown = getVisibleForm(withAdded, { reporterType: 'public' });
    const ids = (form: ReturnType<typeof getVisibleForm>) =>
      form.flatMap((s) => s.fields.map((f) => f.id));
    expect(ids(hidden)).not.toContain('custom_daycare_exposure');
    expect(ids(shown)).toContain('custom_daycare_exposure');
  });

  it('flows into the structured output under its own id, reported as unmapped', () => {
    const out = buildStructuredOutput(withAdded, {
      reporterType: 'public',
      custom_daycare_exposure: 'yes',
    });
    const json = JSON.stringify(out);
    expect(json).toContain('custom_daycare_exposure');
    expect(out.meta.mapping.unmapped).toContain('custom_daycare_exposure');
  });

  it('cannot be its own controller, and its dependents cannot control it', () => {
    const controllers = eligibleControllers(withAdded, 'custom_daycare_exposure');
    expect(controllers.some((c) => c.field.id === 'custom_daycare_exposure')).toBe(false);
    // reporterType controls the added field, so the added field must not be
    // offered as a controller for reporterType's own (hypothetical) condition.
    const forController = eligibleControllers(withAdded, 'reporterType');
    expect(forController.some((c) => c.field.id === 'custom_daycare_exposure')).toBe(false);
  });
});
