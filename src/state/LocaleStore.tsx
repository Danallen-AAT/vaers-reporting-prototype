// ---------------------------------------------------------------------------
// The reporter's language (PWS 1.13, PRS#19).
//
// Language is a reporter preference, not configuration, so it lives apart from
// the config store: a member of the public choosing Spanish must not change
// what CDC has published, and a program officer previewing Spanish must not
// change what the reporter in the next room is reading.
//
// Two things happen on every change, and the second matters more than it looks.
// The choice is remembered in this browser, and `lang` on the document element
// is updated. `lang` is what tells a screen reader which voice to use: without
// it, Spanish is read out with English pronunciation rules and is close to
// unintelligible. It is WCAG 3.1.1 Language of Page, a Level A criterion, and
// it is the part of bilingual support that is easiest to ship broken because
// nothing on screen looks wrong.
// ---------------------------------------------------------------------------
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { LOCALES, type Locale } from '../config/locale';
import { uiText, type UiKey } from '../config/ui';

const LOCALE_KEY = 'vaers.locale.v1';

const isLocale = (v: unknown): v is Locale => LOCALES.some((l) => l.code === v);

/**
 * The language to open in. A remembered choice always wins, because an explicit
 * decision outranks a guess. Otherwise the browser's own preference is honoured,
 * which is what a Spanish-speaking reporter has already told their device once
 * and should not have to say again. English is the fallback, never a redirect:
 * the toggle is on screen either way.
 */
function initialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    /* localStorage unavailable, fall through to the browser preference. */
  }
  const preferred = typeof navigator !== 'undefined' ? navigator.language : '';
  return preferred?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  /** One interface string in the current language. */
  t: (key: UiKey, vars?: Record<string, string | number>) => string;
}

// A default rather than a throw. A component tree without the provider is
// English, which is the base language, so nothing is hidden by it.
const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key, vars) => uiText(key, 'en', vars),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    // The tab title travels with the language for the same reason the document
    // language does: a screen reader announces it on load, and an English title
    // over a Spanish page is read with the wrong pronunciation rules.
    document.title = uiText('chrome.pageTitle', locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* localStorage unavailable or full, non-fatal for the demo. */
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key, vars) => uiText(key, locale, vars) }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Force one language on a subtree. The configuration screen previews the form
 * in a chosen language while the person editing keeps reading English chrome,
 * so the preview has to be able to disagree with the rest of the page. The
 * choice is not persisted and does not touch the document language, because
 * this is a preview of a page rather than the page.
 */
export function LocaleOverride({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale: () => {}, t: (key, vars) => uiText(key, locale, vars) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}
