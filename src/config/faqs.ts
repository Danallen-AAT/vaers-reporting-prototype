// ---------------------------------------------------------------------------
// Default FAQ content. Editable through the admin surface (Task 1.8) and shown
// in the reactive FAQ panel on the form (Task 1.3). Content is general and
// safe; verify against official VAERS guidance before any real deployment.
// ---------------------------------------------------------------------------

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export const defaultFaqs: FaqItem[] = [
  {
    id: 'faq-what-is-vaers',
    question: 'What is VAERS?',
    answer:
      'VAERS is the Vaccine Adverse Event Reporting System, a national early-warning system co-managed by CDC and FDA to detect possible safety problems with U.S.-licensed vaccines.',
  },
  {
    id: 'faq-who-can-report',
    question: 'Who can file a report?',
    answer:
      'Anyone can report: patients, parents, and caregivers, as well as healthcare providers. Providers are required to report certain adverse events after vaccination.',
  },
  {
    id: 'faq-causation',
    question: 'Do I need to be sure the vaccine caused the problem?',
    answer:
      'No. Report any health problem that happened after vaccination, even if you are not sure the vaccine caused it. A report does not mean the vaccine caused the event.',
  },
  {
    id: 'faq-privacy',
    question: 'Is my information stored by this prototype?',
    answer:
      'No. This is a demonstration only. Nothing you enter is saved, transmitted, or shared. Do not enter real personal or health information.',
  },
];
