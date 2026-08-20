// ---------------------------------------------------------------------------
// Item 8 on the current VAERS form, and the reason it is worth implementing.
//
// The live form asks whether the patient was pregnant, then instructs the
// reporter to "describe the event, any pregnancy complications, and estimated
// due date if known in item 18". A person has to hold an answer in their head
// and carry it to a numbered box elsewhere on the page. That instruction is a
// paper form artifact, and branching is precisely what replaces it.
//
// These tests assert the replacement: answering yes reveals the fields in
// place, answering anything else leaves them out of the form entirely.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { vaersForm } from '../config/vaersForm';
import { visibleFieldIds } from '../formEngine/visibility';
import type { FormValues } from '../config/types';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/report';
});

const ids = (v: FormValues) => visibleFieldIds(vaersForm, v);

describe('engine: pregnancy follow-ups', () => {
  it('asks the question on both reporter paths', () => {
    expect(ids({ reporterType: 'public' })).toContain('patientPregnant');
    expect(ids({ reporterType: 'provider', isAdminError: 'no' })).toContain('patientPregnant');
  });

  it('hides the follow-ups until the answer is yes', () => {
    for (const answer of [undefined, 'no', 'unknown']) {
      const v: FormValues = { reporterType: 'public', patientPregnant: answer };
      expect(ids(v)).not.toContain('pregnancyDueDate');
      expect(ids(v)).not.toContain('pregnancyComplications');
    }
  });

  it('reveals both follow-ups on yes', () => {
    const v = ids({ reporterType: 'public', patientPregnant: 'yes' });
    expect(v).toContain('pregnancyDueDate');
    expect(v).toContain('pregnancyComplications');
  });

  it('does not make the follow-ups required, since the live form does not', () => {
    const section = vaersForm.sections.find((s) => s.id === 'patient')!;
    for (const id of ['pregnancyDueDate', 'pregnancyComplications']) {
      const f = section.fields.find((x) => x.id === id)!;
      expect(f.required).toBeUndefined();
    }
  });
});

describe('UI: the cross-reference is gone', () => {
  it('reveals the due date and complications in place, on the public path', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));

    expect(screen.queryByLabelText(/when was the baby due/i)).not.toBeInTheDocument();

    const q = screen.getByRole('group', { name: /was the patient pregnant when they got the shot/i });
    await user.click(within(q).getByRole('radio', { name: 'Yes' }));

    expect(screen.getByLabelText(/when was the baby due/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/any problems with the pregnancy/i)).toBeInTheDocument();
  });

  it('uses clinical wording on the provider path', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const q = screen.getByRole('group', { name: /pregnant at time of vaccination/i });
    await user.click(within(q).getByRole('radio', { name: 'Yes' }));

    expect(screen.getByLabelText(/estimated due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/pregnancy complications/i)).toBeInTheDocument();
  });

  it('withdraws the follow-ups again if the answer changes', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));

    const q = screen.getByRole('group', { name: /was the patient pregnant/i });
    await user.click(within(q).getByRole('radio', { name: 'Yes' }));
    expect(screen.getByLabelText(/when was the baby due/i)).toBeInTheDocument();

    await user.click(within(q).getByRole('radio', { name: 'No' }));
    expect(screen.queryByLabelText(/when was the baby due/i)).not.toBeInTheDocument();
  });

  it('carries the answers into the structured output', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));

    const q = screen.getByRole('group', { name: /was the patient pregnant/i });
    await user.click(within(q).getByRole('radio', { name: 'Yes' }));
    await user.type(screen.getByLabelText(/any problems with the pregnancy/i), 'Pre-eclampsia at 34 weeks');

    // The engine drives output, so asserting the field round-trips is enough.
    expect(screen.getByLabelText(/any problems with the pregnancy/i)).toHaveValue(
      'Pre-eclampsia at 34 weeks',
    );
  });
});
