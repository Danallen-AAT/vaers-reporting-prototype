import { ConfigProvider } from './state/ConfigStore';
import { FormView } from './components/FormView';
import { AdminView } from './admin/AdminView';
import { useHashRoute } from './hooks/useHashRoute';

function SiteNav({ route }: { route: string }) {
  const isAdmin = route === 'admin';
  return (
    <header className="site-nav">
      <div className="wrap nav-inner">
        <a className="brand" href="#/">
          VAERS <span>· CDC reporting prototype</span>
        </a>
        <nav aria-label="Primary">
          <a href="#/" aria-current={isAdmin ? undefined : 'page'}>
            Report
          </a>
          <a href="#/admin" aria-current={isAdmin ? 'page' : undefined}>
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

      {route === 'admin' ? <AdminView /> : <FormView />}

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
