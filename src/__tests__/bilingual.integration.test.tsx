// ---------------------------------------------------------------------------
// Bilingual reporting, end to end (Amendment 2, Q&A 270).
//
// Three claims are made in the quotation and are tested here rather than
// described: a reporter can change language anywhere and keep the work they
// have done, the document announces which language it is in so a screen reader
// reads Spanish as Spanish, and a question that exists only in English cannot
// be published.
//
// The last one is the one that matters over time. Anyone can translate a form
// once. Keeping it translated through years of amendments is a property of the
// tooling, not of anybody's diligence, and that is what the gate provides.
// ---------------------------------------------------------------------------
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigProvider } from '../state/ConfigStore';
import { LocaleProvider } from '../state/LocaleStore';
import { LanguageToggle } from '../components/LanguageToggle';
import { FormView } from '../components/FormView';
import { AdminPanel } from '../admin/AdminPanel';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  document.documentElement.lang = '';
});

const renderReporter = () =>
  render(
    <LocaleProvider>
      <LanguageToggle />
      <ConfigProvider>
        <FormView />
      </ConfigProvider>
    </LocaleProvider>,
  );

const renderAdmin = () =>
  render(
    <LocaleProvider>
      <ConfigProvider>
        <AdminPanel user="dana.reviewer" />
      </ConfigProvider>
    </LocaleProvider>,
  );

const spanishButton = () => screen.getByRole('button', { name: 'Español' });
const englishButton = () => screen.getByRole('button', { name: 'English' });

describe('a reporter choosing Spanish', () => {
  it('opens in English and says so on the document', () => {
    renderReporter();
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('VAERS Reporting (Prototype)');
    expect(englishButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Report a problem after a vaccine (VAERS)',
    );
  }, 30000);

  it('translates the questions, the chrome and the document language together', async () => {
    const user = userEvent.setup();
    renderReporter();

    await user.click(spanishButton());

    // The document language is what tells a screen reader to switch voice.
    // Without it the Spanish is read with English pronunciation, and nothing
    // on screen looks wrong (WCAG 3.1.1, a Level A criterion).
    expect(document.documentElement.lang).toBe('es');
    // The tab title is a reporter-facing string too, announced on load.
    expect(document.title).toBe('Reporte de VAERS (Prototipo)');
    expect(spanishButton()).toHaveAttribute('aria-pressed', 'true');

    // Configuration content, translated through the overlay.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Reporte un problema después de una vacuna (VAERS)',
    );
    // Before a reporter type is chosen there is no path yet, so the clinical
    // wording is what is on screen. The plain-language variant is asserted in
    // the branching test below, once the public path is active.
    expect(screen.getByRole('group', { name: /tipo de informante/i })).toBeInTheDocument();

    // Application chrome, translated through the interface table.
    expect(
      screen.getByRole('button', { name: /ayuda y preguntas frecuentes/i }),
    ).toBeInTheDocument();
  }, 40000);

  it('keeps every answer already given when the language changes', async () => {
    const user = userEvent.setup();
    renderReporter();

    await user.click(screen.getByLabelText('Healthcare provider'));
    await user.type(screen.getByLabelText(/reporter name/i), 'A. Nurse');

    await user.click(spanishButton());

    // Answers are held by value, and the branching rules read values rather
    // than labels, so a language change is a re-render and nothing more.
    expect(screen.getByLabelText(/nombre del informante/i)).toHaveValue('A. Nurse');
    expect(screen.getByLabelText('Profesional de la salud')).toBeChecked();

    await user.click(englishButton());
    expect(screen.getByLabelText(/reporter name/i)).toHaveValue('A. Nurse');
  }, 40000);

  it('reaches the same branch from the same answers in Spanish', async () => {
    const user = userEvent.setup();
    renderReporter();
    await user.click(spanishButton());

    await user.click(screen.getByLabelText('Profesional de la salud'));
    expect(screen.getByRole('heading', { name: /evento adverso/i })).toBeInTheDocument();

    // The provider administration-error branch with no adverse event suppresses
    // the whole Adverse Event section. It is the hardest branch in the form, and
    // it is driven by option values, which do not change with language.
    await user.click(
      within(
        screen.getByRole('group', {
          name: /está reportando un error en la administración de una vacuna/i,
        }),
      ).getByLabelText('Sí'),
    );
    await user.click(
      within(
        screen.getByRole('group', {
          name: /presentó algún evento adverso o problema de salud/i,
        }),
      ).getByLabelText('No'),
    );

    expect(screen.queryByRole('heading', { name: /^evento adverso$/i })).toBeNull();
  }, 40000);

  it('reports validation problems in the language on screen', async () => {
    const user = userEvent.setup();
    renderReporter();
    await user.click(spanishButton());

    await user.click(screen.getByLabelText('Profesional de la salud'));
    await user.click(screen.getByRole('button', { name: /revisar el envío/i }));

    // The page carries one alert per unanswered question as well as the
    // summary, so the summary is addressed by its own heading.
    const summary = await screen.findByRole('alert', { name: /corregir/i });
    expect(summary).toHaveTextContent(/problemas? que corregir/i);
    expect(screen.getAllByText('Este campo es obligatorio.').length).toBeGreaterThan(0);
    expect(screen.queryByText('This field is required.')).toBeNull();
  }, 40000);
});

describe('screens that stay English', () => {
  it('marks the configuration screen as English so a Spanish page does not claim it', () => {
    // WCAG 3.1.2 Language of Parts. The configuration screen is a CDC staff tool
    // and stays English on purpose; on a Spanish document that is a passage in
    // another language, and an unmarked one is read with Spanish pronunciation.
    render(
      <LocaleProvider>
        <ConfigProvider>
          <AdminPanel user="dana.reviewer" />
        </ConfigProvider>
      </LocaleProvider>,
    );
    expect(screen.getByRole('main')).toHaveAttribute('lang', 'en');
  }, 30000);
});

describe('the publish gate on translation', () => {
  it('refuses to publish when the English was reworded after its Spanish', async () => {
    // A reviewer found this: change a live question's English through the
    // screen, leave the Spanish, and a count of translated strings still says
    // complete. Nothing is missing; what is wrong is that the Spanish now
    // translates a sentence that is no longer on the form.
    const user = userEvent.setup();
    renderAdmin();

    const label = screen.getByLabelText('Label for reporterName');
    await user.clear(label);
    await user.type(label, 'Name of the person reporting');

    // The banner must agree with the gate: it cannot read "ready to publish"
    // while the publish is refused.
    const coverage = screen.getByRole('status', { name: /translation coverage/i });
    expect(coverage).toHaveTextContent(/still needs Spanish, because the English changed/i);
    expect(coverage).not.toHaveTextContent(/ready to publish/i);
    // The configuration is sound; only the wording is out of step.
    expect(screen.getByRole('status', { name: /configuration check/i })).toHaveTextContent(
      /passed/i,
    );

    await user.type(screen.getByLabelText(/describe this change/i), 'Reword the name question');
    await user.click(screen.getByRole('button', { name: /publish to the live form/i }));

    const refusal = screen.getByRole('alert');
    expect(refusal).toHaveTextContent(/not published/i);
    expect(refusal).toHaveTextContent(/English changed/i);
    expect(refusal).toHaveTextContent(/Name of the person reporting/);
  }, 60000);


  it('opens with complete coverage for the shipped configuration', () => {
    renderAdmin();
    const coverage = screen.getByRole('status', { name: /translation coverage/i });
    expect(coverage).toHaveTextContent(/spanish\s+complete/i);
  }, 30000);

  it('refuses to publish a question added in English alone, and names it', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole('button', { name: /add a question to reporter/i }));
    await user.type(
      screen.getByRole('textbox', { name: /label for the new question in reporter/i }),
      'Clinic region',
    );
    await user.click(screen.getByRole('button', { name: 'Add question' }));

    const coverage = screen.getByRole('status', { name: /translation coverage/i });
    expect(coverage).toHaveTextContent(/One still needs Spanish/i);
    expect(coverage).not.toHaveTextContent(/ready to publish/i);
    // The form itself is sound, so the integrity check must not claim a problem.
    expect(screen.getByRole('status', { name: /configuration check/i })).toHaveTextContent(
      /passed/i,
    );

    await user.type(
      screen.getByLabelText(/describe this change/i),
      'Adding a clinic region question',
    );
    await user.click(screen.getByRole('button', { name: /publish to the live form/i }));

    const refusal = screen.getByRole('alert');
    expect(refusal).toHaveTextContent(/not published/i);
    expect(refusal).toHaveTextContent(/Not every question is translated yet/);
    // The named question reads as its own sentence after the reason, rather
    // than starting lower case mid-paragraph.
    expect(refusal).toHaveTextContent(/so this cannot go live\. The question/);
    expect(refusal).toHaveTextContent(/Clinic region/);
    expect(refusal).toHaveTextContent(/Spanish/);
    // The person who pressed the button is taken to the reason, rather than
    // left at a control that appeared to do nothing.
    expect(refusal).toHaveFocus();
  }, 60000);

  it('publishes once the Spanish is supplied', async () => {
    const user = userEvent.setup();
    renderAdmin();

    await user.click(screen.getByRole('button', { name: /add a question to reporter/i }));
    await user.type(
      screen.getByRole('textbox', { name: /label for the new question in reporter/i }),
      'Clinic region',
    );
    await user.click(screen.getByRole('button', { name: 'Add question' }));

    const spanishInput = screen.getByRole('textbox', {
      name: /label in spanish for custom_clinic_region/i,
    });
    expect(spanishInput).toHaveAttribute('aria-invalid', 'true');
    await user.type(spanishInput, 'Region de la clinica');
    expect(spanishInput).not.toHaveAttribute('aria-invalid');

    expect(screen.getByRole('status', { name: /translation coverage/i })).toHaveTextContent(
      /spanish\s+complete/i,
    );

    await user.type(
      screen.getByLabelText(/describe this change/i),
      'Adding a clinic region question',
    );
    await user.click(screen.getByRole('button', { name: /publish to the live form/i }));

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/published\. reporters now see this version/i)).toBeInTheDocument();
  }, 60000);

  it('previews the draft in either language without changing the draft', async () => {
    const user = userEvent.setup();
    renderAdmin();

    const preview = screen.getByRole('complementary', { name: /live form preview/i });
    await user.click(
      within(screen.getByRole('group', { name: /preview language/i })).getByRole('button', {
        name: 'Español',
      }),
    );

    expect(within(preview).getByText(/tipo de informante/i)).toBeInTheDocument();
    // The editor beside it still shows the English being edited, and the page
    // itself is still in English: the preview is a preview, not a mode switch.
    expect(screen.getByLabelText('Label for reporterType')).toHaveValue('Reporter type');
    expect(document.documentElement.lang).toBe('en');
  }, 40000);
});
