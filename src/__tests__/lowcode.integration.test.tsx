// ---------------------------------------------------------------------------
// Point-and-click question creation through the admin surface (Task 1.8,
// PRS#8, Amendment 1 Q&A 165): an administrator adds a question, gives it
// choices, sets the answer that makes it appear, watches the live preview
// obey, and removes it behind an explicit confirmation. Base-schema questions
// expose no remove control.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '../state/ConfigStore';
import { AdminPanel } from '../admin/AdminPanel';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

function renderAdmin() {
  render(
    <ConfigProvider>
      <AdminPanel />
    </ConfigProvider>,
  );
  return within(screen.getByRole('complementary', { name: /live form preview/i }));
}

async function openReporterSection() {
  // The first section's editor is open by default and is the reporter section.
  return screen.getByRole('button', { name: /add a question to reporter/i });
}

describe('adding a question through the admin surface', () => {
  it('creates a short-answer question that appears in the live preview at once', async () => {
    const user = userEvent.setup();
    const preview = renderAdmin();

    await user.click(await openReporterSection());
    await user.type(
      screen.getByRole('textbox', { name: /label for the new question in reporter/i }),
      'Best callback time',
    );
    await user.click(screen.getByRole('button', { name: 'Add question' }));

    expect(preview.getByLabelText(/best callback time/i)).toBeInTheDocument();
    expect(screen.getByText('Added here')).toBeInTheDocument();
  }, 30000);

  it('creates a choice question with a visibility condition the preview obeys', async () => {
    const user = userEvent.setup();
    const preview = renderAdmin();

    await user.click(await openReporterSection());
    await user.type(
      screen.getByRole('textbox', { name: /label for the new question in reporter/i }),
      'Clinic region',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /answer type for the new question in reporter/i }),
      'select',
    );
    await user.type(
      screen.getByRole('textbox', { name: /choices for the new question in reporter/i }),
      'East\nWest',
    );
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    expect(preview.getByLabelText(/clinic region/i)).toBeInTheDocument();

    // Condition: shown only when the reporter is a healthcare provider.
    await user.selectOptions(
      screen.getByRole('combobox', { name: /visibility rule for custom_clinic_region/i }),
      'when',
    );
    // Defaults to the first eligible controller; pick reporterType = provider.
    await user.selectOptions(
      screen.getByRole('combobox', { name: /controlling question for custom_clinic_region/i }),
      'reporterType',
    );
    await user.selectOptions(
      screen.getByRole('combobox', { name: /controlling answer for custom_clinic_region/i }),
      'provider',
    );

    // Provider preview satisfies the condition; public preview does not.
    expect(preview.getByLabelText(/clinic region/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Public' }));
    expect(preview.queryByLabelText(/clinic region/i)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Provider' }));
    expect(preview.getByLabelText(/clinic region/i)).toBeInTheDocument();
  }, 40000);

  it('removes an added question only behind an explicit confirmation', async () => {
    const user = userEvent.setup();
    const preview = renderAdmin();

    await user.click(await openReporterSection());
    await user.type(
      screen.getByRole('textbox', { name: /label for the new question in reporter/i }),
      'Temporary question',
    );
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    expect(preview.getByLabelText(/temporary question/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove this question' }));
    const confirm = screen.getByRole('group', { name: /deletes the question from the form/i });
    await user.click(within(confirm).getByRole('button', { name: 'Remove it' }));

    expect(preview.queryByLabelText(/temporary question/i)).toBeNull();
    expect(screen.queryByText('Added here')).toBeNull();
  }, 30000);

  it('offers no remove control on base-schema questions', () => {
    renderAdmin();
    const stock = screen
      .getByLabelText('Label for reporterName')
      .closest('.field-editor') as HTMLElement;
    expect(within(stock).queryByRole('button', { name: /remove this question/i })).toBeNull();
    expect(within(stock).getByRole('button', { name: /revert this field/i })).toBeInTheDocument();
  });

  it('explains base-schema branching rules in plain language', () => {
    renderAdmin();
    // The 1.6.2 error-type question is conditional on the error answer.
    expect(screen.getAllByText(/shown when/i).length).toBeGreaterThan(0);
  });
});
