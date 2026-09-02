// ---------------------------------------------------------------------------
// Draft and publish (PWS 1.8). Changing a national reporting form should be a
// deliberate act, not a side effect of typing. Edits go to a draft, reporters
// keep seeing the published form until someone publishes, a publish is refused
// unless the draft passes its own integrity check, and every publish is
// recorded with who made it and what they called it.
//
// The configuration screen and the reporting form are separate routes, so the
// tests below visit them one at a time, the way a person does, and the state
// travels between them through the store's own persistence.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from '../admin/AdminPanel';
import { FormView } from '../components/FormView';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

const renderAdmin = () =>
  render(
    <ConfigProvider>
      <AdminPanel user="dana.reviewer" />
    </ConfigProvider>,
  );

const renderForm = () =>
  render(
    <ConfigProvider>
      <FormView />
    </ConfigProvider>,
  );

const labelBox = () => screen.getByLabelText('Label for reporterName');
const publishButton = () => screen.getByRole('button', { name: /publish to the live form/i });

describe('draft and publish', () => {
  it('opens with the draft matching what is live', () => {
    renderAdmin();
    expect(screen.getByText(/draft matches what is live/i)).toBeInTheDocument();
    expect(publishButton()).toBeDisabled();
  }, 30000);

  it('an unpublished edit changes the preview but not the reporting form', async () => {
    const user = userEvent.setup();
    const admin = renderAdmin();

    await user.clear(labelBox());
    await user.type(labelBox(), 'Who is reporting');

    expect(screen.getByText(/unpublished changes/i)).toBeInTheDocument();
    const preview = within(screen.getByRole('complementary', { name: /live form preview/i }));
    expect(preview.getByLabelText(/who is reporting/i)).toBeInTheDocument();
    admin.unmount();

    // A reporter arriving now still gets the published wording.
    renderForm();
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    expect(screen.getByLabelText(/reporter name/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/who is reporting/i)).toBeNull();
  }, 40000);

  it('publishing makes the draft live and records who changed what', async () => {
    const user = userEvent.setup();
    const admin = renderAdmin();

    await user.clear(labelBox());
    await user.type(labelBox(), 'Who is reporting');
    await user.type(
      screen.getByRole('textbox', { name: /describe this change/i }),
      'Plainer wording',
    );
    await user.click(publishButton());

    expect(screen.getByText(/draft matches what is live/i)).toBeInTheDocument();

    // The publish is on the record, with its label and who made it.
    await user.click(screen.getByRole('button', { name: /show publish history/i }));
    const history = document.querySelector('.publish-history') as HTMLElement;
    expect(within(history).getByText('Plainer wording')).toBeInTheDocument();
    expect(within(history).getByText(/dana\.reviewer/)).toBeInTheDocument();
    admin.unmount();

    // The reporting form now carries the new wording.
    renderForm();
    await user.click(screen.getByRole('radio', { name: 'Healthcare provider' }));
    expect(screen.getByLabelText(/who is reporting/i)).toBeInTheDocument();
  }, 40000);

  it('refuses to publish a question whose label has been cleared', async () => {
    const user = userEvent.setup();
    renderAdmin();

    // The exact attack: empty a label through the configuration screen and try
    // to push it to reporters. It must not reach them unnamed.
    await user.clear(labelBox());
    expect(screen.getByRole('status', { name: /configuration check/i })).toHaveTextContent(
      /unnamed/i,
    );

    await user.type(
      screen.getByRole('textbox', { name: /describe this change/i }),
      'Clear a label',
    );
    await user.click(publishButton());

    expect(screen.getByRole('alert')).toHaveTextContent(/not published/i);
    expect(screen.getByText(/unpublished changes/i)).toBeInTheDocument();
  }, 40000);

  it('refuses to publish without a description of the change', async () => {
    const user = userEvent.setup();
    renderAdmin();
    await user.clear(labelBox());
    await user.type(labelBox(), 'Who is reporting');

    // No description at all.
    await user.click(publishButton());
    expect(screen.getByRole('alert')).toHaveTextContent(/describe this change/i);
    expect(screen.getByText(/unpublished changes/i)).toBeInTheDocument();

    // A description of invisible characters is no better than none.
    await user.type(screen.getByRole('textbox', { name: /describe this change/i }), '​');
    await user.click(publishButton());
    expect(screen.getByRole('alert')).toHaveTextContent(/describe this change/i);
  }, 40000);

  it('discarding the draft restores the published wording', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.clear(labelBox());
    await user.type(labelBox(), 'Temporary wording');
    expect(screen.getByText(/unpublished changes/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /discard draft/i }));
    const confirm = screen.getByRole('group', { name: /throws away every unpublished edit/i });
    await user.click(within(confirm).getByRole('button', { name: /discard it/i }));

    expect(screen.getByText(/draft matches what is live/i)).toBeInTheDocument();
    expect(labelBox()).toHaveValue('Reporter name');
  }, 40000);
});
