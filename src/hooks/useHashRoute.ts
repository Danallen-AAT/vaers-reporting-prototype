import { useEffect, useState } from 'react';

/**
 * Minimal hash router (no dependency). Returns the current route slug:
 *   ''       -> the reporting form
 *   'admin'  -> the admin configuration surface
 * Navigation is plain `<a href="#/admin">` - linkable and reload-safe, which
 * matters for the deployed demo link.
 */
export function useHashRoute(): string {
  const read = () =>
    (typeof window !== 'undefined' ? window.location.hash : '').replace(/^#\/?/, '');
  const [route, setRoute] = useState(read);

  useEffect(() => {
    const onChange = () => setRoute(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
