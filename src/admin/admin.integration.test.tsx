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

  it('tells the author which inputs drive the path being previewed', async () => {
    // Regression: the editor list is identical for both reporter paths, so an
    // author previewing the provider path could edit the public label, see the
    // preview not move, and conclude the editor was broken.
    const user = userEvent.setup();
    renderAdmin();

    const rowFor = (label: string) =>
      screen.getByLabelText(label).closest('.fe-row') as HTMLElement;

    // Provider preview: the clinical label is the live one.
    await user.click(screen.getByRole('button', { name: 'Provider' }));
    expect(within(rowFor('Label for reporterName')).getByText(/in preview/i)).toBeInTheDocument();
    expect(
      within(rowFor('Public label for reporterName')).queryByText(/in preview/i),
    ).not.toBeInTheDocument();

    // Public preview: the marker moves to the public label.
    await user.click(screen.getByRole('button', { name: 'Public' }));
    expect(
      within(rowFor('Public label for reporterName')).getByText(/in preview/i),
    ).toBeInTheDocument();
  }, 30000);

  it('marks fields that do not appear in the previewed path', async () => {
    const user = userEvent.setup();
    renderAdmin();

    // relationToPatient is public-only, so it is not in the provider preview.
    await user.click(screen.getByRole('button', { name: 'Provider' }));
    const card = screen
      .getByLabelText('Label for relationToPatient')
      .closest('.field-editor') as HTMLElement;
    expect(card).toHaveClass('out-of-view');
    expect(within(card).getByText(/not shown in the provider preview/i)).toBeInTheDocument();

    // It is in view on the public path.
    await user.click(screen.getByRole('button', { name: 'Public' }));
    expect(
      screen.getByLabelText('Label for relationToPatient').closest('.field-editor'),
    ).not.toHaveClass('out-of-view');
  }, 30000);

  it('resets all customizations back to defaults', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const labelInput = screen.getByLabelText('Label for reporterName');
    await user.clear(labelInput);
    await user.type(labelInput, 'Renamed field');

    // Reset is a guarded, two-step action: the trigger opens a confirmation
    // and only the explicit confirm resets.
    await user.click(screen.getByRole('button', { name: /reset all to defaults/i }));
    const confirm = screen.getByRole('group', { name: /removes every customization/i });
    await user.click(within(confirm).getByRole('button', { name: 'Reset everything' }));

    const preview = screen.getByRole('complementary', { name: /live form preview/i });
    expect(within(preview).getByLabelText(/reporter name/i)).toBeInTheDocument();
  });
});
