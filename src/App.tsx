import { ConfigProvider } from './state/ConfigStore';
import { FormView } from './components/FormView';
import { LandingView } from './components/LandingView';
import { AdminView } from './admin/AdminView';
import { useHashRoute } from './hooks/useHashRoute';

function SiteNav({ route }: { route: string }) {
  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <a className="brand" href="#/">
          VAERS <span>· CDC reporting prototype</span>
        </a>
        <nav aria-label="Primary">
          <a href="#/" aria-current={route === '' ? 'page' : undefined}>
            Home
          </a>
          <a href="#/report" aria-current={route === 'report' ? 'page' : undefined}>
            Report
          </a>
          <a href="#/admin" aria-current={route === 'admin' ? 'page' : undefined}>
            Admin
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  const route = useHashRoute();

  return (
    <ConfigProvider>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <SiteNav route={route} />

      {route === 'admin' ? (
        <AdminView />
      ) : route === 'report' ? (
        <FormView />
      ) : (
        <LandingView />
      )}

      <footer className="app-footer">
        <div className="wrap">
          <p>
            Prototype for demonstration only (CDC RFQ 75D301-26-Q-00146). Do not
            enter real personal or health information. No data is stored or
            transmitted.
          </p>
        </div>
      </footer>
    </ConfigProvider>
  );
}
