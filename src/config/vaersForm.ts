// ---------------------------------------------------------------------------
// VAERS form - the config that drives the whole app.
//
// Transcribed from VAERS-FORM-MODEL.md (first-pass model of the VAERS 2.0 data
// elements). Every branch the RFQ scores (PRS#1) lives here as declarative
// `visibleWhen` / `suppressWhen` predicates - the renderer and the branching
// test suite both read from this single source of truth.
//
// The three branching decisions modeled below:
//   1. reporterType         -> public (plain language) vs provider (clinical)
//   2. isAdminError + errorHadAE -> provider "admin error, no AE" SUPPRESSES the
//                                   entire Adverse Event section (PWS 1.6.2)
//   3. aeSeriousness         -> reveals per-criterion follow-ups (death, hosp.)
// ---------------------------------------------------------------------------
import type { FieldOption, FormConfig } from './types';

const YES_NO: FieldOption[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

const YES_NO_UNKNOWN: FieldOption[] = [
  ...YES_NO,
  { value: 'unknown', label: 'Unknown' },
];

const US_STATES: FieldOption[] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'],
  ['NV', 'Nevada'], ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'],
  ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'],
  ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'], ['TX', 'Texas'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'], ['WA', 'Washington'],
  ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
].map(([value, label]) => ({ value, label }));

// AE section is suppressed when a provider reports an administration error that
// caused no adverse event. Reused for the recovery field in the patient block.
const AE_SUPPRESSED = [
  { field: 'isAdminError', equals: 'yes' },
  { field: 'errorHadAE', equals: 'no' },
];

const IF_ADMIN_ERROR = [{ field: 'isAdminError', equals: 'yes' }];

/** Pregnancy follow-ups, revealed in place rather than cross-referenced. */
const IF_PREGNANT = [{ field: 'patientPregnant', equals: 'yes' }];

export const vaersForm: FormConfig = {
  version: '2.0-proto',
  title: 'Report a problem after a vaccine (VAERS)',
  intro:
    'Use this form to report an adverse event or problem that happened after a vaccination. The questions and wording adapt to who you are and what you are reporting.',
  sections: [
    // 1. Reporter Information -------------------------------------------------
    {
      id: 'reporter',
      title: 'Reporter information',
      publicTitle: 'About you',
      path: 'both',
      fields: [
        {
          id: 'reporterType',
          label: 'Reporter type',
          publicLabel: 'Who is filling this out?',
          type: 'radio',
          path: 'both',
          required: true,
          options: [
            { value: 'public', label: 'Patient, parent, or caregiver' },
            { value: 'provider', label: 'Healthcare provider' },
          ],
          helpText:
            'Your answer tailors the questions and wording to your role. Choose one to begin.',
        },
        {
          id: 'reporterName',
          label: 'Reporter name',
          publicLabel: 'Your name',
          type: 'text',
          path: 'both',
          required: true,
        },
        {
          id: 'reporterEmail',
          label: 'Reporter email',
          publicLabel: 'Your email',
          type: 'email',
          path: 'both',
        },
        {
          id: 'reporterPhone',
          label: 'Reporter phone',
          publicLabel: 'Your phone',
          type: 'tel',
          path: 'both',
        },
        {
          id: 'facilityName',
          label: 'Facility / provider name',
          publicLabel: 'Clinic or pharmacy name (if known)',
          type: 'text',
          path: 'both',
        },
        {
          id: 'relationToPatient',
          label: 'Relationship to patient',
          publicLabel: 'Your relationship to the patient',
          type: 'select',
          path: 'public',
          required: true,
          options: [
            { value: 'self', label: 'I am the patient' },
            { value: 'parent', label: 'Parent' },
            { value: 'guardian', label: 'Guardian' },
            { value: 'caregiver', label: 'Caregiver' },
          ],
        },
      ],
    },

    // 2. Patient Information ---------------------------------------------------
    {
      id: 'patient',
      title: 'Patient information',
      publicTitle: 'About the patient',
      path: 'both',
      fields: [
        {
          id: 'patientAgeAtVax',
          label: 'Age at vaccination',
          publicLabel: 'How old was the patient at the time of the shot?',
          type: 'number',
          path: 'both',
          required: true,
          helpText: 'Age in years at the time of vaccination.',
        },
        {
          id: 'patientDob',
          label: 'Date of birth',
          publicLabel: "Patient's date of birth",
          type: 'date',
          path: 'both',
          tooltip:
            'Used to derive age at vaccination and to identify duplicate reports. If only the year is known, use January 1 of that year and note the uncertainty in the description.',
          publicTooltip:
            'This helps match the report to the right person and works out how old they were when they got the shot. If you are reporting for yourself, this is your own date of birth.',
        },
        {
          id: 'patientSex',
          label: 'Sex',
          publicLabel: "Patient's sex",
          type: 'select',
          path: 'both',
          required: true,
          options: [
            { value: 'F', label: 'Female' },
            { value: 'M', label: 'Male' },
            { value: 'U', label: 'Unknown' },
          ],
        },
        {
          id: 'patientState',
          label: 'State',
          publicLabel: 'State where the patient lives',
          type: 'select',
          path: 'both',
          options: US_STATES,
        },
        // Item 8 on the current VAERS form, and the clearest demonstration of
        // what branching replaces. The live form asks this, then instructs the
        // reporter to "describe the event, any pregnancy complications, and
        // estimated due date if known in item 18", making a person carry an
        // answer to a numbered box further down the page. Here, answering yes
        // reveals the fields instead.
        {
          id: 'patientPregnant',
          label: 'Pregnant at time of vaccination?',
          publicLabel: 'Was the patient pregnant when they got the shot?',
          type: 'radio',
          path: 'both',
          options: YES_NO_UNKNOWN,
          tooltip:
            'Recorded for every report regardless of the reported event, because pregnancy exposure is tracked separately. Answering yes opens the related questions rather than directing you elsewhere on the form.',
          publicTooltip:
            'We ask this on every report. If the answer is yes, a couple of extra questions will appear right here.',
        },
        {
          id: 'pregnancyDueDate',
          label: 'Estimated due date',
          publicLabel: 'When was the baby due?',
          type: 'date',
          path: 'both',
          visibleWhen: IF_PREGNANT,
          helpText: 'If known. An approximate date is acceptable.',
        },
        {
          id: 'pregnancyComplications',
          label: 'Pregnancy complications',
          publicLabel: 'Any problems with the pregnancy?',
          type: 'textarea',
          path: 'both',
          visibleWhen: IF_PREGNANT,
          helpText:
            'Complications observed during or following the pregnancy, and the outcome if known.',
          publicHelpText:
            'Anything that went wrong during or after the pregnancy, and how it turned out if you know.',
        },
        {
          id: 'patientRecovered',
          label: 'Has the patient recovered?',
          publicLabel: 'Has the patient recovered?',
          type: 'radio',
          path: 'both',
          required: 'conditional',
          options: YES_NO_UNKNOWN,
          // Not meaningful when there is no adverse event to recover from.
          suppressWhen: AE_SUPPRESSED,
        },
      ],
    },

    // 3. Vaccine(s) Administered ---------------------------------------------
    {
      id: 'vaccines',
      title: 'Vaccine(s) administered',
      publicTitle: 'The vaccine',
      description:
        'Details of the vaccine that was given. Add another if more than one was given at the same visit.',
      publicDescription:
        'Details of the shot that was given. Add another if more than one was given at the same visit.',
      path: 'both',
      // Several vaccines are commonly administered at one visit, so the whole
      // group repeats rather than the reporter filing separate reports.
      repeat: { min: 1, max: 6, itemLabel: 'Vaccine', addLabel: 'Add another vaccine' },
      fields: [
        {
          id: 'vaxType',
          label: 'Vaccine type',
          publicLabel: 'Which vaccine?',
          type: 'select',
          path: 'both',
          required: true,
          options: [
            { value: 'covid19', label: 'COVID-19' },
            { value: 'influenza', label: 'Influenza (flu)' },
            { value: 'mmr', label: 'MMR (measles, mumps, rubella)' },
            { value: 'tdap', label: 'Tdap / Td' },
            { value: 'hpv', label: 'HPV' },
            { value: 'shingles', label: 'Shingles (zoster)' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'vaxManufacturer',
          label: 'Manufacturer',
          publicLabel: 'Vaccine maker (if known)',
          type: 'text',
          path: 'both',
        },
        {
          id: 'vaxLot',
          label: 'Lot number',
          publicLabel: 'Lot number (on the card or record, if known)',
          type: 'text',
          path: 'both',
          tooltip:
            'Recorded on the vaccine vial and carried through to the administration record. Leave blank if it is not available; a report without a lot number is still accepted.',
          publicTooltip:
            'Look on your vaccination card or the printout you were given. It is usually a short mix of letters and numbers. If you cannot find it, leave it blank and carry on.',
        },
        {
          id: 'vaxDoseNum',
          label: 'Dose number in series',
          publicLabel: 'Which dose was it?',
          type: 'select',
          path: 'both',
          options: [
            { value: '1', label: '1st dose' },
            { value: '2', label: '2nd dose' },
            { value: '3', label: '3rd dose' },
            { value: 'booster', label: 'Booster' },
            { value: 'unknown', label: 'Unknown' },
          ],
        },
        {
          id: 'vaxRoute',
          label: 'Route of administration',
          publicLabel: 'How was the shot given?',
          type: 'select',
          path: 'provider',
          options: [
            { value: 'IM', label: 'Intramuscular (IM)' },
            { value: 'SC', label: 'Subcutaneous (SC)' },
            { value: 'ID', label: 'Intradermal (ID)' },
            { value: 'oral', label: 'Oral' },
            { value: 'nasal', label: 'Nasal' },
            { value: 'unknown', label: 'Unknown' },
          ],
        },
        {
          id: 'vaxSite',
          label: 'Anatomical site',
          publicLabel: 'Where on the body was the shot given?',
          type: 'select',
          path: 'provider',
          options: [
            { value: 'left_arm', label: 'Left arm' },
            { value: 'right_arm', label: 'Right arm' },
            { value: 'left_thigh', label: 'Left thigh' },
            { value: 'right_thigh', label: 'Right thigh' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'vaxDate',
          label: 'Vaccination date',
          publicLabel: 'Date of the shot',
          type: 'date',
          path: 'both',
          required: true,
          tooltip:
            'The date the dose was administered, not the date the reaction began. Where the exact date is unavailable, give the closest known date rather than omitting the report.',
          publicTooltip:
            'The day you got the shot, not the day you started feeling unwell. If you are not sure of the exact day, your best estimate is fine.',
        },
      ],
    },

    // 4. Vaccine Administration Error (provider) ------------------------------
    {
      id: 'adminError',
      title: 'Vaccine administration error',
      description: 'For reporting an error in how a vaccine was prepared or given.',
      path: 'provider',
      fields: [
        {
          id: 'isAdminError',
          label: 'Are you reporting a vaccine administration error?',
          type: 'radio',
          path: 'provider',
          required: true,
          options: YES_NO,
          helpText:
            'For example: wrong vaccine, wrong dose, expired product, or wrong site/route.',
        },
        {
          id: 'errorType',
          label: 'Type of error',
          type: 'multiselect',
          path: 'provider',
          required: true,
          visibleWhen: IF_ADMIN_ERROR,
          tooltip:
            'Administration errors are reportable whether or not the patient came to any harm. Select every category that applies; where an error has more than one dimension, for example a wrong dose given by a wrong route, record both.',
          options: [
            { value: 'wrong_vaccine', label: 'Wrong vaccine' },
            { value: 'wrong_dose', label: 'Wrong dose / amount' },
            { value: 'expired_product', label: 'Expired product' },
            { value: 'wrong_site', label: 'Wrong site' },
            { value: 'wrong_route', label: 'Wrong route' },
            { value: 'wrong_age', label: 'Wrong age' },
            { value: 'storage_handling', label: 'Storage / handling problem' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          id: 'errorHadAE',
          label: 'Did the patient experience any adverse event or health problem?',
          type: 'radio',
          path: 'provider',
          required: true,
          visibleWhen: IF_ADMIN_ERROR,
          options: YES_NO,
          helpText:
            'If no, the adverse-event questions are not needed and will be hidden.',
        },
        {
          id: 'errorDescription',
          label: 'Describe the error',
          type: 'textarea',
          path: 'provider',
          required: true,
          visibleWhen: IF_ADMIN_ERROR,
        },
      ],
    },

    // 5. Adverse Event - SUPPRESSED when (isAdminError=yes AND errorHadAE=no) --
    {
      id: 'adverseEvent',
      title: 'Adverse event',
      publicTitle: 'What happened',
      description: 'Describe the adverse event or reaction after the vaccine.',
      publicDescription: 'Tell us about the health problem or reaction after the vaccine.',
      path: 'both',
      suppressWhen: AE_SUPPRESSED,
      fields: [
        {
          id: 'aeOnsetDate',
          label: 'Adverse event onset date',
          publicLabel: 'When did the problem start?',
          type: 'date',
          path: 'both',
          required: true,
        },
        {
          id: 'aeOnsetTime',
          label: 'Time to onset',
          publicLabel: 'About how long after the shot did it start?',
          type: 'text',
          path: 'both',
          placeholder: 'e.g. 30 minutes, 2 days',
        },
        {
          id: 'aeDescription',
          label: 'Adverse event description',
          publicLabel: 'Describe what happened',
          type: 'textarea',
          path: 'both',
          required: true,
        },
        {
          id: 'aeSeriousness',
          label: 'Seriousness criteria',
          publicLabel: 'How serious was it? (check all that apply)',
          type: 'multiselect',
          path: 'both',
          required: true,
          tooltip:
            'These are the regulatory seriousness criteria. Any one of them marks the report as serious and changes how it is prioritised for review, so select every criterion that applies rather than only the most severe.',
          publicTooltip:
            'Tick everything that happened, even if you are not sure it was caused by the vaccine. Choosing more than one is normal, and it helps reviewers understand how severe things got.',
          options: [
            { value: 'died', label: 'Patient died' },
            { value: 'life_threatening', label: 'Life-threatening' },
            { value: 'hospitalized', label: 'Hospitalized' },
            { value: 'prolonged_hospitalization', label: 'Prolonged hospitalization' },
            { value: 'permanent_disability', label: 'Permanent disability' },
            { value: 'er_or_doctor_visit', label: 'Emergency room or doctor visit' },
            { value: 'birth_defect', label: 'Birth defect' },
            { value: 'none', label: 'None of the above' },
          ],
        },
        {
          id: 'aeDeathDate',
          label: 'Date of death',
          type: 'date',
          path: 'both',
          required: 'conditional',
          visibleWhen: [{ field: 'aeSeriousness', includes: 'died' }],
        },
        {
          id: 'aeHospDays',
          label: 'Number of days hospitalized',
          type: 'number',
          path: 'both',
          required: 'conditional',
          visibleWhen: [{ field: 'aeSeriousness', includes: 'hospitalized' }],
        },
        {
          id: 'aeTreatment',
          label: 'Treatment given',
          publicLabel: 'What treatment was given, if any?',
          type: 'textarea',
          path: 'both',
        },
        {
          id: 'aeOutcome',
          label: 'Current status',
          publicLabel: 'How is the patient now?',
          type: 'select',
          path: 'both',
          options: [
            { value: 'recovered', label: 'Recovered' },
            { value: 'recovering', label: 'Recovering' },
            { value: 'not_recovered', label: 'Not recovered' },
            { value: 'unknown', label: 'Unknown' },
          ],
        },
      ],
    },

    // 6. Clinical Context -----------------------------------------------------
    {
      id: 'clinical',
      title: 'Clinical context',
      publicTitle: 'Other health information',
      path: 'both',
      fields: [
        {
          id: 'medHistory',
          label: 'Relevant medical history / conditions',
          publicLabel: 'Any health conditions we should know about?',
          type: 'textarea',
          path: 'both',
        },
        {
          id: 'allergies',
          label: 'Known allergies',
          publicLabel: 'Known allergies',
          type: 'textarea',
          path: 'both',
        },
        {
          id: 'concomitantMeds',
          label: 'Concomitant medications',
          publicLabel: 'Other medicines taken around the same time',
          type: 'textarea',
          path: 'both',
        },
        {
          id: 'priorVaxReactions',
          label: 'Prior adverse events after vaccination',
          publicLabel: 'Any past reactions to vaccines?',
          type: 'textarea',
          path: 'both',
        },
        {
          id: 'labData',
          label: 'Relevant lab / diagnostic test results',
          type: 'textarea',
          path: 'provider',
        },
        {
          id: 'illnessAtVax',
          label: 'Illness at time of vaccination',
          publicLabel: 'Was the patient sick when they got the shot?',
          type: 'textarea',
          path: 'both',
        },
      ],
    },

    // 7. Attachments (stub) ---------------------------------------------------
    {
      id: 'attachments',
      title: 'Supporting information',
      publicTitle: 'Anything else',
      path: 'both',
      fields: [
        {
          id: 'medicalRecordUpload',
          label: 'Upload supporting medical records',
          publicLabel: 'Upload supporting documents (optional)',
          type: 'file',
          path: 'both',
          helpText:
            'Demonstration only. Files are not uploaded, stored, or transmitted. Do not attach real records.',
          tooltip:
            'Discharge summaries, clinic notes, laboratory results and imaging reports are the most useful supporting documents. Attaching them at submission avoids a follow-up request later.',
          publicTooltip:
            'Anything a doctor or hospital gave you about what happened is helpful, for example a discharge paper or test results. You do not have to attach anything to file a report.',
        },
        {
          id: 'freeText',
          label: 'Anything else to add',
          publicLabel: "Anything else you'd like to add",
          type: 'textarea',
          path: 'both',
        },
      ],
    },
  ],

  // Two satisfaction instruments, defined as data so the admin surface can
  // edit them the same way it edits the form (PWS 1.5 and 1.7).
  surveys: {
    siteNavigation: {
      id: 'site-navigation',
      title: 'How is this site working for you?',
      intro: 'Two quick questions about finding your way around. Nothing is stored.',
      thanks: 'Thank you. Feedback like this is what tells us which pages to fix first.',
      questions: [
        {
          id: 'foundWhatINeeded',
          label: 'Were you able to find what you were looking for?',
          type: 'radio',
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'partly', label: 'Partly' },
            { value: 'no', label: 'No' },
          ],
        },
        {
          id: 'navEase',
          label: 'How easy was it to get around the site?',
          type: 'radio',
          options: [
            { value: '5', label: 'Very easy' },
            { value: '4', label: 'Easy' },
            { value: '3', label: 'Neither easy nor difficult' },
            { value: '2', label: 'Difficult' },
            { value: '1', label: 'Very difficult' },
          ],
        },
        { id: 'navComment', label: 'What were you trying to do?', type: 'textarea' },
      ],
    },
    postSubmission: {
      id: 'post-submission',
      title: 'How did that go?',
      thanks:
        'Thank you. Your feedback helps us improve this form. Nothing you entered has been stored.',
      questions: [
        {
          id: 'ease',
          label: 'How easy was it to complete this report?',
          type: 'radio',
          options: [
            { value: '5', label: 'Very easy' },
            { value: '4', label: 'Easy' },
            { value: '3', label: 'Neither easy nor difficult' },
            { value: '2', label: 'Difficult' },
            { value: '1', label: 'Very difficult' },
          ],
        },
        {
          id: 'clarity',
          label: 'Were the questions clear?',
          type: 'radio',
          options: [
            { value: 'yes', label: 'Yes, they were clear' },
            { value: 'mostly', label: 'Mostly clear' },
            { value: 'no', label: 'No, some were confusing' },
          ],
        },
        { id: 'comment', label: 'Anything we could improve?', type: 'textarea' },
      ],
    },
  },
};
