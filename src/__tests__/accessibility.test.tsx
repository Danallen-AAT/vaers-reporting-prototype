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
});
