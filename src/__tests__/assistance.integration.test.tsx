// ---------------------------------------------------------------------------
// Completion assistance (PWS 1.3): the completion status readout and the field
// tooltips, driven through the real components the way a reporter would.
//
// Both features exist because the production VAERS form has them. The bar these
// tests hold is that ours are operable without a mouse and legible to a screen
// reader, which the hover-only tooltip pattern is not.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/report';
});

const panel = () => screen.getByRole('region', { name: /completion status/i });

describe('completion status', () => {
  it('is absent until a reporter type is chosen, then appears', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.queryByRole('region', { name: /completion status/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    expect(panel()).toBeInTheDocument();
  });

  it('exposes a progressbar with a readable value, not colour alone', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const bar = within(panel()).getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar.getAttribute('aria-valuetext')).toMatch(/percent/i);

    const before = Number(bar.getAttribute('aria-valuenow'));
    expect(before).toBeGreaterThanOrEqual(0);
    expect(before).toBeLessThanOrEqual(100);
  });

  it('advances as required questions are answered', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const before = Number(within(panel()).getByRole('progressbar').getAttribute('aria-valuenow'));
    await user.type(screen.getByLabelText(/adverse event description/i), 'Fever and rash');
    const after = Number(within(panel()).getByRole('progressbar').getAttribute('aria-valuenow'));

    expect(after).toBeGreaterThan(before);
  });

  it('drops a section from the readout when branching suppresses it', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    // The adverse event section is listed while it is in play.
    expect(within(panel()).getByRole('button', { name: /adverse event/i })).toBeInTheDocument();

    const errorQuestion = screen.getByRole('group', {
      name: /reporting a vaccine administration error/i,
    });
    await user.click(within(errorQuestion).getByRole('radio', { name: 'Yes' }));
    const hadAe = screen.getByRole('group', {
      name: /did the patient experience any adverse event/i,
    });
    await user.click(within(hadAe).getByRole('radio', { name: 'No' }));

    // Suppressed, so it leaves the readout rather than sitting unfinished.
    expect(within(panel()).queryByRole('button', { name: /adverse event/i })).not.toBeInTheDocument();
  });

  // Regression: these chips were anchors with href="#id". The app is hash
  // routed, so activating one rewrote location.hash, the router failed to match
  // the fragment, and the reporter was dumped back on the landing page with a
  // part-completed form behind them.
  it('does not navigate away from the form when a section chip is used', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const chip = within(panel()).getByRole('button', { name: /patient information/i });
    await user.click(chip);

    expect(window.location.hash).toBe('#/report');
    expect(panel()).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Patient information' })).toBeInTheDocument();
  });

  it('moves focus to the section it jumped to', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    await user.click(within(panel()).getByRole('button', { name: /patient information/i }));
    expect(screen.getByRole('heading', { name: 'Patient information' })).toHaveFocus();
  });
});

describe('field tooltips', () => {
  it('starts collapsed and is operable from the keyboard', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const toggle = screen.getByRole('button', { name: /more guidance for vaccination date/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Reached and activated without a pointer.
    toggle.focus();
    expect(toggle).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('button', { name: /hide guidance for vaccination date/i }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/not the date the reaction began/i)).toBeVisible();
  });

  it('hides the panel again on a second activation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    await user.click(screen.getByRole('button', { name: /more guidance for vaccination date/i }));
    expect(screen.getByText(/not the date the reaction began/i)).toBeVisible();

    await user.click(screen.getByRole('button', { name: /hide guidance for vaccination date/i }));
    expect(screen.queryByText(/not the date the reaction began/i)).not.toBeVisible();
  });

  it('points aria-controls at a panel that exists even while collapsed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const toggle = screen.getByRole('button', { name: /more guidance for vaccination date/i });
    const id = toggle.getAttribute('aria-controls')!;
    expect(id).toBeTruthy();
    expect(document.getElementById(id)).not.toBeNull();
  });

  it('describes the control only while the tooltip is revealed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    const input = screen.getByLabelText(/vaccination date/i);
    const toggle = screen.getByRole('button', { name: /more guidance for vaccination date/i });
    const tipId = toggle.getAttribute('aria-controls')!;

    expect(input.getAttribute('aria-describedby') ?? '').not.toContain(tipId);
    await user.click(toggle);
    expect(input.getAttribute('aria-describedby') ?? '').toContain(tipId);
  });

  it('swaps to the plain-language tooltip on the public path', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));

    await user.click(screen.getByRole('button', { name: /more guidance for date of the shot/i }));
    expect(screen.getByText(/the day you got the shot/i)).toBeVisible();
  });
});
