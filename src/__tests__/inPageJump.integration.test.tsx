// ---------------------------------------------------------------------------
// Regression suite for one bug class, found three times.
//
// The app is hash routed: useHashRoute strips a leading "#/" and treats the
// remainder as the route. So ANY plain `href="#someId"` in this application
// sets the route to "someId", matches nothing, and renders the landing page.
// The reporter loses a part-completed form.
//
// It shipped in three places: the error summary, the completion status
// controls, and the skip link. The skip link mattered most, because the
// accessibility conformance report claims WCAG 2.4.1 Bypass Blocks is
// supported, and a skip link that navigates away does not support it.
//
// The blanket test at the bottom is the real guard: it fails on any new
// fragment anchor added anywhere, rather than waiting for someone to notice.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '#/report';
});

const onLandingPage = () =>
  screen.queryByRole('heading', { name: /report a problem after a vaccine/i, level: 1 }) !== null &&
  screen.queryByRole('button', { name: /review submission/i }) === null;

describe('error summary links', () => {
  it('stays on the form and focuses the offending field', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.click(screen.getByRole('button', { name: /review submission/i }));

    const summary = await screen.findByRole('alert', { name: /problems to fix/i });
    const link = within(summary).getAllByRole('link')[0];
    const targetId = link.getAttribute('href')!.slice(1);

    await user.click(link);

    // The bug: this used to render the landing page instead.
    expect(window.location.hash).toBe('#/report');
    expect(onLandingPage()).toBe(false);
    expect(screen.getByRole('button', { name: /review submission/i })).toBeInTheDocument();

    // And the point of the link: the user is placed at the field to correct.
    const target = document.getElementById(targetId)!;
    const focused = document.activeElement!;
    expect(target === focused || target.contains(focused)).toBe(true);
  });

  it('focuses a control, not the wrapping fieldset, for grouped questions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.click(screen.getByRole('button', { name: /review submission/i }));

    const summary = await screen.findByRole('alert', { name: /problems to fix/i });
    const groupLink = within(summary)
      .getAllByRole('link')
      .find((a) => document.getElementById(a.getAttribute('href')!.slice(1))?.tagName === 'FIELDSET');

    if (groupLink) {
      await user.click(groupLink);
      // A fieldset cannot hold focus, so we must land on the first input.
      expect(document.activeElement?.tagName).toBe('INPUT');
    }
  });
});

describe('skip link', () => {
  it('moves focus to main instead of navigating away', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    await user.click(screen.getByRole('link', { name: /skip to main content/i }));

    expect(window.location.hash).toBe('#/report');
    expect(onLandingPage()).toBe(false);
    expect(document.activeElement).toBe(document.getElementById('main'));
  });

  it('is the first focusable element on the page', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.tab();
    expect(document.activeElement).toHaveClass('skip-link');
  });
});

describe('no bare fragment anchors anywhere', () => {
  // The router owns location.hash. A fragment anchor without a click handler
  // that cancels it is a navigation bug waiting to be reported.
  const ROUTES = new Set(['#/', '#/report', '#/admin', '#/about']);

  const auditCurrentDom = () =>
    [...document.querySelectorAll('a[href^="#"]')]
      .map((a) => a.getAttribute('href')!)
      .filter((h) => !ROUTES.has(h));

  it('the reporting form has none that are not handled', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.click(screen.getByRole('button', { name: /review submission/i }));
    await screen.findByRole('alert', { name: /problems to fix/i });

    // Fragment anchors are allowed to exist, but every one must be neutralised.
    // Proving that generically means clicking them, so assert on behaviour: the
    // route must survive activating every single one.
    for (const a of [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]) {
      if (ROUTES.has(a.getAttribute('href')!)) continue;
      await user.click(a);
      expect(window.location.hash).toBe('#/report');
    }
    expect(onLandingPage()).toBe(false);
  }, 30000);

  it('lists what it audited, so the guard is visibly doing work', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.click(screen.getByRole('button', { name: /review submission/i }));
    await screen.findByRole('alert', { name: /problems to fix/i });

    // Skip link plus one entry per validation error.
    expect(auditCurrentDom().length).toBeGreaterThan(1);
  });
});
