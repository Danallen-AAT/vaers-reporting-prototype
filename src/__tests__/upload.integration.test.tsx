// ---------------------------------------------------------------------------
// Functional client-side upload (PWS 2.1, 2.4.1, PRS#9). Selection, the
// configured Phase 1 policy (documents only, size-capped), listing, removal,
// and the flow of attached names into the structured output. Nothing is read,
// stored, or transmitted; the demonstration works entirely on file metadata.
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

const pdf = (name: string, bytes = 2048) =>
  new File([new Uint8Array(bytes)], name, { type: 'application/pdf' });

async function openPublicPath(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: 'Patient, parent, or caregiver' }));
  return screen.getByLabelText(/upload supporting documents/i) as HTMLInputElement;
}

describe('functional upload, Phase 1 policy', () => {
  it('accepts a PDF, lists it with its size, and announces the count', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openPublicPath(user);
    await user.upload(input, pdf('discharge-summary.pdf'));

    const list = await screen.findByRole('list', { name: /attached documents/i });
    expect(within(list).getByText('discharge-summary.pdf')).toBeInTheDocument();
    expect(within(list).getByText('2 KB')).toBeInTheDocument();
    expect(screen.getByText('1 document attached.')).toBeInTheDocument();
  }, 30000);

  it('rejects a non-document type with the Phase 1 reason, and does not list it', async () => {
    // applyAccept off at setup: simulates the picker's All Files mode or a
    // drag-drop, exactly the path the component's own validation must guard.
    const user = userEvent.setup({ applyAccept: false });
    render(<App />);
    const input = await openPublicPath(user);
    await user.upload(
      input,
      new File([new Uint8Array(10)], 'xray-photo.jpg', { type: 'image/jpeg' }),
    );

    const alert = await screen.findByText(/pictures and medical imaging arrive in phase 2/i);
    expect(alert).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /attached documents/i })).toBeNull();
  }, 30000);

  it('rejects a file over the configured size limit', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openPublicPath(user);
    await user.upload(input, pdf('huge-record.pdf', 11 * 1024 * 1024));

    expect(await screen.findByText(/larger than the 10 MB limit/i)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /attached documents/i })).toBeNull();
  }, 30000);

  it('removes an attached document by name, keyboard-operably', async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = await openPublicPath(user);
    await user.upload(input, [pdf('visit-notes.pdf'), pdf('lab-results.pdf')]);
    await screen.findByRole('list', { name: /attached documents/i });

    await user.click(screen.getByRole('button', { name: 'Remove visit-notes.pdf' }));
    const list = screen.getByRole('list', { name: /attached documents/i });
    expect(within(list).queryByText('visit-notes.pdf')).toBeNull();
    expect(within(list).getByText('lab-results.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 document attached.')).toBeInTheDocument();
  }, 30000);
});
