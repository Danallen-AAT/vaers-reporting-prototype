// ---------------------------------------------------------------------------
// Guards on destructive actions (SC 3.3.4 discipline applied to the app's own
// chrome). Changing reporter type is non-destructive and shares one behavior
// with the in-form radio; clearing a report and resetting the admin
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
  it('is non-destructive: moves to the reporter question and keeps every answer', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
    await user.type(screen.getByLabelText(/your name/i), 'Casey Reporter');

    await user.click(screen.getByRole('button', { name: /change reporter type/i }));

    // Focus lands on the reporter-type question, nothing is cleared.
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }),
    );
    expect(screen.getByLabelText(/your name/i)).toHaveValue('Casey Reporter');
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
