// ---------------------------------------------------------------------------
// Guards on destructive actions (SC 3.3.4 discipline applied to the app's own
// chrome). Changing reporter type carries every shared answer across and
// drops answers whose questions exist only on the other path, so stale hidden
// values cannot drive branching; clearing a report and resetting the admin
// configuration each require an explicit second confirmation, and cancelling
// preserves the work.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from '../admin/AdminPanel';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.location.hash = '#/report';
});

describe('changing reporter type', () => {
  it('carries shared answers across an actual switch, in both directions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.type(screen.getByLabelText(/your name/i), 'Casey Reporter');

    // Really switch paths, not just focus the question.
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    expect(screen.getByLabelText(/reporter name/i)).toHaveValue('Casey Reporter');

    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Casey Reporter');
  }, 30000);

  it('drops other-path answers so stale hidden values cannot drive branching', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Provider: administration error with no adverse event suppresses the AE section.
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    const errorQuestion = screen.getByRole('group', {
      name: /reporting a vaccine administration error/i,
    });
    await user.click(within(errorQuestion).getByRole('radio', { name: 'Yes' }));
    const hadAeQuestion = screen.getByRole('group', {
      name: /did the patient experience any adverse event/i,
    });
    await user.click(within(hadAeQuestion).getByRole('radio', { name: 'No' }));
    expect(screen.queryByRole('heading', { name: 'Adverse event' })).not.toBeInTheDocument();

    // Switching to the public path must not carry the suppression: the error
    // questions do not exist there, so their answers leave with them.
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    expect(screen.getByRole('heading', { name: 'What happened' })).toBeInTheDocument();
  }, 30000);
});

describe('start over', () => {
  it('asks before clearing, and cancelling keeps the answers', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.type(screen.getByLabelText(/your name/i), 'Casey Reporter');

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    const confirm = screen.getByRole('group', { name: /starting over clears every answer/i });
    expect(confirm).toBeInTheDocument();

    await user.click(within(confirm).getByRole('button', { name: 'Keep my answers' }));
    expect(screen.queryByRole('group', { name: /starting over clears/i })).toBeNull();
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Casey Reporter');
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Start over' }));
  }, 30000);

  it('clears only after the explicit confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.type(screen.getByLabelText(/your name/i), 'Casey Reporter');

    await user.click(screen.getByRole('button', { name: 'Start over' }));
    const confirm = screen.getByRole('group', { name: /starting over clears every answer/i });
    await user.click(within(confirm).getByRole('button', { name: 'Clear all answers' }));

    // Path cleared: the public-path field is gone and the choice is reset.
    expect(screen.queryByLabelText(/your name/i)).toBeNull();
    expect(
      (screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }) as HTMLInputElement)
        .checked,
    ).toBe(false);
  }, 30000);
});

describe('admin reset all to defaults', () => {
  async function customize(user: ReturnType<typeof userEvent.setup>) {
    render(
      <ConfigProvider>
        <AdminPanel />
      </ConfigProvider>,
    );
    const box = screen.getAllByRole('textbox')[0];
    await user.type(box, ' X');
    expect(screen.getByText('Customized')).toBeInTheDocument();
  }

  it('asks before resetting, and cancelling keeps the customization', async () => {
    const user = userEvent.setup();
    await customize(user);

    await user.click(screen.getByRole('button', { name: 'Reset all to defaults' }));
    const confirm = screen.getByRole('group', { name: /removes every customization/i });
    await user.click(within(confirm).getByRole('button', { name: 'Keep my changes' }));

    expect(screen.getByText('Customized')).toBeInTheDocument();
  }, 30000);

  it('resets only after the explicit confirmation', async () => {
    const user = userEvent.setup();
    await customize(user);

    await user.click(screen.getByRole('button', { name: 'Reset all to defaults' }));
    const confirm = screen.getByRole('group', { name: /removes every customization/i });
    await user.click(within(confirm).getByRole('button', { name: 'Reset everything' }));

    expect(screen.getByText('Default configuration')).toBeInTheDocument();
  }, 30000);
});
