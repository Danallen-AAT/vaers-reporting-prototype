// ---------------------------------------------------------------------------
// The language overlay (PWS 1.13, PRS#19).
//
// PRS#19 asks for 100% correct field presentation and suppression for both
// submitter types in both languages. The claim these tests defend is stronger
// than translating and then checking the result: because language is applied as
// an overlay on top of the schema, and branching rules key on option values
// rather than on labels, the Spanish form is the same instrument as the English
// one by construction. So the tests assert exactly that, across the whole
// generated matrix, rather than sampling a few screens.
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { vaersForm } from './vaersForm';
import { defaultFaqs } from './faqs';
import { es } from './es';
import {
  englishStrings,
  localizeConfig,
  localizeFaqs,
  missingKeys,
  translatableKeys,
} from './locale';
import { UI, uiText } from './ui';
import { getVisibleForm, visibleFieldIds } from '../formEngine/visibility';
import { buildStructuredOutput } from '../formEngine/output';
import { checkConfiguration } from '../formEngine/configCheck';
import type { FormValues } from './types';

const spanish = localizeConfig(vaersForm, 'es', es);

/** Every combination of the answers that drive branching, on both paths. */
function matrix(): FormValues[] {
  const out: FormValues[] = [];
  for (const reporterType of ['public', 'provider']) {
    for (const isAdminError of [undefined, 'yes', 'no']) {
      for (const errorHadAE of [undefined, 'yes', 'no']) {
        for (const patientPregnant of [undefined, 'yes', 'no', 'unknown']) {
          for (const aeSeriousness of [undefined, ['died'], ['hospitalized'], ['none']]) {
            out.push({
              reporterType,
              isAdminError,
              errorHadAE,
              patientPregnant,
              aeSeriousness,
            } as FormValues);
          }
        }
      }
    }
  }
  return out;
}

describe('Spanish content', () => {
  it('covers every translatable string in the shipped configuration', () => {
    const missing = missingKeys(vaersForm, es, defaultFaqs);
    expect(missing).toEqual([]);
  });

  it('carries no key the configuration does not ask for', () => {
    const wanted = new Set(translatableKeys(vaersForm, defaultFaqs));
    const orphans = Object.keys(es).filter((k) => !wanted.has(k));
    expect(orphans).toEqual([]);
  });

  it('is actually translated, not English copied across', () => {
    // Short strings are legitimately identical in both languages: proper nouns,
    // most state names, "Oral", "COVID-19". A whole sentence that came back
    // unchanged is a string somebody forgot, so that is what this looks at.
    const english = englishStrings(vaersForm, defaultFaqs);
    const untranslated = Object.entries(english)
      .filter(([, text]) => text.length > 20 && text.includes(' '))
      .filter(([key, text]) => es[key] === text)
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });

  it('covers every interface string in both languages', () => {
    // The interface table is typed per locale, so this cannot fail without the
    // build failing first. It is asserted anyway because a blank string would
    // satisfy the type and not the requirement.
    const blank = Object.entries(UI)
      .flatMap(([key, entry]) => Object.entries(entry).map(([code, text]) => ({ key, code, text })))
      .filter(({ text }) => text.trim() === '');
    expect(blank).toEqual([]);
  });

  it('keeps every placeholder a sentence needs when it is translated', () => {
    // A dropped {n} loses the count entirely, and nothing on screen looks wrong.
    for (const [key, entry] of Object.entries(UI)) {
      const wanted = (entry.en.match(/\{\w+\}/g) ?? []).sort();
      const got = (entry.es.match(/\{\w+\}/g) ?? []).sort();
      expect({ key, got }).toEqual({ key, got: wanted });
    }
  });

  it('fills placeholders by name', () => {
    expect(uiText('errors.many', 'es', { n: 3 })).toBe('Hay 3 problemas que corregir:');
    expect(uiText('errors.many', 'en', { n: 3 })).toBe('There are 3 problems to fix:');
  });
});

describe('language does not change the instrument', () => {
  it('returns the configuration untouched for the base language', () => {
    expect(localizeConfig(vaersForm, 'en', es)).toBe(vaersForm);
    expect(localizeFaqs(defaultFaqs, 'en', es)).toBe(defaultFaqs);
  });

  it('shows and suppresses exactly the same questions in both languages', () => {
    for (const values of matrix()) {
      expect({ values, ids: [...visibleFieldIds(spanish, values)].sort() }).toEqual({
        values,
        ids: [...visibleFieldIds(vaersForm, values)].sort(),
      });
    }
  });

  it('shows and suppresses exactly the same sections in both languages', () => {
    for (const values of matrix()) {
      const ids = (c: typeof vaersForm) => getVisibleForm(c, values).map((r) => r.section.id);
      expect({ values, ids: ids(spanish) }).toEqual({ values, ids: ids(vaersForm) });
    }
  });

  it('produces a byte-identical submitted record in both languages', () => {
    // The record is keyed to VAERS elements and carries answer values, so a
    // report filed in Spanish must be indistinguishable from the same report
    // filed in English once it reaches CDC.
    const answers: FormValues = {
      reporterType: 'provider',
      reporterName: 'A. Nurse',
      patientAgeAtVax: '42',
      patientSex: 'F',
      vaxType: 'covid19',
      vaxDate: '2026-01-05',
      aeOnsetDate: '2026-01-06',
      aeDescription: 'Fever and arm pain.',
      aeSeriousness: ['er_or_doctor_visit'],
    };
    expect(JSON.stringify(buildStructuredOutput(spanish, answers))).toBe(
      JSON.stringify(buildStructuredOutput(vaersForm, answers)),
    );
  });

  it('passes the same integrity check in both languages', () => {
    const en = checkConfiguration(vaersForm, vaersForm);
    const sp = checkConfiguration(spanish, vaersForm);
    expect(sp.ok).toBe(true);
    expect(sp.combinations).toBe(en.combinations);
    expect(sp.fieldsChecked).toBe(en.fieldsChecked);
  });
});

describe('the publish gate', () => {
  it('passes the shipped configuration in Spanish', () => {
    const result = checkConfiguration(vaersForm, vaersForm, {
      locale: 'es',
      languageName: 'Spanish',
      translations: es,
      faqs: defaultFaqs,
    });
    expect(result.missingTranslations).toEqual([]);
    expect(result.translationOk).toBe(true);
    expect(result.ok).toBe(true);
  });

  it('names the question when one is added without its Spanish', () => {
    const withNewQuestion = {
      ...vaersForm,
      sections: vaersForm.sections.map((s) =>
        s.id === 'reporter'
          ? { ...s, fields: [...s.fields, { id: 'q1', label: 'Clinic region', type: 'text' as const, path: 'both' as const }] }
          : s,
      ),
    };
    const result = checkConfiguration(withNewQuestion, vaersForm, {
      locale: 'es',
      languageName: 'Spanish',
      translations: es,
      faqs: defaultFaqs,
    });
    // The configuration itself is sound. Only the translation is outstanding,
    // and the two are reported apart so the integrity check keeps its meaning.
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.translationOk).toBe(false);
    expect(result.missingTranslations).toEqual(['field.q1.label']);
    const issue = result.translationIssues.find((i) => i.code === 'missing-translation');
    expect(issue?.target).toBe('q1');
    expect(issue?.message).toContain('Clinic region');
    expect(issue?.message).toContain('Spanish');
  });

  it('does not demand a translation of text that does not exist', () => {
    // An empty label is a separate and more serious problem, already reported.
    // Asking for its Spanish as well would bury the message that matters.
    const withBlank = {
      ...vaersForm,
      sections: vaersForm.sections.map((s) =>
        s.id === 'reporter'
          ? { ...s, fields: [...s.fields, { id: 'q2', label: '   ', type: 'text' as const, path: 'both' as const }] }
          : s,
      ),
    };
    const result = checkConfiguration(withBlank, vaersForm, {
      locale: 'es',
      languageName: 'Spanish',
      translations: es,
      faqs: defaultFaqs,
    });
    expect(result.missingTranslations).toEqual([]);
    expect(result.translationOk).toBe(true);
    expect(result.issues.some((i) => i.code === 'empty-label')).toBe(true);
  });

  it('treats whitespace as no translation at all', () => {
    const gappy = { ...es, 'field.vaxLot.label': '   ' };
    expect(missingKeys(vaersForm, gappy, defaultFaqs)).toEqual(['field.vaxLot.label']);
  });
});

describe('falling back', () => {
  it('shows English rather than a blank when a string has no translation', () => {
    // Reporters never meet the seams of an incomplete translation. The gap is
    // made loud in the configuration screen and stopped at publish, which is
    // where it can actually be fixed.
    const gappy = { ...es };
    delete gappy['field.vaxLot.label'];
    const partial = localizeConfig(vaersForm, 'es', gappy);
    const field = partial.sections
      .flatMap((s) => s.fields)
      .find((f) => f.id === 'vaxLot');
    expect(field?.label).toBe('Lot number');
    expect(field?.publicLabel).toBe('Número de lote (en la tarjeta o el registro, si lo sabe)');
  });
});
