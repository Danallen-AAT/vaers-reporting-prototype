// ---------------------------------------------------------------------------
// Language switch (PWS 1.13).
//
// Three decisions worth stating, because each one is a way this control is
// commonly shipped broken.
//
// Each choice is written in its own language, and never translated. A reporter
// who cannot read the page needs to recognise the way out of it, and "Spanish"
// is no help to someone who reads only Spanish. `lang` on each button tells a
// screen reader to pronounce "Español" in Spanish even on an English page.
//
// It is a group of buttons rather than a select, so the current language is
// visible without opening anything, and `aria-pressed` says which one is on.
//
// It sits in the site header, present on every page including the form, so the
// language can be changed after a reporter has started. Answers are held by
// value rather than by label, so switching language mid-report keeps every
// answer already given.
// ---------------------------------------------------------------------------
import { LOCALES } from '../config/locale';
import { useLocale } from '../state/LocaleStore';

export function LanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
      {LOCALES.map((l) => (
        <button
          key={l.code}
          type="button"
          className="seg"
          lang={l.code}
          aria-pressed={locale === l.code}
          onClick={() => setLocale(l.code)}
        >
          {l.endonym}
        </button>
      ))}
    </div>
  );
}
