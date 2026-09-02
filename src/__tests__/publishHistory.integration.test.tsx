// ---------------------------------------------------------------------------
// The publish history is shared by every tab of the configuration screen, so
// one tab must not serialise its stale in-memory copy over another tab's work.
// A tab that has been sitting idle while someone else published has to keep
// their record, and its own publish has to land on top of theirs rather than
// replacing them. This is the audit trail the governance story rests on.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from '../admin/AdminPanel';

const HISTORY_KEY = 'vaers.admin.history.v1';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const renderAdmin = (user: string) =>
  render(
    <ConfigProvider>
      <AdminPanel user={user} />
    </ConfigProvider>,
  );

const storedHistory = () => JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');

async function publish(u: ReturnType<typeof userEvent.setup>, label: string, value: string) {
  const box = screen.getByLabelText('Label for reporterName');
  await u.clear(box);
  await u.type(box, value);
  await u.type(screen.getByRole('textbox', { name: /describe this change/i }), label);
  await u.click(screen.getByRole('button', { name: /publish to the live form/i }));
}

describe('publish history across tabs', () => {
  it('editing a draft never rewrites the shared history', async () => {
    const user = userEvent.setup();

    // One tab publishes.
    const first = renderAdmin('dana.reviewer');
    await publish(user, 'first change', 'First wording');
    expect(storedHistory()).toHaveLength(1);
    first.unmount();

    // A second tab opens and someone types in it. That is draft work, and it
    // must leave the published record alone.
    renderAdmin('sam.editor');
    await user.type(screen.getByLabelText('Label for reporterEmail'), ' X');

    expect(storedHistory()).toHaveLength(1);
    expect(storedHistory()[0].label).toBe('first change');
  }, 40000);

  it('a later publish is added to the stored history, not substituted for it', async () => {
    const user = userEvent.setup();

    const first = renderAdmin('dana.reviewer');
    await publish(user, 'first change', 'First wording');
    first.unmount();

    // A tab that never saw the first publish makes its own.
    renderAdmin('sam.editor');
    await publish(user, 'second change', 'Second wording');

    const history = storedHistory();
    expect(history.map((h: { label: string }) => h.label)).toEqual([
      'second change',
      'first change',
    ]);
    expect(history[1].by).toBe('dana.reviewer');
  }, 40000);
});
