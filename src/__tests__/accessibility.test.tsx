// ---------------------------------------------------------------------------
// Section 508 automated accessibility suite.
//
// Runs axe-core against every major state of the application, checked against
// the WCAG 2.0 Level A and AA rule set, which is the standard the Revised 508
// Standards incorporate by reference.
//
// One limitation is deliberate: the color-contrast rule is disabled here
// because jsdom does not perform layout or compute rendered color, so the
// result would be meaningless. Contrast is verified separately against the
// palette and recorded in the Accessibility Conformance Report.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import App from '../App';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from '../admin/AdminPanel';

// WCAG 2.0 A and AA only, matching the Revised 508 Standards.
const AXE_OPTS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa'] },
  rules: {
    // jsdom cannot compute rendered color; verified separately.
    'color-contrast': { enabled: false },
  },
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  // The reporting form lives at #/report; #/ is now the landing page.
  window.location.hash = '#/report';
});

describe('accessibility: landing page', () => {
  it('has no violations on the landing page', async () => {
    window.location.hash = '#/';
    const { container } = render(<App />);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 20000);

  it('has no violations with the site navigation survey open', async () => {
    window.location.hash = '#/';
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /give us feedback on this site/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 25000);
});

describe('accessibility: public reporting form', () => {
  it('has no violations on first load, before a path is chosen', async () => {
    const { container } = render(<App />);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  });

  it('has no violations on the public reporter path', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    // Include the functional upload UI in this state: one attached document.
    const up = screen.getByLabelText(/upload supporting documents/i) as HTMLInputElement;
    await user.upload(
      up,
      new File([new Uint8Array(64)], 'discharge-summary.pdf', { type: 'application/pdf' }),
    );
    await screen.findByRole('list', { name: /attached documents/i });
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 20000);

  it('has no violations on the healthcare provider path', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 20000);

  it('has no violations with a field tooltip revealed', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    await user.click(screen.getByRole('button', { name: /more guidance for vaccination date/i }));
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 20000);

  it('has no violations when the adverse event section is suppressed', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    const errQ = screen.getByRole('group', { name: /reporting a vaccine administration error/i });
    await user.click(within(errQ).getByRole('radio', { name: 'Yes' }));
    const aeQ = screen.getByRole('group', { name: /did the patient experience any adverse event/i });
    await user.click(within(aeQ).getByRole('radio', { name: 'No' }));
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 25000);

  it('has no violations on the review-and-confirm stage', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.type(screen.getByLabelText(/your name/i), 'Test Reporter');
    await user.selectOptions(screen.getByLabelText(/your relationship to the patient/i), 'parent');
    await user.type(screen.getByLabelText(/how old was the patient/i), '6');
    await user.selectOptions(screen.getByLabelText(/patient's sex/i), 'F');
    const rec = screen.getByRole('group', { name: /has the patient recovered/i });
    await user.click(within(rec).getByRole('radio', { name: 'Yes' }));
    await user.selectOptions(screen.getByLabelText(/which vaccine\?/i), 'influenza');
    await user.type(screen.getByLabelText(/date of the shot/i), '2026-08-20');
    await user.type(screen.getByLabelText(/when did the problem start/i), '2026-08-21');
    await user.type(screen.getByLabelText(/describe what happened/i), 'Fever after the shot.');
    const ser = screen.getByRole('group', { name: /how serious was it/i });
    await user.click(within(ser).getByRole('checkbox', { name: /none of the above/i }));
    await user.click(screen.getByRole('button', { name: /review submission/i }));
    await screen.findByRole('heading', { name: /review your report/i });
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 40000);

  it('has no violations with the start-over confirmation open', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    expect(
      screen.getByRole('group', { name: /starting over clears every answer/i }),
    ).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 25000);

  it('has no violations while validation errors are displayed', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.click(screen.getByRole('button', { name: /review submission/i }));
    // Many alerts appear: the error summary plus one per invalid field.
    const alerts = await screen.findAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(1);
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 25000);
});

describe('accessibility: dialogs', () => {
  it('has no violations with the FAQ dialog open', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: /help & faq/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 20000);
});

describe('accessibility: admin configuration surface', () => {
  it('has no violations on the admin login', async () => {
    const { container } = render(<App />);
    // Hash routing needs the event to propagate; wrap so React can flush.
    await act(async () => {
      window.location.hash = '#/admin';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 20000);

  it('has no violations on the admin panel with its live preview', async () => {
    const { container } = render(
      <ConfigProvider>
        <AdminPanel />
      </ConfigProvider>,
    );
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 30000);

  it('has no violations with the reset-all confirmation open', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <ConfigProvider>
        <AdminPanel />
      </ConfigProvider>,
    );
    // Customize first so the guarded reset control is enabled.
    await user.type(screen.getAllByRole('textbox')[0], ' X');
    await user.click(screen.getByRole('button', { name: 'Reset all to defaults' }));
    expect(
      screen.getByRole('group', { name: /removes every customization/i }),
    ).toBeInTheDocument();
    expect(await axe(container, AXE_OPTS)).toHaveNoViolations();
  }, 30000);
});
