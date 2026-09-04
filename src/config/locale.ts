// ---------------------------------------------------------------------------
// Language as an overlay (Amendment 2, Q&A 270).
//
// The base schema is English. A second language is a flat map of string keys to
// translated text, applied to the configuration before anything renders. That
// keeps the branching engine, the validation rules and the structured output
// completely untouched by language: rules key on option *values*, never on
// labels, and the submitted record is keyed to VAERS elements. So the second
// language really is authored content, and adding a third would be another map.
//
// Every translatable string has a stable key, built from the id of the thing it
// belongs to. The keys are what the configuration screen edits and what the
// integrity check counts, so they are the contract between the form, the
// authoring surface, and the completeness guarantee.
// ---------------------------------------------------------------------------
import type { FaqItem } from './faqs';
import type { FieldConfig, FormConfig, SectionConfig, SurveyConfig } from './types';

export type Locale = 'en' | 'es';

export const LOCALES: { code: Locale; label: string; endonym: string }[] = [
  { code: 'en', label: 'English', endonym: 'English' },
  { code: 'es', label: 'Spanish', endonym: 'Español' },
];

/** A flat map of string key to translated text. Missing keys fall back to English. */
export type Translations = Record<string, string>;

// --- Key construction -------------------------------------------------------
// One function per string so a key is never spelled by hand anywhere else.

export const fieldKey = (
  id: string,
  part: 'label' | 'publicLabel' | 'helpText' | 'publicHelpText' | 'tooltip' | 'publicTooltip' | 'placeholder',
) => `field.${id}.${part}`;

export const optionKey = (fieldId: string, value: string) => `field.${fieldId}.option.${value}`;

export const sectionKey = (
  id: string,
  part: 'title' | 'publicTitle' | 'description' | 'publicDescription' | 'itemLabel' | 'addLabel',
) => `section.${id}.${part}`;

export const formKey = (part: 'title' | 'intro') => `form.${part}`;

export const surveyKey = (id: string, part: 'title' | 'intro' | 'thanks') => `survey.${id}.${part}`;
export const surveyQuestionKey = (surveyId: string, questionId: string) =>
  `survey.${surveyId}.q.${questionId}`;
export const surveyOptionKey = (surveyId: string, questionId: string, value: string) =>
  `survey.${surveyId}.q.${questionId}.option.${value}`;

export const faqKey = (id: string, part: 'question' | 'answer') => `faq.${id}.${part}`;

// --- Which keys a configuration needs ---------------------------------------

/**
 * Every translatable key in a configuration, in reading order. This is the
 * denominator for coverage, and it is derived rather than listed, so a question
 * added through the configuration screen is counted the moment it exists.
 */
export function translatableKeys(config: FormConfig, faqs: FaqItem[] = []): string[] {
  const keys: string[] = [];
  // Only text that exists needs a translation. A question whose label has been
  // cleared is a separate and more serious problem, reported by the integrity
  // check as an unnamed control, and demanding a Spanish version of an empty
  // string on top of that would bury the real message.
  const has = (v?: string) => typeof v === 'string' && v.trim() !== '';
  const add = (key: string, english?: string) => {
    if (has(english)) keys.push(key);
  };

  add(formKey('title'), config.title);
  add(formKey('intro'), config.intro);

  for (const section of config.sections) {
    add(sectionKey(section.id, 'title'), section.title);
    add(sectionKey(section.id, 'publicTitle'), section.publicTitle);
    add(sectionKey(section.id, 'description'), section.description);
    add(sectionKey(section.id, 'publicDescription'), section.publicDescription);
    add(sectionKey(section.id, 'itemLabel'), section.repeat?.itemLabel);
    add(sectionKey(section.id, 'addLabel'), section.repeat?.addLabel);

    for (const field of section.fields) {
      add(fieldKey(field.id, 'label'), field.label);
      add(fieldKey(field.id, 'publicLabel'), field.publicLabel);
      add(fieldKey(field.id, 'helpText'), field.helpText);
      add(fieldKey(field.id, 'publicHelpText'), field.publicHelpText);
      add(fieldKey(field.id, 'tooltip'), field.tooltip);
      add(fieldKey(field.id, 'publicTooltip'), field.publicTooltip);
      add(fieldKey(field.id, 'placeholder'), field.placeholder);
      for (const option of field.options ?? []) {
        add(optionKey(field.id, option.value), option.label);
      }
    }
  }

  for (const survey of [config.surveys.siteNavigation, config.surveys.postSubmission]) {
    add(surveyKey(survey.id, 'title'), survey.title);
    add(surveyKey(survey.id, 'intro'), survey.intro);
    add(surveyKey(survey.id, 'thanks'), survey.thanks);
    for (const q of survey.questions) {
      add(surveyQuestionKey(survey.id, q.id), q.label);
      for (const option of q.options ?? []) {
        add(surveyOptionKey(survey.id, q.id, option.value), option.label);
      }
    }
  }

  for (const faq of faqs) {
    add(faqKey(faq.id, 'question'), faq.question);
    add(faqKey(faq.id, 'answer'), faq.answer);
  }

  return keys;
}

/**
 * Every translatable key paired with its English text. The configuration screen
 * shows the English beside the Spanish input so an author is never translating
 * a key in the abstract, and the integrity check uses the same walk, so the two
 * can never disagree about what needs translating.
 */
export function englishStrings(config: FormConfig, faqs: FaqItem[] = []): Translations {
  const out: Translations = {};
  const set = (k: string, v?: string) => {
    if (v) out[k] = v;
  };
  set(formKey('title'), config.title);
  set(formKey('intro'), config.intro);

  for (const section of config.sections) {
    set(sectionKey(section.id, 'title'), section.title);
    set(sectionKey(section.id, 'publicTitle'), section.publicTitle);
    set(sectionKey(section.id, 'description'), section.description);
    set(sectionKey(section.id, 'publicDescription'), section.publicDescription);
    set(sectionKey(section.id, 'itemLabel'), section.repeat?.itemLabel);
    set(sectionKey(section.id, 'addLabel'), section.repeat?.addLabel);
    for (const field of section.fields) {
      set(fieldKey(field.id, 'label'), field.label);
      set(fieldKey(field.id, 'publicLabel'), field.publicLabel);
      set(fieldKey(field.id, 'helpText'), field.helpText);
      set(fieldKey(field.id, 'publicHelpText'), field.publicHelpText);
      set(fieldKey(field.id, 'tooltip'), field.tooltip);
      set(fieldKey(field.id, 'publicTooltip'), field.publicTooltip);
      set(fieldKey(field.id, 'placeholder'), field.placeholder);
      for (const o of field.options ?? []) set(optionKey(field.id, o.value), o.label);
    }
  }

  for (const survey of [config.surveys.siteNavigation, config.surveys.postSubmission]) {
    set(surveyKey(survey.id, 'title'), survey.title);
    set(surveyKey(survey.id, 'intro'), survey.intro);
    set(surveyKey(survey.id, 'thanks'), survey.thanks);
    for (const q of survey.questions) {
      set(surveyQuestionKey(survey.id, q.id), q.label);
      for (const o of q.options ?? []) set(surveyOptionKey(survey.id, q.id, o.value), o.label);
    }
  }

  for (const faq of faqs) {
    set(faqKey(faq.id, 'question'), faq.question);
    set(faqKey(faq.id, 'answer'), faq.answer);
  }
  return out;
}

/**
 * The keys a configuration needs that the translation does not yet carry.
 * Blank strings count as missing, because a translation of nothing is not one.
 */
export function missingKeys(
  config: FormConfig,
  translations: Translations,
  faqs: FaqItem[] = [],
): string[] {
  return translatableKeys(config, faqs).filter((k) => !translations[k]?.trim());
}

/**
 * Keys whose translation was written against different English from the English
 * there now.
 *
 * Counting translated strings answers "is anything missing", which is not the
 * question that matters over five years. An editor who reworks an English
 * question and leaves the Spanish alone has not left a gap, they have left a
 * translation of a sentence that no longer exists, and a count cannot see it.
 * So each translation is remembered against the English it was made from:
 * shipped wording against the shipped schema, and wording typed here against
 * whatever the English said at the time.
 */
export function staleKeys(
  config: FormConfig,
  translations: Translations,
  translatedFrom: Translations,
  baseEnglish: Translations,
  faqs: FaqItem[] = [],
): string[] {
  const current = englishStrings(config, faqs);
  const out: string[] = [];
  for (const key of translatableKeys(config, faqs)) {
    if (!translations[key]?.trim()) continue; // missing, not stale
    const source = translatedFrom[key] ?? baseEnglish[key];
    if (source === undefined) continue; // nothing to compare against
    if (current[key] !== source) out.push(key);
  }
  return out;
}

// --- Applying a translation -------------------------------------------------

const pick = (t: Translations, key: string, english: string) => t[key]?.trim() || english;

function localizeField(field: FieldConfig, t: Translations): FieldConfig {
  const out: FieldConfig = { ...field, label: pick(t, fieldKey(field.id, 'label'), field.label) };
  const parts = [
    'publicLabel',
    'helpText',
    'publicHelpText',
    'tooltip',
    'publicTooltip',
    'placeholder',
  ] as const;
  for (const part of parts) {
    const english = field[part];
    if (english) out[part] = pick(t, fieldKey(field.id, part), english);
  }
  if (field.options) {
    out.options = field.options.map((o) => ({
      ...o,
      label: pick(t, optionKey(field.id, o.value), o.label),
    }));
  }
  return out;
}

function localizeSection(section: SectionConfig, t: Translations): SectionConfig {
  const out: SectionConfig = {
    ...section,
    title: pick(t, sectionKey(section.id, 'title'), section.title),
    fields: section.fields.map((f) => localizeField(f, t)),
  };
  const parts = ['publicTitle', 'description', 'publicDescription'] as const;
  for (const part of parts) {
    const english = section[part];
    if (english) out[part] = pick(t, sectionKey(section.id, part), english);
  }
  if (section.repeat) {
    out.repeat = {
      ...section.repeat,
      itemLabel: pick(t, sectionKey(section.id, 'itemLabel'), section.repeat.itemLabel),
      addLabel: pick(t, sectionKey(section.id, 'addLabel'), section.repeat.addLabel),
    };
  }
  return out;
}

function localizeSurvey(survey: SurveyConfig, t: Translations): SurveyConfig {
  return {
    ...survey,
    title: pick(t, surveyKey(survey.id, 'title'), survey.title),
    intro: survey.intro ? pick(t, surveyKey(survey.id, 'intro'), survey.intro) : survey.intro,
    thanks: pick(t, surveyKey(survey.id, 'thanks'), survey.thanks),
    questions: survey.questions.map((q) => ({
      ...q,
      label: pick(t, surveyQuestionKey(survey.id, q.id), q.label),
      options: q.options?.map((o) => ({
        ...o,
        label: pick(t, surveyOptionKey(survey.id, q.id, o.value), o.label),
      })),
    })),
  };
}

/**
 * The configuration as it reads in one language. English is the base, so an
 * English request returns the configuration unchanged and a missing Spanish
 * string falls back to its English text rather than to a blank or a marker: a
 * reporter should never meet the seams of an incomplete translation. The
 * configuration screen is where gaps are made visible, and the integrity check
 * is what stops one reaching reporters in the first place.
 */
export function localizeConfig(
  config: FormConfig,
  locale: Locale,
  translations: Translations,
): FormConfig {
  if (locale === 'en') return config;
  const t = translations;
  return {
    ...config,
    title: pick(t, formKey('title'), config.title),
    intro: config.intro ? pick(t, formKey('intro'), config.intro) : config.intro,
    sections: config.sections.map((s) => localizeSection(s, t)),
    surveys: {
      siteNavigation: localizeSurvey(config.surveys.siteNavigation, t),
      postSubmission: localizeSurvey(config.surveys.postSubmission, t),
    },
  };
}

/** FAQ content in one language, same fallback rule. */
export function localizeFaqs(faqs: FaqItem[], locale: Locale, t: Translations): FaqItem[] {
  if (locale === 'en') return faqs;
  return faqs.map((f) => ({
    ...f,
    question: pick(t, faqKey(f.id, 'question'), f.question),
    answer: pick(t, faqKey(f.id, 'answer'), f.answer),
  }));
}
