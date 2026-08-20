// ---------------------------------------------------------------------------
// UI integration for PRS#1 - drives the real components the way a user would
// and asserts the marquee suppression + the public plain-language path.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  // The reporting form lives at #/report; #/ is the landing page.
  window.location.hash = '#/report';
});

describe('branching (UI integration)', () => {
  it('provider: admin error with NO adverse event suppresses the AE section', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Choose the provider path.
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));

    // The admin-error question and the AE section are both present at first.
    const errorQuestion = screen.getByRole('group', {
      name: /reporting a vaccine administration error/i,
    });
    expect(errorQuestion).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Adverse event' })).toBeInTheDocument();

    // Yes - this is an administration error.
    await user.click(within(errorQuestion).getByRole('radio', { name: 'Yes' }));

    // Error sub-fields appear.
    expect(screen.getByRole('group', { name: /type of error/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/describe the error/i)).toBeInTheDocument();

    // No - the patient had no adverse event.
    const hadAeQuestion = screen.getByRole('group', {
      name: /did the patient experience any adverse event/i,
    });
    await user.click(within(hadAeQuestion).getByRole('radio', { name: 'No' }));

    // Marquee behavior: the whole AE section is suppressed; error details remain.
    expect(screen.queryByRole('heading', { name: 'Adverse event' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/adverse event description/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/describe the error/i)).toBeInTheDocument();
  });

  it('public: shows plain-language labels and hides provider-only fields', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));

    // Plain-language reporter-type legend + the public-only relationship field.
    expect(
      screen.getByRole('group', { name: /who is filling this out/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/your relationship to the patient/i)).toBeInTheDocument();

    // Provider-only fields are absent under either wording.
    expect(screen.queryByLabelText(/how was the shot given/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: /reporting a vaccine administration error/i }),
    ).not.toBeInTheDocument();
  });
});
