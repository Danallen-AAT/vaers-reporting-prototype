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
      description: 'Details of the vaccine that was given.',
      path: 'both',
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
};
