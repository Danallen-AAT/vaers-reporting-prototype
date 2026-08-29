// ---------------------------------------------------------------------------
// The review-correct-confirm stage (SC 3.3.4). A VAERS report is a record of
// consequence, so nothing becomes final on the first click: a valid submission
// opens a plain-language review of every answer, corrections are one button
// away with answers intact, and only an explicit confirmation produces the
// structured output and the post-submission survey.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#/report';
});

async function fillMinimalPublicReport(user: ReturnType<typeof userEvent.setup>) {
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
  await user.type(
    screen.getByLabelText(/describe what happened/i),
    'Fever and swelling at the injection site.',
  );
  const ser = screen.getByRole('group', { name: /how serious was it/i });
  await user.click(within(ser).getByRole('checkbox', { name: /none of the above/i }));
}

describe('review-correct-confirm flow', () => {
  it('a valid submission opens the review stage, not the final output', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimalPublicReport(user);
    await user.click(screen.getByRole('button', { name: /review submission/i }));

    expect(
      await screen.findByRole('heading', { name: /review your report before it becomes final/i }),
    ).toBeInTheDocument();
    // Plain-language values, not stored codes, inside the review region.
    const review = screen.getByRole('region', { name: /review your report/i });
    expect(within(review).getByText('Influenza (flu)')).toBeInTheDocument();
    expect(within(review).getByText('Test Reporter')).toBeInTheDocument();
    // Not final yet: no structured output, no download, no survey.
    expect(screen.queryByRole('heading', { name: /structured output/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /download json/i })).toBeNull();
    expect(screen.queryByRole('dialog', { name: /how did that go/i })).toBeNull();
  }, 40000);

  it('going back preserves every answer for correction', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimalPublicReport(user);
    await user.click(screen.getByRole('button', { name: /review submission/i }));
    await screen.findByRole('heading', { name: /review your report/i });

    await user.click(screen.getByRole('button', { name: /go back and make corrections/i }));
    expect(screen.queryByRole('heading', { name: /review your report/i })).toBeNull();
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Test Reporter');
    expect(screen.getByLabelText(/describe what happened/i)).toHaveValue(
      'Fever and swelling at the injection site.',
    );
  }, 40000);

  it('only explicit confirmation finalizes: output and survey appear together', async () => {
    const user = userEvent.setup();
    render(<App />);
    await fillMinimalPublicReport(user);
    await user.click(screen.getByRole('button', { name: /review submission/i }));
    await screen.findByRole('heading', { name: /review your report/i });

    await user.click(screen.getByRole('button', { name: /confirm and finalize report/i }));
    expect(
      await screen.findByRole('heading', { name: /structured output/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download json/i })).toBeInTheDocument();
    expect(await screen.findByRole('dialog', { name: /how did that go/i })).toBeInTheDocument();
    // The review stage has closed.
    expect(screen.queryByRole('heading', { name: /review your report/i })).toBeNull();
  }, 40000);
});
