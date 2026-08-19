// ---------------------------------------------------------------------------
// Admin route: the mock login gate in front of the configuration panel.
// The (mock) session lives in sessionStorage so a reload during a demo keeps
// you signed in, but it never survives closing the browser.
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminPanel } from './AdminPanel';

const SESSION_KEY = 'vaers.admin.session';

export function AdminView() {
  const [authed, setAuthed] = useState(
    () => typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1',
  );

  const signIn = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
    setAuthed(true);
  };
  const signOut = () => {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  };

  return authed ? <AdminPanel onSignOut={signOut} /> : <AdminLogin onSignIn={signIn} />;
}
