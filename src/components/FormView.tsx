// ---------------------------------------------------------------------------
// The public reporting page: intro hero, a Help & FAQ launcher, and the live
// form rendered from the (possibly admin-customized) effective config.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useConfig } from '../state/ConfigStore';
import { FormProvider } from '../state/FormContext';
import { FormRenderer } from './FormRenderer';
import { FaqPanel } from './FaqPanel';

export function FormView() {
  const { config, faqs } = useConfig();
  const [faqOpen, setFaqOpen] = useState(false);
  const faqButtonRef = useRef<HTMLButtonElement>(null);

  const closeFaq = () => {
    setFaqOpen(false);
    faqButtonRef.current?.focus();
  };

  return (
    <>
      <section className="app-header" aria-labelledby="form-title">
        <div className="wrap">
          <p className="agency">Centers for Disease Control and Prevention · Prototype</p>
          <h1 id="form-title">{config.title}</h1>
          {config.intro && <p className="lede">{config.intro}</p>}
        </div>
      </section>

      <main id="main" className="wrap" tabIndex={-1}>
        <div className="form-toolbar">
          <button
            ref={faqButtonRef}
            type="button"
            className="btn btn-outline"
            aria-haspopup="dialog"
            onClick={() => setFaqOpen(true)}
          >
            Help &amp; FAQ
          </button>
        </div>

        <FormProvider config={config}>
          <FormRenderer />
        </FormProvider>
      </main>

      <FaqPanel open={faqOpen} onClose={closeFaq} faqs={faqs} />
    </>
  );
}
