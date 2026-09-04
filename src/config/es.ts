// ---------------------------------------------------------------------------
// Spanish content for the form, the surveys and the FAQ (PWS 1.13, PRS#19).
//
// This is authored content, not code: a map of the same string keys the English
// schema produces. Nothing here affects branching, validation or the structured
// output, because rules key on option values and the record is keyed to VAERS
// elements. Adding a third language means adding another file like this one.
//
// Register: formal "usted" throughout, which is what a Federal public form uses
// in Spanish, and plain language on the public path exactly as the English does.
// The clinical variant keeps clinical terms; the public variant explains them.
//
// Demonstration content. Production Spanish for a national reporting instrument
// is authored and reviewed by qualified translators, and CDC owns the wording as
// it owns the English. See Volume I, Tab 2-1.
// ---------------------------------------------------------------------------
import type { Translations } from './locale';

export const es: Translations = {
  // --- The form itself ------------------------------------------------------
  'form.title': 'Reporte un problema después de una vacuna (VAERS)',
  'form.intro':
    'Use este formulario para reportar un evento adverso o un problema que ocurrió después de una vacunación. Las preguntas y la redacción se adaptan a quién es usted y a lo que está reportando.',

  // --- Reporter -------------------------------------------------------------
  'section.reporter.title': 'Información del informante',
  'section.reporter.publicTitle': 'Sobre usted',
  'field.reporterType.label': 'Tipo de informante',
  'field.reporterType.publicLabel': '¿Quién está completando este formulario?',
  'field.reporterType.helpText':
    'Su respuesta adapta las preguntas y la redacción a su función. Elija una para comenzar.',
  'field.reporterType.option.public': 'Paciente, padre, madre o cuidador',
  'field.reporterType.option.provider': 'Profesional de la salud',
  'field.reporterName.label': 'Nombre del informante',
  'field.reporterName.publicLabel': 'Su nombre',
  'field.reporterEmail.label': 'Correo electrónico del informante',
  'field.reporterEmail.publicLabel': 'Su correo electrónico',
  'field.reporterPhone.label': 'Teléfono del informante',
  'field.reporterPhone.publicLabel': 'Su teléfono',
  'field.facilityName.label': 'Nombre del centro o del profesional',
  'field.facilityName.publicLabel': 'Nombre de la clínica o farmacia (si lo sabe)',
  'field.relationToPatient.label': 'Relación con el paciente',
  'field.relationToPatient.publicLabel': 'Su relación con el paciente',
  'field.relationToPatient.option.self': 'Yo soy el paciente',
  'field.relationToPatient.option.parent': 'Padre o madre',
  'field.relationToPatient.option.guardian': 'Tutor legal',
  'field.relationToPatient.option.caregiver': 'Cuidador',

  // --- Patient --------------------------------------------------------------
  'section.patient.title': 'Información del paciente',
  'section.patient.publicTitle': 'Sobre el paciente',
  'field.patientAgeAtVax.label': 'Edad al momento de la vacunación',
  'field.patientAgeAtVax.publicLabel':
    '¿Qué edad tenía el paciente cuando recibió la vacuna?',
  'field.patientAgeAtVax.helpText': 'Edad en años al momento de la vacunación.',
  'field.patientDob.label': 'Fecha de nacimiento',
  'field.patientDob.publicLabel': 'Fecha de nacimiento del paciente',
  'field.patientDob.tooltip':
    'Se usa para calcular la edad al momento de la vacunación y para identificar reportes duplicados. Si solo se conoce el año, use el 1 de enero de ese año e indique la incertidumbre en la descripción.',
  'field.patientDob.publicTooltip':
    'Esto ayuda a asociar el reporte con la persona correcta y a calcular qué edad tenía cuando recibió la vacuna. Si está reportando por usted mismo, es su propia fecha de nacimiento.',
  'field.patientSex.label': 'Sexo',
  'field.patientSex.publicLabel': 'Sexo del paciente',
  'field.patientSex.option.F': 'Femenino',
  'field.patientSex.option.M': 'Masculino',
  'field.patientSex.option.U': 'Desconocido',
  'field.patientState.label': 'Estado',
  'field.patientState.publicLabel': 'Estado donde vive el paciente',
  'field.patientState.option.AL': 'Alabama',
  'field.patientState.option.AK': 'Alaska',
  'field.patientState.option.AZ': 'Arizona',
  'field.patientState.option.AR': 'Arkansas',
  'field.patientState.option.CA': 'California',
  'field.patientState.option.CO': 'Colorado',
  'field.patientState.option.CT': 'Connecticut',
  'field.patientState.option.DE': 'Delaware',
  'field.patientState.option.DC': 'Distrito de Columbia',
  'field.patientState.option.FL': 'Florida',
  'field.patientState.option.GA': 'Georgia',
  'field.patientState.option.HI': 'Hawái',
  'field.patientState.option.ID': 'Idaho',
  'field.patientState.option.IL': 'Illinois',
  'field.patientState.option.IN': 'Indiana',
  'field.patientState.option.IA': 'Iowa',
  'field.patientState.option.KS': 'Kansas',
  'field.patientState.option.KY': 'Kentucky',
  'field.patientState.option.LA': 'Luisiana',
  'field.patientState.option.ME': 'Maine',
  'field.patientState.option.MD': 'Maryland',
  'field.patientState.option.MA': 'Massachusetts',
  'field.patientState.option.MI': 'Michigan',
  'field.patientState.option.MN': 'Minnesota',
  'field.patientState.option.MS': 'Misisipi',
  'field.patientState.option.MO': 'Misuri',
  'field.patientState.option.MT': 'Montana',
  'field.patientState.option.NE': 'Nebraska',
  'field.patientState.option.NV': 'Nevada',
  'field.patientState.option.NH': 'Nuevo Hampshire',
  'field.patientState.option.NJ': 'Nueva Jersey',
  'field.patientState.option.NM': 'Nuevo México',
  'field.patientState.option.NY': 'Nueva York',
  'field.patientState.option.NC': 'Carolina del Norte',
  'field.patientState.option.ND': 'Dakota del Norte',
  'field.patientState.option.OH': 'Ohio',
  'field.patientState.option.OK': 'Oklahoma',
  'field.patientState.option.OR': 'Oregón',
  'field.patientState.option.PA': 'Pensilvania',
  'field.patientState.option.RI': 'Rhode Island',
  'field.patientState.option.SC': 'Carolina del Sur',
  'field.patientState.option.SD': 'Dakota del Sur',
  'field.patientState.option.TN': 'Tennessee',
  'field.patientState.option.TX': 'Texas',
  'field.patientState.option.UT': 'Utah',
  'field.patientState.option.VT': 'Vermont',
  'field.patientState.option.VA': 'Virginia',
  'field.patientState.option.WA': 'Washington',
  'field.patientState.option.WV': 'Virginia Occidental',
  'field.patientState.option.WI': 'Wisconsin',
  'field.patientState.option.WY': 'Wyoming',
  'field.patientPregnant.label': '¿Estaba embarazada al momento de la vacunación?',
  'field.patientPregnant.publicLabel':
    '¿Estaba embarazada la paciente cuando recibió la vacuna?',
  'field.patientPregnant.tooltip':
    'Se registra en todos los reportes independientemente del evento reportado, porque la exposición durante el embarazo se monitorea por separado. Responder que sí abre las preguntas relacionadas aquí mismo, sin enviarlo a otra parte del formulario.',
  'field.patientPregnant.publicTooltip':
    'Preguntamos esto en todos los reportes. Si la respuesta es sí, aparecerán un par de preguntas adicionales aquí mismo.',
  'field.patientPregnant.option.yes': 'Sí',
  'field.patientPregnant.option.no': 'No',
  'field.patientPregnant.option.unknown': 'Desconocido',
  'field.pregnancyDueDate.label': 'Fecha probable de parto',
  'field.pregnancyDueDate.publicLabel': '¿Para cuándo estaba previsto el nacimiento?',
  'field.pregnancyDueDate.helpText': 'Si la sabe. Una fecha aproximada es aceptable.',
  'field.pregnancyComplications.label': 'Complicaciones del embarazo',
  'field.pregnancyComplications.publicLabel': '¿Hubo algún problema con el embarazo?',
  'field.pregnancyComplications.helpText':
    'Complicaciones observadas durante el embarazo o después de este, y el desenlace si se conoce.',
  'field.pregnancyComplications.publicHelpText':
    'Cualquier cosa que haya salido mal durante el embarazo o después, y cómo terminó, si lo sabe.',
  'field.patientRecovered.label': '¿Se ha recuperado el paciente?',
  'field.patientRecovered.publicLabel': '¿Se ha recuperado el paciente?',
  'field.patientRecovered.option.yes': 'Sí',
  'field.patientRecovered.option.no': 'No',
  'field.patientRecovered.option.unknown': 'Desconocido',

  // --- Vaccines -------------------------------------------------------------
  'section.vaccines.title': 'Vacuna o vacunas administradas',
  'section.vaccines.publicTitle': 'La vacuna',
  'section.vaccines.description':
    'Detalles de la vacuna que se administró. Agregue otra si se administró más de una en la misma visita.',
  'section.vaccines.itemLabel': 'Vacuna',
  'section.vaccines.addLabel': 'Agregar otra vacuna',
  'section.vaccines.publicDescription':
    'Detalles de la vacuna que se aplicó. Agregue otra si se aplicó más de una en la misma visita.',
  'field.vaxType.label': 'Tipo de vacuna',
  'field.vaxType.publicLabel': '¿Cuál vacuna?',
  'field.vaxType.option.covid19': 'COVID-19',
  'field.vaxType.option.influenza': 'Influenza (gripe)',
  'field.vaxType.option.mmr': 'MMR (sarampión, paperas, rubéola)',
  'field.vaxType.option.tdap': 'Tdap / Td',
  'field.vaxType.option.hpv': 'VPH',
  'field.vaxType.option.shingles': 'Culebrilla (herpes zóster)',
  'field.vaxType.option.other': 'Otra',
  'field.vaxManufacturer.label': 'Fabricante',
  'field.vaxManufacturer.publicLabel': 'Fabricante de la vacuna (si lo sabe)',
  'field.vaxLot.label': 'Número de lote',
  'field.vaxLot.publicLabel': 'Número de lote (en la tarjeta o el registro, si lo sabe)',
  'field.vaxLot.tooltip':
    'Figura en el vial de la vacuna y se traslada al registro de administración. Déjelo en blanco si no está disponible; un reporte sin número de lote se acepta igualmente.',
  'field.vaxLot.publicTooltip':
    'Búsquelo en su tarjeta de vacunación o en el comprobante que le dieron. Suele ser una combinación corta de letras y números. Si no lo encuentra, déjelo en blanco y continúe.',
  'field.vaxDoseNum.label': 'Número de dosis en la serie',
  'field.vaxDoseNum.publicLabel': '¿Qué dosis fue?',
  'field.vaxDoseNum.option.1': 'Primera dosis',
  'field.vaxDoseNum.option.2': 'Segunda dosis',
  'field.vaxDoseNum.option.3': 'Tercera dosis',
  'field.vaxDoseNum.option.booster': 'Refuerzo',
  'field.vaxDoseNum.option.unknown': 'Desconocido',
  'field.vaxRoute.label': 'Vía de administración',
  'field.vaxRoute.publicLabel': '¿Cómo se aplicó la vacuna?',
  'field.vaxRoute.option.IM': 'Intramuscular (IM)',
  'field.vaxRoute.option.SC': 'Subcutánea (SC)',
  'field.vaxRoute.option.ID': 'Intradérmica (ID)',
  'field.vaxRoute.option.oral': 'Oral',
  'field.vaxRoute.option.nasal': 'Nasal',
  'field.vaxRoute.option.unknown': 'Desconocida',
  'field.vaxSite.label': 'Sitio anatómico',
  'field.vaxSite.publicLabel': '¿En qué parte del cuerpo se aplicó la vacuna?',
  'field.vaxSite.option.left_arm': 'Brazo izquierdo',
  'field.vaxSite.option.right_arm': 'Brazo derecho',
  'field.vaxSite.option.left_thigh': 'Muslo izquierdo',
  'field.vaxSite.option.right_thigh': 'Muslo derecho',
  'field.vaxSite.option.other': 'Otro',
  'field.vaxDate.label': 'Fecha de vacunación',
  'field.vaxDate.publicLabel': 'Fecha en que se aplicó la vacuna',
  'field.vaxDate.tooltip':
    'La fecha en que se administró la dosis, no la fecha en que comenzó la reacción. Si no se dispone de la fecha exacta, indique la fecha conocida más cercana en lugar de omitir el reporte.',
  'field.vaxDate.publicTooltip':
    'El día en que recibió la vacuna, no el día en que empezó a sentirse mal. Si no está seguro del día exacto, su mejor estimación es suficiente.',

  // --- Administration error -------------------------------------------------
  'section.adminError.title': 'Error en la administración de la vacuna',
  'section.adminError.description':
    'Para reportar un error en la preparación o la aplicación de una vacuna.',
  'field.isAdminError.label': '¿Está reportando un error en la administración de una vacuna?',
  'field.isAdminError.helpText':
    'Por ejemplo: vacuna equivocada, dosis equivocada, producto vencido, o sitio o vía equivocados.',
  'field.isAdminError.option.yes': 'Sí',
  'field.isAdminError.option.no': 'No',
  'field.errorType.label': 'Tipo de error',
  'field.errorType.tooltip':
    'Los errores de administración se reportan haya sufrido o no daño el paciente. Seleccione todas las categorías que correspondan; cuando un error tenga más de una dimensión, por ejemplo una dosis equivocada aplicada por una vía equivocada, registre ambas.',
  'field.errorType.option.wrong_vaccine': 'Vacuna equivocada',
  'field.errorType.option.wrong_dose': 'Dosis o cantidad equivocada',
  'field.errorType.option.expired_product': 'Producto vencido',
  'field.errorType.option.wrong_site': 'Sitio equivocado',
  'field.errorType.option.wrong_route': 'Vía equivocada',
  'field.errorType.option.wrong_age': 'Edad equivocada',
  'field.errorType.option.storage_handling': 'Problema de almacenamiento o manipulación',
  'field.errorType.option.other': 'Otro',
  'field.errorHadAE.label': '¿El paciente presentó algún evento adverso o problema de salud?',
  'field.errorHadAE.helpText':
    'Si la respuesta es no, las preguntas sobre el evento adverso no son necesarias y se ocultarán.',
  'field.errorHadAE.option.yes': 'Sí',
  'field.errorHadAE.option.no': 'No',
  'field.errorDescription.label': 'Describa el error',

  // --- Adverse event --------------------------------------------------------
  'section.adverseEvent.title': 'Evento adverso',
  'section.adverseEvent.publicTitle': 'Qué ocurrió',
  'section.adverseEvent.description':
    'Describa el evento adverso o la reacción ocurrida después de la vacuna.',
  'section.adverseEvent.publicDescription':
    'Cuéntenos sobre el problema de salud o la reacción que ocurrió después de la vacuna.',
  'field.aeOnsetDate.label': 'Fecha de inicio del evento adverso',
  'field.aeOnsetDate.publicLabel': '¿Cuándo comenzó el problema?',
  'field.aeOnsetTime.label': 'Tiempo hasta el inicio',
  'field.aeOnsetTime.publicLabel':
    '¿Cuánto tiempo después de la vacuna comenzó, aproximadamente?',
  'field.aeOnsetTime.placeholder': 'por ejemplo, 30 minutos, 2 días',
  'field.aeDescription.label': 'Descripción del evento adverso',
  'field.aeDescription.publicLabel': 'Describa qué ocurrió',
  'field.aeSeriousness.label': 'Criterios de gravedad',
  'field.aeSeriousness.publicLabel':
    '¿Qué tan grave fue? (marque todas las opciones que correspondan)',
  'field.aeSeriousness.tooltip':
    'Estos son los criterios regulatorios de gravedad. Cualquiera de ellos clasifica el reporte como grave y cambia la prioridad con que se revisa, así que seleccione todos los que correspondan y no solo el más severo.',
  'field.aeSeriousness.publicTooltip':
    'Marque todo lo que ocurrió, aunque no esté seguro de que lo haya causado la vacuna. Elegir más de una opción es normal y ayuda a los revisores a entender la gravedad.',
  'field.aeSeriousness.option.died': 'El paciente falleció',
  'field.aeSeriousness.option.life_threatening': 'Potencialmente mortal',
  'field.aeSeriousness.option.hospitalized': 'Hospitalización',
  'field.aeSeriousness.option.prolonged_hospitalization': 'Hospitalización prolongada',
  'field.aeSeriousness.option.permanent_disability': 'Discapacidad permanente',
  'field.aeSeriousness.option.er_or_doctor_visit':
    'Visita a la sala de emergencias o al médico',
  'field.aeSeriousness.option.birth_defect': 'Defecto congénito',
  'field.aeSeriousness.option.none': 'Ninguna de las anteriores',
  'field.aeDeathDate.label': 'Fecha del fallecimiento',
  'field.aeHospDays.label': 'Número de días de hospitalización',
  'field.aeTreatment.label': 'Tratamiento administrado',
  'field.aeTreatment.publicLabel': '¿Qué tratamiento se administró, si hubo alguno?',
  'field.aeOutcome.label': 'Estado actual',
  'field.aeOutcome.publicLabel': '¿Cómo se encuentra el paciente ahora?',
  'field.aeOutcome.option.recovered': 'Recuperado',
  'field.aeOutcome.option.recovering': 'En recuperación',
  'field.aeOutcome.option.not_recovered': 'No recuperado',
  'field.aeOutcome.option.unknown': 'Desconocido',

  // --- Clinical context -----------------------------------------------------
  'section.clinical.title': 'Contexto clínico',
  'section.clinical.publicTitle': 'Otra información de salud',
  'field.medHistory.label': 'Antecedentes médicos o afecciones relevantes',
  'field.medHistory.publicLabel': '¿Hay alguna afección de salud que debamos conocer?',
  'field.allergies.label': 'Alergias conocidas',
  'field.allergies.publicLabel': 'Alergias conocidas',
  'field.concomitantMeds.label': 'Medicamentos concomitantes',
  'field.concomitantMeds.publicLabel': 'Otros medicamentos tomados por esas mismas fechas',
  'field.priorVaxReactions.label': 'Eventos adversos previos tras una vacunación',
  'field.priorVaxReactions.publicLabel': '¿Ha tenido reacciones a vacunas anteriormente?',
  'field.labData.label': 'Resultados relevantes de laboratorio o pruebas diagnósticas',
  'field.illnessAtVax.label': 'Enfermedad al momento de la vacunación',
  'field.illnessAtVax.publicLabel': '¿Estaba enfermo el paciente cuando recibió la vacuna?',

  // --- Attachments ----------------------------------------------------------
  'section.attachments.title': 'Información de apoyo',
  'section.attachments.publicTitle': 'Algo más',
  'field.medicalRecordUpload.label': 'Cargue registros médicos de apoyo',
  'field.medicalRecordUpload.publicLabel': 'Cargue documentos de apoyo (opcional)',
  'field.medicalRecordUpload.helpText':
    'Solo demostración. Los archivos se validan y se listan en su navegador; no se cargan, no se almacenan y no se transmiten. No adjunte registros reales.',
  'field.medicalRecordUpload.tooltip':
    'Los resúmenes de alta, las notas de consulta, los resultados de laboratorio y los informes de imágenes son los documentos de apoyo más útiles. Adjuntarlos al enviar evita una solicitud posterior.',
  'field.medicalRecordUpload.publicTooltip':
    'Cualquier cosa que le haya dado un médico o un hospital sobre lo ocurrido es útil, por ejemplo un papel de alta o resultados de pruebas. No es obligatorio adjuntar nada para presentar un reporte.',
  'field.freeText.label': 'Algo más que agregar',
  'field.freeText.publicLabel': '¿Algo más que le gustaría agregar?',

  // --- Site navigation survey ----------------------------------------------
  'survey.site-navigation.title': '¿Cómo le está funcionando este sitio?',
  'survey.site-navigation.intro':
    'Dos preguntas rápidas sobre cómo se orientó en el sitio. No se almacena nada.',
  'survey.site-navigation.thanks':
    'Gracias. Comentarios como este son los que nos dicen qué páginas arreglar primero.',
  'survey.site-navigation.q.foundWhatINeeded': '¿Pudo encontrar lo que buscaba?',
  'survey.site-navigation.q.foundWhatINeeded.option.yes': 'Sí',
  'survey.site-navigation.q.foundWhatINeeded.option.partly': 'En parte',
  'survey.site-navigation.q.foundWhatINeeded.option.no': 'No',
  'survey.site-navigation.q.navEase': '¿Qué tan fácil fue moverse por el sitio?',
  'survey.site-navigation.q.navEase.option.5': 'Muy fácil',
  'survey.site-navigation.q.navEase.option.4': 'Fácil',
  'survey.site-navigation.q.navEase.option.3': 'Ni fácil ni difícil',
  'survey.site-navigation.q.navEase.option.2': 'Difícil',
  'survey.site-navigation.q.navEase.option.1': 'Muy difícil',
  'survey.site-navigation.q.navComment': '¿Qué estaba intentando hacer?',

  // --- Post-submission survey ----------------------------------------------
  'survey.post-submission.title': '¿Cómo le fue?',
  'survey.post-submission.thanks':
    'Gracias. Sus comentarios nos ayudan a mejorar este formulario. Nada de lo que ingresó ha sido almacenado.',
  'survey.post-submission.q.ease': '¿Qué tan fácil fue completar este reporte?',
  'survey.post-submission.q.ease.option.5': 'Muy fácil',
  'survey.post-submission.q.ease.option.4': 'Fácil',
  'survey.post-submission.q.ease.option.3': 'Ni fácil ni difícil',
  'survey.post-submission.q.ease.option.2': 'Difícil',
  'survey.post-submission.q.ease.option.1': 'Muy difícil',
  'survey.post-submission.q.clarity': '¿Fueron claras las preguntas?',
  'survey.post-submission.q.clarity.option.yes': 'Sí, fueron claras',
  'survey.post-submission.q.clarity.option.mostly': 'En su mayoría claras',
  'survey.post-submission.q.clarity.option.no': 'No, algunas fueron confusas',
  'survey.post-submission.q.comment': '¿Hay algo que podamos mejorar?',

  // --- FAQ ------------------------------------------------------------------
  'faq.faq-what-is-vaers.question': '¿Qué es VAERS?',
  'faq.faq-what-is-vaers.answer':
    'VAERS es el Sistema de Notificación de Eventos Adversos a Vacunas, un sistema nacional de alerta temprana administrado en conjunto por los CDC y la FDA para detectar posibles problemas de seguridad con las vacunas autorizadas en los Estados Unidos.',
  'faq.faq-who-can-report.question': '¿Quién puede presentar un reporte?',
  'faq.faq-who-can-report.answer':
    'Cualquier persona puede reportar: pacientes, padres y cuidadores, así como profesionales de la salud. Los profesionales de la salud están obligados a reportar ciertos eventos adversos después de una vacunación.',
  'faq.faq-causation.question': '¿Tengo que estar seguro de que la vacuna causó el problema?',
  'faq.faq-causation.answer':
    'No. Reporte cualquier problema de salud que haya ocurrido después de la vacunación, aunque no esté seguro de que la vacuna lo haya causado. Un reporte no significa que la vacuna haya causado el evento.',
  'faq.faq-privacy.question': '¿Este prototipo almacena mi información?',
  'faq.faq-privacy.answer':
    'No. Esto es solo una demostración. Nada de lo que ingrese en un reporte se guarda, se transmite ni se comparte. No ingrese información personal ni de salud real.',
};
