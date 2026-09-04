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
import { useLocale } from '../state/LocaleStore';
import { FaqPanel } from './FaqPanel';
import { SurveyDialog } from './SurveyDialog';

export function LandingView() {
  const { config, faqs } = useConfig();
  const { t } = useLocale();
  const [faqOpen, setFaqOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const faqBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="wrap">
          <p className="agency">{t('chrome.agency')}</p>
          <h1 id="landing-title">{t('landing.title')}</h1>
          <p className="lede">{t('landing.lede')}</p>
          <a className="btn btn-hero" href="#/report">
            {t('landing.start')}
          </a>
          <p className="hero-note">{t('landing.heroNote')}</p>
        </div>
      </section>

      <main id="main" className="wrap landing" tabIndex={-1}>
        <h2 className="landing-h2">{t('landing.whoTitle')}</h2>
        <p className="landing-sub">{t('landing.whoSub')}</p>

        <div className="path-cards">
          <a className="path-card" href="#/report">
            <span className="pc-kicker">{t('landing.publicKicker')}</span>
            <span className="pc-title">{t('landing.publicTitle')}</span>
            <span className="pc-body">{t('landing.publicBody')}</span>
            <span className="pc-go" aria-hidden="true">
              {t('landing.cardGo')} &#8594;
            </span>
          </a>
          <a className="path-card" href="#/report">
            <span className="pc-kicker">{t('landing.providerKicker')}</span>
            <span className="pc-title">{t('landing.providerTitle')}</span>
            <span className="pc-body">{t('landing.providerBody')}</span>
            <span className="pc-go" aria-hidden="true">
              {t('landing.cardGo')} &#8594;
            </span>
          </a>
        </div>

        <h2 className="landing-h2">{t('landing.beforeTitle')}</h2>
        <div className="info-grid">
          <div className="info-card">
            <h3>{t('landing.readyTitle')}</h3>
            <ul>
              <li>{t('landing.ready1')}</li>
              <li>{t('landing.ready2')}</li>
              <li>{t('landing.ready3')}</li>
              <li>{t('landing.ready4')}</li>
            </ul>
          </div>
          <div className="info-card">
            <h3>{t('landing.happensTitle')}</h3>
            <ul>
              <li>{t('landing.happens1')}</li>
              <li>{t('landing.happens2')}</li>
              <li>{t('landing.happens3')}</li>
              <li>{t('landing.happens4')}</li>
            </ul>
          </div>
        </div>

        <h2 className="landing-h2">{t('landing.moreTitle')}</h2>
        <div className="link-row">
          <button
            ref={faqBtnRef}
            type="button"
            className="link-tile"
            aria-haspopup="dialog"
            onClick={() => setFaqOpen(true)}
          >
            <span className="lt-title">{t('landing.faqTile')}</span>
            <span className="lt-body">{t('landing.faqTileBody')}</span>
          </button>
          <a className="link-tile" href="#/report">
            <span className="lt-title">{t('landing.start')}</span>
            <span className="lt-body">{t('landing.startTileBody')}</span>
          </a>
          <a
            className="link-tile"
            href="https://vaers.hhs.gov/data.html"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="lt-title">{t('landing.dataTile')}</span>
            <span className="lt-body">{t('landing.dataTileBody')}</span>
          </a>
        </div>

        <div className="nav-survey-prompt">
          <p>{t('landing.surveyPrompt')}</p>
          <button type="button" className="btn btn-outline" onClick={() => setSurveyOpen(true)}>
            {t('landing.surveyButton')}
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
