// ---------------------------------------------------------------------------
// Redesigned landing page and entry navigation (PWS 1.4).
//
// The job of this page is to get a reporter to the right starting point fast,
// and to make the two audiences feel addressed rather than funnelled through
// one generic door. It also carries the site-navigation survey (PWS 1.5) and
// provides a second route to the FAQ, which is what WCAG 2.4.5 asks for.
// ---------------------------------------------------------------------------
import { useRef, useState } from 'react';
import { useConfig } from '../state/ConfigStore';
import { FaqPanel } from './FaqPanel';
import { SurveyDialog } from './SurveyDialog';

export function LandingView() {
  const { config, faqs } = useConfig();
  const [faqOpen, setFaqOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const faqBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="wrap">
          <p className="agency">Centers for Disease Control and Prevention · Prototype</p>
          <h1 id="landing-title">Report a problem after a vaccine</h1>
          <p className="lede">
            The Vaccine Adverse Event Reporting System is a national early-warning
            system co-managed by CDC and FDA. Anyone can file a report. You do not
            need to be certain the vaccine caused the problem.
          </p>
          <a className="btn btn-hero" href="#/report">
            Start a report
          </a>
          <p className="hero-note">Takes most people under ten minutes.</p>
        </div>
      </section>

      <main id="main" className="wrap landing" tabIndex={-1}>
        <h2 className="landing-h2">Who is reporting?</h2>
        <p className="landing-sub">
          The form adapts to your answer. You will be asked this on the first screen.
        </p>

        <div className="path-cards">
          <a className="path-card" href="#/report">
            <span className="pc-kicker">For the public</span>
            <span className="pc-title">Patient, parent, or caregiver</span>
            <span className="pc-body">
              Plain language throughout. We skip the clinical questions and ask only
              what you would reasonably know.
            </span>
            <span className="pc-go" aria-hidden="true">
              Start &#8594;
            </span>
          </a>
          <a className="path-card" href="#/report">
            <span className="pc-kicker">For clinicians</span>
            <span className="pc-title">Healthcare provider</span>
            <span className="pc-body">
              Full clinical detail, plus a dedicated path for reporting a vaccine
              administration error.
            </span>
            <span className="pc-go" aria-hidden="true">
              Start &#8594;
            </span>
          </a>
        </div>

        <h2 className="landing-h2">Before you start</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>What to have ready</h3>
            <ul>
              <li>The vaccination record or card, if you have it</li>
              <li>The date the vaccine was given</li>
              <li>A description of what happened and when it started</li>
              <li>Any relevant medical records you want to attach</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>What happens to a report</h3>
            <ul>
              <li>Reports are reviewed for possible safety signals</li>
              <li>A report does not mean the vaccine caused the event</li>
              <li>Healthcare providers are required to report certain events</li>
              <li>De-identified data is published for public and researcher use</li>
            </ul>
          </div>
        </div>

        <h2 className="landing-h2">More</h2>
        <div className="link-row">
          <button
            ref={faqBtnRef}
            type="button"
            className="link-tile"
            aria-haspopup="dialog"
            onClick={() => setFaqOpen(true)}
          >
            <span className="lt-title">Frequently asked questions</span>
            <span className="lt-body">Who can report, what counts, and what happens next.</span>
          </button>
          <a className="link-tile" href="#/report">
            <span className="lt-title">Start a report</span>
            <span className="lt-body">Go straight to the reporting form.</span>
          </a>
          <span className="link-tile is-placeholder">
            <span className="lt-title">Download VAERS data</span>
            <span className="lt-body">
              Public de-identified data sets. Not implemented in this prototype.
            </span>
          </span>
        </div>

        <div className="nav-survey-prompt">
          <p>Could you find what you were looking for?</p>
          <button type="button" className="btn btn-outline" onClick={() => setSurveyOpen(true)}>
            Give us feedback on this site
          </button>
        </div>
      </main>

      <FaqPanel
        open={faqOpen}
        onClose={() => {
          setFaqOpen(false);
          faqBtnRef.current?.focus();
        }}
        faqs={faqs}
      />
      <SurveyDialog
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        survey={config.surveys.siteNavigation}
      />
    </>
  );
}
