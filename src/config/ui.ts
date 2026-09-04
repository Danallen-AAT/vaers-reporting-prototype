// ---------------------------------------------------------------------------
// Interface strings (PWS 1.13, PRS#19).
//
// Two kinds of text reach a reporter. The questions are configuration, edited
// by CDC through the configuration screen and translated there, and they live
// in `locale.ts`. Everything else is the application's own chrome: navigation,
// buttons, validation messages, the progress rail, the document suggestions.
// That text is not editable from the configuration screen, so it belongs to the
// build, and it lives here.
//
// The table is typed as `Record<Locale, string>` per key, so adding a locale to
// `Locale` makes every key that lacks it a compile error. Completeness for this
// half is enforced by the type checker rather than by a test, which is the
// stronger guarantee: an untranslated control cannot be built at all.
//
// Placeholders are `{name}` and are filled by `t`. They exist because Spanish
// and English put counts and names in different places, and a sentence
// assembled from fragments cannot be reordered.
// ---------------------------------------------------------------------------
import type { Locale } from './locale';

type Entry = Record<Locale, string>;

export const UI = {
  // --- Site chrome ---------------------------------------------------------
  'nav.skip': {
    en: 'Skip to main content',
    es: 'Saltar al contenido principal',
  },
  'nav.brandSuffix': {
    en: '· CDC reporting prototype',
    es: '· Prototipo de reporte CDC',
  },
  // The browser tab, which a screen reader announces on load. It is as much a
  // reporter-facing string as anything on the page, and it lived in index.html
  // where the rest of this table could not see it.
  'chrome.pageTitle': {
    en: 'VAERS Reporting (Prototype)',
    es: 'Reporte de VAERS (Prototipo)',
  },
  'nav.primary': { en: 'Primary', es: 'Principal' },
  'nav.home': { en: 'Home', es: 'Inicio' },
  'nav.report': { en: 'Report', es: 'Reportar' },
  'nav.admin': { en: 'Admin', es: 'Administración' },
  'nav.about': { en: 'How it works', es: 'Cómo funciona' },
  'lang.label': { en: 'Language', es: 'Idioma' },
  // Each choice is written in its own language, which is how a person who
  // cannot read the current one finds their way out of it.
  'lang.chooseEn': { en: 'Switch to English', es: 'Switch to English' },
  'lang.chooseEs': { en: 'Cambiar a español', es: 'Cambiar a español' },
  'footer.disclaimer': {
    en: 'Prototype for demonstration only (CDC RFQ 75D301-26-Q-00146). Do not enter real personal or health information. Nothing you enter in a report is stored or transmitted. Configuration changes and the demo sign-in name are kept in this browser only.',
    es: 'Prototipo solo para demostración (CDC RFQ 75D301-26-Q-00146). No ingrese información personal ni de salud real. Nada de lo que ingrese en un reporte se almacena ni se transmite. Los cambios de configuración y el nombre de acceso de demostración se guardan únicamente en este navegador.',
  },
  'chrome.agency': {
    en: 'Centers for Disease Control and Prevention · Prototype',
    es: 'Centros para el Control y la Prevención de Enfermedades · Prototipo',
  },
  // The configuration screen is a CDC staff tool, and the explanation page is
  // written for evaluators of this prototype. Both stay in English on purpose,
  // and say so rather than appearing to be an unfinished translation.
  'chrome.englishOnly': {
    en: 'This screen is for CDC staff and is shown in English.',
    es: 'Esta pantalla es para el personal de los CDC y se muestra en inglés.',
  },

  // --- Landing page --------------------------------------------------------
  'landing.title': {
    en: 'Report a problem after a vaccine',
    es: 'Reporte un problema después de una vacuna',
  },
  'landing.lede': {
    en: 'The Vaccine Adverse Event Reporting System is a national early-warning system co-managed by CDC and FDA. Anyone can file a report. You do not need to be certain the vaccine caused the problem.',
    es: 'El Sistema de Notificación de Eventos Adversos a Vacunas es un sistema nacional de alerta temprana administrado en conjunto por los CDC y la FDA. Cualquier persona puede presentar un reporte. No necesita estar seguro de que la vacuna causó el problema.',
  },
  'landing.start': { en: 'Start a report', es: 'Comenzar un reporte' },
  'landing.heroNote': {
    en: 'Takes most people under ten minutes.',
    es: 'A la mayoría de las personas le toma menos de diez minutos.',
  },
  'landing.whoTitle': { en: 'Who is reporting?', es: '¿Quién está reportando?' },
  'landing.whoSub': {
    en: 'The form adapts to your answer. You will be asked this on the first screen.',
    es: 'El formulario se adapta a su respuesta. Se le preguntará esto en la primera pantalla.',
  },
  'landing.publicKicker': { en: 'For the public', es: 'Para el público' },
  'landing.publicTitle': {
    en: 'Patient, parent, or caregiver',
    es: 'Paciente, padre, madre o cuidador',
  },
  'landing.publicBody': {
    en: 'Plain language throughout. We skip the clinical questions and ask only what you would reasonably know.',
    es: 'Lenguaje sencillo en todo el formulario. Omitimos las preguntas clínicas y preguntamos solo lo que usted razonablemente sabría.',
  },
  'landing.providerKicker': { en: 'For clinicians', es: 'Para personal clínico' },
  'landing.providerTitle': { en: 'Healthcare provider', es: 'Profesional de la salud' },
  'landing.providerBody': {
    en: 'Full clinical detail, plus a dedicated path for reporting a vaccine administration error.',
    es: 'Detalle clínico completo, más una ruta específica para reportar un error en la administración de una vacuna.',
  },
  'landing.cardGo': { en: 'Start', es: 'Comenzar' },
  'landing.beforeTitle': { en: 'Before you start', es: 'Antes de comenzar' },
  'landing.readyTitle': { en: 'What to have ready', es: 'Qué tener a la mano' },
  'landing.ready1': {
    en: 'The vaccination record or card, if you have it',
    es: 'El registro o la tarjeta de vacunación, si la tiene',
  },
  'landing.ready2': {
    en: 'The date the vaccine was given',
    es: 'La fecha en que se aplicó la vacuna',
  },
  'landing.ready3': {
    en: 'A description of what happened and when it started',
    es: 'Una descripción de lo que ocurrió y cuándo comenzó',
  },
  'landing.ready4': {
    en: 'Any relevant medical records you want to attach',
    es: 'Cualquier registro médico pertinente que quiera adjuntar',
  },
  'landing.happensTitle': {
    en: 'What happens to a report',
    es: 'Qué ocurre con un reporte',
  },
  'landing.happens1': {
    en: 'Reports are reviewed for possible safety signals',
    es: 'Los reportes se revisan en busca de posibles señales de seguridad',
  },
  'landing.happens2': {
    en: 'A report does not mean the vaccine caused the event',
    es: 'Un reporte no significa que la vacuna haya causado el evento',
  },
  'landing.happens3': {
    en: 'Healthcare providers are required to report certain events',
    es: 'Los profesionales de la salud están obligados a reportar ciertos eventos',
  },
  'landing.happens4': {
    en: 'De-identified data is published for public and researcher use',
    es: 'Los datos sin identificadores se publican para uso del público y de investigadores',
  },
  'landing.moreTitle': { en: 'More', es: 'Más información' },
  'landing.faqTile': {
    en: 'Frequently asked questions',
    es: 'Preguntas frecuentes',
  },
  'landing.faqTileBody': {
    en: 'Who can report, what counts, and what happens next.',
    es: 'Quién puede reportar, qué se debe reportar y qué ocurre después.',
  },
  'landing.startTileBody': {
    en: 'Go straight to the reporting form.',
    es: 'Ir directamente al formulario de reporte.',
  },
  'landing.dataTile': { en: 'Download VAERS data', es: 'Descargar datos de VAERS' },
  'landing.dataTileBody': {
    en: 'Public de-identified data sets on the VAERS site. Opens in a new tab.',
    es: 'Conjuntos de datos públicos sin identificadores en el sitio de VAERS. Se abre en una pestaña nueva.',
  },
  'landing.surveyPrompt': {
    en: 'Could you find what you were looking for?',
    es: '¿Pudo encontrar lo que buscaba?',
  },
  'landing.surveyButton': {
    en: 'Give us feedback on this site',
    es: 'Envíenos comentarios sobre este sitio',
  },

  // --- Reporting page ------------------------------------------------------
  'form.helpFaq': { en: 'Help & FAQ', es: 'Ayuda y preguntas frecuentes' },
  'path.public': { en: 'Public reporter', es: 'Informante del público' },
  'path.provider': { en: 'Healthcare provider', es: 'Profesional de la salud' },
  'path.note': {
    en: 'Wording and fields are tailored to this path.',
    es: 'La redacción y los campos están adaptados a esta ruta.',
  },
  'path.change': { en: 'Change', es: 'Cambiar' },
  'path.changeLabel': { en: 'Change reporter type', es: 'Cambiar el tipo de informante' },
  'path.startOver': { en: 'Start over', es: 'Empezar de nuevo' },
  'path.startOverPrompt': {
    en: 'Starting over clears every answer on this report.',
    es: 'Empezar de nuevo borra todas las respuestas de este reporte.',
  },
  'path.startOverConfirm': { en: 'Clear all answers', es: 'Borrar todas las respuestas' },
  'path.startOverCancel': { en: 'Keep my answers', es: 'Conservar mis respuestas' },
  'repeat.remove': { en: 'Remove', es: 'Quitar' },
  'errors.one': {
    en: 'There is 1 problem to fix:',
    es: 'Hay 1 problema que corregir:',
  },
  'errors.many': {
    en: 'There are {n} problems to fix:',
    es: 'Hay {n} problemas que corregir:',
  },
  'actions.review': { en: 'Review submission', es: 'Revisar el envío' },
  'review.heading': {
    en: 'Review your report before it becomes final',
    es: 'Revise su reporte antes de que sea definitivo',
  },
  'review.lede': {
    en: 'Check each answer below. You can go back and correct anything. Nothing is submitted until you confirm.',
    es: 'Revise cada respuesta a continuación. Puede volver atrás y corregir lo que sea. No se envía nada hasta que usted confirme.',
  },
  'review.confirm': {
    en: 'Confirm and finalize report',
    es: 'Confirmar y finalizar el reporte',
  },
  'review.back': {
    en: 'Go back and make corrections',
    es: 'Volver atrás y hacer correcciones',
  },
  'output.heading': {
    en: 'Structured output (VAERS-compatible)',
    es: 'Salida estructurada (compatible con VAERS)',
  },
  'output.lede': {
    en: 'Your confirmed report as clean structured JSON from one isolated mapping layer, keyed to the published VAERS 2.0 form items where a counterpart exists. Fields born of the modernized workflow await the data element definitions CDC furnishes at kickoff, and the meta block below reports both counts openly (see How it works). Nothing in this report is stored or transmitted.',
    es: 'Su reporte confirmado en formato JSON estructurado, producido por una única capa de asignación aislada y vinculado a los elementos publicados del formulario VAERS 2.0 cuando existe un equivalente. Los campos nacidos del flujo de trabajo modernizado esperan las definiciones de elementos de datos que los CDC proporcionarán al inicio del proyecto, y el bloque meta que aparece abajo informa ambos conteos de forma abierta (vea Cómo funciona). Nada de este reporte se almacena ni se transmite.',
  },
  'output.download': { en: 'Download JSON', es: 'Descargar JSON' },
  'output.jsonLabel': {
    en: 'Structured submission data',
    es: 'Datos estructurados del envío',
  },

  // --- Field chrome --------------------------------------------------------
  'field.requiredSr': { en: '(required)', es: '(obligatorio)' },
  'field.moreGuidance': { en: 'More guidance for {label}', es: 'Más orientación sobre {label}' },
  'field.hideGuidance': { en: 'Hide guidance for {label}', es: 'Ocultar la orientación sobre {label}' },
  'field.selectOne': { en: 'Select one', es: 'Seleccione una opción' },

  // --- Upload --------------------------------------------------------------
  'file.policy': {
    en: 'Accepted: {types} up to {mb} MB each. Attach as many documents as apply.',
    es: 'Se aceptan: {types} de hasta {mb} MB cada uno. Adjunte todos los documentos que correspondan.',
  },
  'file.rejectType': {
    en: '{name}: Phase 1 accepts medical record and vaccine documents as {types}. Pictures and medical imaging arrive in Phase 2.',
    es: '{name}: la Fase 1 acepta registros médicos y documentos de vacunación en formato {types}. Las fotografías y las imágenes médicas llegan en la Fase 2.',
  },
  'file.rejectSize': {
    en: '{name}: larger than the {mb} MB limit ({size}).',
    es: '{name}: supera el límite de {mb} MB ({size}).',
  },
  'file.noneAttached': { en: 'No documents attached.', es: 'No hay documentos adjuntos.' },
  'file.oneAttached': { en: '1 document attached.', es: '1 documento adjunto.' },
  'file.manyAttached': { en: '{n} documents attached.', es: '{n} documentos adjuntos.' },
  'file.listLabel': { en: 'Attached documents', es: 'Documentos adjuntos' },
  'file.remove': { en: 'Remove', es: 'Quitar' },
  'file.removeLabel': { en: 'Remove {name}', es: 'Quitar {name}' },

  // --- Completion status ---------------------------------------------------
  'progress.heading': { en: 'Completion status', es: 'Estado de avance' },
  'progress.countOne': {
    en: 'of {total} required answer',
    es: 'de {total} respuesta obligatoria',
  },
  'progress.countMany': {
    en: 'of {total} required answers',
    es: 'de {total} respuestas obligatorias',
  },
  'progress.valueText': {
    en: '{percent} percent of required questions answered',
    es: '{percent} por ciento de las preguntas obligatorias respondidas',
  },
  'progress.complete': { en: 'complete', es: 'completa' },
  'progress.partial': { en: 'in progress', es: 'en curso' },
  'progress.empty': { en: 'not started', es: 'sin comenzar' },
  'progress.optional': { en: 'optional', es: 'opcional' },
  'progress.detail': {
    en: '{filled} of {required} required answered',
    es: '{filled} de {required} obligatorias respondidas',
  },

  // --- FAQ and surveys -----------------------------------------------------
  'faq.title': { en: 'Frequently asked questions', es: 'Preguntas frecuentes' },
  'faq.close': {
    en: 'Close frequently asked questions',
    es: 'Cerrar las preguntas frecuentes',
  },
  'faq.empty': { en: 'No FAQ entries yet.', es: 'Todavía no hay preguntas frecuentes.' },
  'faq.untitled': { en: '(untitled question)', es: '(pregunta sin título)' },
  'survey.thankYou': { en: 'Thank you', es: 'Gracias' },
  'survey.close': { en: 'Close the {title} survey', es: 'Cerrar la encuesta {title}' },
  'survey.send': { en: 'Send feedback', es: 'Enviar comentarios' },
  'survey.noThanks': { en: 'No thanks', es: 'Ahora no' },

  // --- Validation ----------------------------------------------------------
  'validation.required': { en: 'This field is required.', es: 'Este campo es obligatorio.' },
  'validation.email': {
    en: 'Enter a valid email address.',
    es: 'Ingrese una dirección de correo electrónico válida.',
  },
  'validation.number': { en: 'Enter a number.', es: 'Ingrese un número.' },
  'validation.min0': {
    en: 'Enter a value of 0 or more.',
    es: 'Ingrese un valor de 0 o más.',
  },

  // --- Document suggestions ------------------------------------------------
  'doc.title': { en: 'Documents that would help', es: 'Documentos que ayudarían' },
  'doc.lede': {
    en: 'Based on your answers, these records would strengthen this report. All are optional.',
    es: 'Según sus respuestas, estos registros reforzarían este reporte. Todos son opcionales.',
  },
  'doc.discharge-summary.document': {
    en: 'Hospital discharge summary',
    es: 'Resumen de alta hospitalaria',
  },
  'doc.discharge-summary.why': {
    en: 'You indicated the patient was hospitalized.',
    es: 'Usted indicó que el paciente fue hospitalizado.',
  },
  'doc.prolonged-hospitalization.document': {
    en: 'Hospital records covering the extended stay',
    es: 'Registros hospitalarios que cubran la estadía prolongada',
  },
  'doc.prolonged-hospitalization.why': {
    en: 'You indicated a prolonged hospitalization.',
    es: 'Usted indicó una hospitalización prolongada.',
  },
  'doc.visit-notes.document': {
    en: 'Emergency room or office visit notes',
    es: 'Notas de la visita a la sala de emergencias o al consultorio',
  },
  'doc.visit-notes.why': {
    en: 'You indicated an emergency room or doctor visit.',
    es: 'Usted indicó una visita a la sala de emergencias o al médico.',
  },
  'doc.death-records.document': {
    en: 'Death certificate or autopsy report, if available',
    es: 'Certificado de defunción o informe de autopsia, si está disponible',
  },
  'doc.death-records.why': {
    en: 'You indicated the patient died.',
    es: 'Usted indicó que el paciente falleció.',
  },
  'doc.lab-reports.document': {
    en: 'Laboratory and diagnostic test reports',
    es: 'Informes de laboratorio y de pruebas diagnósticas',
  },
  'doc.lab-reports.why': {
    en: 'You described laboratory or diagnostic results.',
    es: 'Usted describió resultados de laboratorio o de pruebas diagnósticas.',
  },
  'doc.admin-record.document': {
    en: 'Vaccine administration record',
    es: 'Registro de administración de la vacuna',
  },
  'doc.admin-record.why': {
    en: 'You are reporting a vaccine administration error.',
    es: 'Usted está reportando un error en la administración de una vacuna.',
  },
} as const satisfies Record<string, Entry>;

export type UiKey = keyof typeof UI;

/**
 * One interface string in one language, with `{name}` placeholders filled.
 * Interpolation is by name rather than by position because Spanish and English
 * do not put the count and the noun in the same order.
 */
export function uiText(
  key: UiKey,
  locale: Locale,
  vars?: Record<string, string | number>,
): string {
  const text = UI[key][locale];
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** The validation messages in one language, in the shape the engine takes. */
export function validationMessages(locale: Locale) {
  return {
    required: UI['validation.required'][locale],
    email: UI['validation.email'][locale],
    number: UI['validation.number'][locale],
    min0: UI['validation.min0'][locale],
  };
}
