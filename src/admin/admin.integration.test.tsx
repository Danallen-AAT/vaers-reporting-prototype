// ---------------------------------------------------------------------------
// The low-code money shot (Task 1.8): an admin edit updates the live preview
// immediately, and reset restores defaults - all from the shared config store.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from './AdminPanel';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderAdmin() {
  return render(
    <ConfigProvider>
      <AdminPanel />
    </ConfigProvider>,
  );
}

describe('admin config surface', () => {
  it('re-renders the live preview immediately when a label is edited', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const preview = screen.getByRole('complementary', { name: /live form preview/i });
    expect(within(preview).getByLabelText(/reporter name/i)).toBeInTheDocument();

    const labelInput = screen.getByLabelText('Label for reporterName');
    await user.clear(labelInput);
    await user.type(labelInput, 'Person completing this report');

    // No navigation, no redeploy - the preview reflects the new label.
    expect(
      within(preview).getByLabelText(/person completing this report/i),
    ).toBeInTheDocument();
    expect(within(preview).queryByLabelText(/reporter name/i)).not.toBeInTheDocument();
  });

  it('resets all customizations back to defaults', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const labelInput = screen.getByLabelText('Label for reporterName');
    await user.clear(labelInput);
    await user.type(labelInput, 'Renamed field');

    await user.click(screen.getByRole('button', { name: /reset all to defaults/i }));

    const preview = screen.getByRole('complementary', { name: /live form preview/i });
    expect(within(preview).getByLabelText(/reporter name/i)).toBeInTheDocument();
  });
});
