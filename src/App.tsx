import { ConfigProvider } from './state/ConfigStore';
import { LocaleProvider, useLocale } from './state/LocaleStore';
import { FormView } from './components/FormView';
import { LandingView } from './components/LandingView';
import { AboutView } from './components/AboutView';
import { LanguageToggle } from './components/LanguageToggle';
import { AdminView } from './admin/AdminView';
import { useHashRoute } from './hooks/useHashRoute';
import { handleJump } from './lib/inPageJump';

function SiteNav({ route }: { route: string }) {
  const { t } = useLocale();
  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <a className="brand" href="#/">
          VAERS <span>{t('nav.brandSuffix')}</span>
        </a>
        <nav aria-label={t('nav.primary')}>
          <a href="#/" aria-current={route === '' ? 'page' : undefined}>
            {t('nav.home')}
          </a>
          <a href="#/report" aria-current={route === 'report' ? 'page' : undefined}>
            {t('nav.report')}
          </a>
          <a href="#/admin" aria-current={route === 'admin' ? 'page' : undefined}>
            {t('nav.admin')}
          </a>
          <a href="#/about" aria-current={route === 'about' ? 'page' : undefined}>
            {t('nav.about')}
          </a>
        </nav>
      </div>
    </header>
  );
}

function Shell() {
  const route = useHashRoute();
  const { t } = useLocale();

  return (
    <ConfigProvider>
      {/* The navigation is cancelled deliberately. A bare href="#main" sets the
          routing hash to "main", which matches no route, so the skip link used
          to send the user to the landing page instead of the main region. */}
      <a className="skip-link" href="#main" onClick={handleJump('main')}>
        {t('nav.skip')}
      </a>
      <div className="utility-bar">
        <div className="wrap utility-inner">
          <LanguageToggle />
        </div>
      </div>
      <SiteNav route={route} />

      {route === 'admin' ? (
        <AdminView />
      ) : route === 'about' ? (
        <AboutView />
      ) : route === 'report' ? (
        <FormView />
      ) : (
        <LandingView />
      )}

      <footer className="app-footer">
        <div className="wrap">
          <p>{t('footer.disclaimer')}</p>
        </div>
      </footer>
    </ConfigProvider>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <Shell />
    </LocaleProvider>
  );
}
