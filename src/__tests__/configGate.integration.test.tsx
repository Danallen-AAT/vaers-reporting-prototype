// ---------------------------------------------------------------------------
// The configuration gate through the admin surface (PRS#1, PWS 1.8, Q&A 165).
// A program officer can change branching rules, so the surface has to prove a
// change cannot break the form: the whole decision matrix is re-derived from
// the edited rules before the change is accepted, the standing check is
// reported on screen, and a rule that would strand a question is refused with
// a reason rather than silently applied.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from '../admin/AdminPanel';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderAdmin() {
  render(
    <ConfigProvider>
      <AdminPanel />
    </ConfigProvider>,
  );
}

describe('configuration integrity gate', () => {
  it('reports a passing check for the shipped configuration, with the matrix size', () => {
    renderAdmin();
    const panel = screen.getByRole('status', { name: /configuration check/i });
    expect(panel).toHaveTextContent(/passed/i);
    expect(panel).toHaveTextContent(/answer combinations/i);
  }, 30000);

  it('accepts a sound rule change and keeps the check passing', async () => {
    const user = userEvent.setup();
    renderAdmin();
    const stock = screen
      .getByLabelText('Label for reporterEmail')
      .closest('.field-editor') as HTMLElement;

    await user.selectOptions(
      within(stock).getByRole('combobox', { name: /visibility rule for reporterEmail/i }),
      'when',
    );
    await user.selectOptions(
      within(stock).getByRole('combobox', { name: /controlling question for reporterEmail/i }),
      'reporterType',
    );
    await user.selectOptions(
      within(stock).getByRole('combobox', { name: /controlling answer for reporterEmail/i }),
      'provider',
    );

    expect(within(stock).getByText('Modified')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /configuration check/i })).toHaveTextContent(
      /passed/i,
    );
    expect(within(stock).queryByRole('alert')).toBeNull();
  }, 40000);

  it('still passes its own check after a question is added with a condition', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole('button', { name: /add a question to reporter/i }));
    await user.type(
      screen.getByRole('textbox', { name: /label for the new question in reporter/i }),
      'Clinic region',
    );
    await user.click(screen.getByRole('button', { name: 'Add question' }));

    await user.selectOptions(
      screen.getByRole('combobox', { name: /visibility rule for custom_clinic_region/i }),
      'when',
    );

    expect(screen.getByRole('status', { name: /configuration check/i })).toHaveTextContent(
      /passed/i,
    );
  }, 40000);
});
