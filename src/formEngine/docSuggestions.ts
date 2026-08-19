// ---------------------------------------------------------------------------
// Document suggestion engine (PWS Task 2.3).
//
// Scans the current answers and suggests supporting documents the reporter
// could attach. Rules are declarative and reuse the same Condition predicates
// as the branching engine, so the admin/low-code surface can eventually edit
// them the same way it edits labels. Pure functions, no React, so the rules are
// unit-testable on their own.
// ---------------------------------------------------------------------------
import type { Condition, FormValues } from '../config/types';
import { evalConditions } from './visibility';

export interface DocSuggestionRule {
  id: string;
  /** Suggested when ALL of these predicates hold. */
  when: Condition[];
  /** The document to suggest, in plain language. */
  document: string;
  /** Why it is being suggested, shown to the reporter. */
  why: string;
}

export const docSuggestionRules: DocSuggestionRule[] = [
  {
    id: 'discharge-summary',
    when: [{ field: 'aeSeriousness', includes: 'hospitalized' }],
    document: 'Hospital discharge summary',
    why: 'You indicated the patient was hospitalized.',
  },
  {
    id: 'prolonged-hospitalization',
    when: [{ field: 'aeSeriousness', includes: 'prolonged_hospitalization' }],
    document: 'Hospital records covering the extended stay',
    why: 'You indicated a prolonged hospitalization.',
  },
  {
    id: 'visit-notes',
    when: [{ field: 'aeSeriousness', includes: 'er_or_doctor_visit' }],
    document: 'Emergency room or office visit notes',
    why: 'You indicated an emergency room or doctor visit.',
  },
  {
    id: 'death-records',
    when: [{ field: 'aeSeriousness', includes: 'died' }],
    document: 'Death certificate or autopsy report, if available',
    why: 'You indicated the patient died.',
  },
  {
    id: 'lab-reports',
    when: [{ field: 'labData', isFilled: true }],
    document: 'Laboratory and diagnostic test reports',
    why: 'You described laboratory or diagnostic results.',
  },
  {
    id: 'admin-record',
    when: [{ field: 'isAdminError', equals: 'yes' }],
    document: 'Vaccine administration record',
    why: 'You are reporting a vaccine administration error.',
  },
];

export interface DocSuggestion {
  id: string;
  document: string;
  why: string;
}

/** The documents to suggest for the current answers, in rule order. */
export function getDocSuggestions(
  values: FormValues,
  rules: DocSuggestionRule[] = docSuggestionRules,
): DocSuggestion[] {
  return rules
    .filter((rule) => evalConditions(rule.when, values))
    .map(({ id, document, why }) => ({ id, document, why }));
}
