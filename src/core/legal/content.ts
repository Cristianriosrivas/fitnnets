// Fuente única del texto legal. Si cambias el contenido de forma sustancial,
// actualiza POLICY_VERSION: la app volverá a pedir la autorización a todos los usuarios
// (el mismo valor debe ir en CONSENT_VERSION de la app móvil).
export const POLICY_VERSION = '2026-10-15'
export const POLICY_DATE = '15 de octubre de 2026'

// COMPLETA ESTOS DATOS antes de publicar
export const LEGAL_INFO = {
  appName: 'Finnets',
  responsable: 'Cristian Ríos',
  email: 'TU_CORREO_DE_CONTACTO@ejemplo.com',
  domicilio: 'TU_CIUDAD, Colombia',
  sitio: 'https://fitnnets.vercel.app',
}

// Un string es un párrafo; un arreglo de strings es una lista con viñetas
export type LegalSection = {
  title: string
  content: (string | string[])[]
}

const L = LEGAL_INFO

export const PRIVACY_INTRO = `Esta política explica cómo ${L.appName} recolecta, usa, almacena y protege tus datos personales, y cómo puedes ejercer tus derechos. Se expide en cumplimiento de la Ley Estatutaria 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto Único Reglamentario 1074 de 2015) y demás normas de protección de datos personales de Colombia.`

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Responsable del tratamiento',
    content: [
      `El responsable del tratamiento de tus datos es ${L.responsable}, titular de ${L.appName}.`,
      [`Correo de contacto: ${L.email}`, `Domicilio: ${L.domicilio}`, `Sitio: ${L.sitio}`],
    ],
  },
  {
    title: 'Datos que recolectamos',
    content: [
      [
        'Datos de cuenta: correo electrónico, nombre de usuario y, si inicias sesión con Google, los datos básicos que Google comparte con tu autorización.',
        'Datos físicos y de salud: edad, género, peso, altura, tipo de cuerpo (somatotipo), medidas corporales (pecho, cintura, cadera, glúteo, brazo y muslo), objetivo, nivel de actividad y lugar de entrenamiento.',
        'Datos de uso: rutinas, entrenamientos completados, historial de peso, planes de comidas, alimentos que indicas, comidas consumidas y metas que escribes con tus propias palabras.',
        'Datos sociales: tus amistades, retos, puntajes y las rutinas que compartes o recibes.',
        'Datos técnicos: registros de los proveedores de infraestructura (por ejemplo, dirección IP y fecha de acceso) necesarios para la seguridad y el funcionamiento del servicio.',
      ],
      'No recolectamos tu ubicación, tus contactos ni el contenido de tu teléfono.',
    ],
  },
  {
    title: 'Datos sensibles (datos de salud)',
    content: [
      'Según el artículo 5 de la Ley 1581 de 2012, los datos relativos a la salud son datos sensibles. Tu peso, altura, medidas corporales y hábitos de entrenamiento y alimentación pueden considerarse como tales.',
      'Tienes derecho a no responder preguntas sobre datos sensibles y su tratamiento es voluntario. Solo los tratamos con tu autorización previa, expresa e informada, que te pedimos al registrarte. Sin estos datos no podemos personalizar tus rutinas ni tu plan de alimentación.',
      'No vendemos tus datos de salud, no los usamos para publicidad ni para tomar decisiones que te discriminen.',
    ],
  },
  {
    title: 'Finalidades del tratamiento',
    content: [
      [
        'Crear y administrar tu cuenta y autenticarte.',
        'Generar rutinas y planes de alimentación personalizados con inteligencia artificial.',
        'Mostrar tu progreso, tu racha y tus estadísticas.',
        'Habilitar las funciones sociales: amigos, retos y rutinas entre amigos.',
        'Mantener la seguridad del servicio, prevenir abusos y resolver incidentes.',
        'Atender tus consultas y reclamos, y cumplir obligaciones legales.',
      ],
      'No vendemos tus datos ni los usamos para publicidad.',
    ],
  },
  {
    title: 'Uso de inteligencia artificial',
    content: [
      'Para generar rutinas y planes de alimentación enviamos a Google Gemini datos de tu perfil (edad, género, peso, altura, objetivo, nivel de actividad, tipo de cuerpo y lugar de entrenamiento), la meta que hayas escrito y los alimentos que indiques. No enviamos tu correo ni tu nombre de usuario.',
      'Google trata esa información según sus propios términos; en el nivel gratuito de su API, Google puede usar los contenidos enviados para mejorar sus servicios.',
      'Las recomendaciones generadas son orientativas y pueden contener errores. No reemplazan la valoración de un médico, nutricionista o entrenador. Consulta con un profesional antes de iniciar o modificar un programa de ejercicio o alimentación.',
    ],
  },
  {
    title: 'Con quién compartimos tus datos',
    content: [
      'Para operar el servicio usamos proveedores tecnológicos que tratan los datos por nuestra cuenta:',
      [
        'Supabase: base de datos y autenticación.',
        'Vercel: alojamiento de la aplicación web y de la API.',
        'Google: modelo de inteligencia artificial Gemini y, si eliges esa opción, inicio de sesión con Google.',
      ],
      'Otros usuarios solo ven tu nombre de usuario y la información que decidas compartir (por ejemplo, retos, puntajes y rutinas).',
      'No compartimos tus datos con terceros con fines comerciales. Podremos entregarlos a una autoridad cuando la ley lo exija.',
    ],
  },
  {
    title: 'Transmisión y transferencia internacional',
    content: [
      'Los servidores de estos proveedores pueden estar ubicados fuera de Colombia. Al aceptar esta política autorizas de forma expresa e inequívoca la transmisión y transferencia internacional de tus datos para las finalidades descritas (artículo 26 de la Ley 1581 de 2012). Utilizamos proveedores que aplican medidas de seguridad reconocidas.',
    ],
  },
  {
    title: 'Tus derechos como titular',
    content: [
      'De acuerdo con el artículo 8 de la Ley 1581 de 2012, puedes:',
      [
        'Conocer, actualizar y rectificar tus datos.',
        'Solicitar prueba de la autorización que otorgaste.',
        'Ser informado sobre el uso que se ha dado a tus datos.',
        'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones a la ley.',
        'Revocar la autorización y solicitar la supresión de tus datos.',
        'Acceder de forma gratuita a tus datos personales.',
      ],
      `Dentro de la aplicación puedes editar tu perfil y eliminar tu cuenta. Para cualquier otro derecho, escribe a ${L.email}.`,
    ],
  },
  {
    title: 'Procedimiento para consultas y reclamos',
    content: [
      `Envía tu solicitud a ${L.email} con tu nombre, el correo de tu cuenta y una descripción clara de lo que pides. Si es un reclamo, añade los hechos y los documentos que lo respalden.`,
      [
        'Consultas: las respondemos en un máximo de 10 días hábiles. Si no es posible, te informaremos el motivo y la nueva fecha, que no superará 5 días hábiles adicionales.',
        'Reclamos (corrección, actualización o supresión): los atendemos en un máximo de 15 días hábiles, prorrogables por 8 días hábiles más con aviso previo.',
      ],
      'Antes de acudir a la SIC debes haber agotado este trámite ante nosotros.',
    ],
  },
  {
    title: 'Eliminación de tu cuenta y conservación',
    content: [
      'Puedes eliminar tu cuenta en cualquier momento desde la aplicación (Perfil, opción Privacidad y cuenta). La eliminación es inmediata e irreversible y borra:',
      [
        'tu perfil y tus datos físicos y de salud;',
        'tus rutinas, entrenamientos, historial de peso y medidas;',
        'tus planes de comidas;',
        'tus amistades y los retos que creaste;',
        'el registro de tu autorización.',
      ],
      'Las rutinas que creaste para un amigo permanecen en su cuenta, pero sin tu nombre. Es posible que los proveedores conserven copias de seguridad durante un tiempo limitado y que debamos conservar información cuando una norma lo exija.',
    ],
  },
  {
    title: 'Seguridad de la información',
    content: [
      'Protegemos tus datos con conexiones cifradas (HTTPS), controles de acceso por usuario en la base de datos y manteniendo las claves del servicio de inteligencia artificial únicamente en el servidor. Ningún sistema es completamente seguro; si ocurre un incidente que afecte tus datos, te informaremos y lo notificaremos a la autoridad cuando corresponda.',
    ],
  },
  {
    title: 'Menores de edad',
    content: [
      `${L.appName} no está dirigida a menores de 18 años. Si detectamos una cuenta de un menor sin autorización de sus representantes legales, la eliminaremos.`,
    ],
  },
  {
    title: 'Cambios y vigencia',
    content: [
      'Podemos actualizar esta política. Publicaremos la nueva versión con su fecha y, si el cambio es sustancial, te pediremos de nuevo tu autorización. Conservamos tus datos mientras tu cuenta esté activa y por el tiempo que exija la ley.',
    ],
  },
]

export const TERMS_INTRO = `Estos términos regulan el uso de ${L.appName}. Al crear una cuenta o usar la aplicación aceptas estas condiciones y la Política de privacidad.`

export const TERMS_SECTIONS: LegalSection[] = [
  {
    title: 'El servicio',
    content: [
      `${L.appName} ofrece rutinas de entrenamiento y planes de alimentación generados con inteligencia artificial, seguimiento de progreso y funciones sociales. El servicio es gratuito.`,
    ],
  },
  {
    title: 'Requisitos y cuenta',
    content: [
      [
        'Debes ser mayor de 18 años.',
        'Debes darnos información veraz y mantenerla actualizada.',
        'Tu cuenta es personal. Eres responsable de la seguridad de tu contraseña y de la actividad de tu cuenta.',
      ],
    ],
  },
  {
    title: 'Aviso de salud',
    content: [
      [
        `${L.appName} no es un servicio médico y no sustituye la valoración de un profesional de la salud.`,
        'Consulta con un médico antes de iniciar un programa de ejercicio o alimentación, sobre todo si tienes condiciones médicas, estás embarazada, lesionado o tomas medicamentos.',
        'Las calorías y los macronutrientes son estimaciones aproximadas.',
        'Detén el ejercicio si sientes dolor, mareo o malestar.',
        'Asumes los riesgos propios de la actividad física.',
      ],
    ],
  },
  {
    title: 'Contenido generado por inteligencia artificial',
    content: [
      'Las rutinas y los planes los genera un modelo de inteligencia artificial y pueden contener errores o no ser adecuados para tu caso. Revísalos antes de seguirlos y ajústalos a tus necesidades.',
    ],
  },
  {
    title: 'Conducta aceptable',
    content: [
      'Te comprometes a no:',
      [
        'suplantar a otra persona ni crear cuentas falsas;',
        'acosar, insultar o perjudicar a otros usuarios;',
        'extraer datos de forma masiva ni intentar acceder a cuentas ajenas;',
        'sobrecargar el servicio ni intentar vulnerar su seguridad.',
      ],
    ],
  },
  {
    title: 'Funciones sociales y tu contenido',
    content: [
      'Tu nombre de usuario y lo que decidas compartir (retos, puntajes y rutinas) pueden ser vistos por otros usuarios. Eres responsable de lo que compartes. Podemos retirar contenido que infrinja estos términos.',
    ],
  },
  {
    title: 'Propiedad intelectual',
    content: [
      `${L.appName}, su diseño y su código pertenecen a su titular; no puedes copiarlos ni revenderlos. Los datos y contenidos que creas siguen siendo tuyos y nos autorizas a usarlos únicamente para operar el servicio.`,
    ],
  },
  {
    title: 'Disponibilidad del servicio',
    content: [
      'El servicio se ofrece tal como está, sin garantía de disponibilidad continua. Depende de proveedores con cuotas gratuitas, por lo que puede presentar interrupciones o límites de uso, y puede cambiar o suspenderse.',
    ],
  },
  {
    title: 'Limitación de responsabilidad',
    content: [
      'En la medida permitida por la ley, no respondemos por lesiones, daños a la salud o pérdidas derivadas del uso de las rutinas o de los planes, ni por interrupciones del servicio. Nada de lo aquí dispuesto excluye responsabilidades que la ley no permita excluir.',
    ],
  },
  {
    title: 'Suspensión y terminación',
    content: [
      'Podemos suspender o cerrar cuentas que incumplan estos términos. Tú puedes eliminar tu cuenta en cualquier momento desde la aplicación.',
    ],
  },
  {
    title: 'Ley aplicable',
    content: [
      'Estos términos se rigen por las leyes de la República de Colombia. Las controversias se someterán a los jueces competentes de Colombia.',
    ],
  },
  {
    title: 'Cambios y contacto',
    content: [
      `Podemos modificar estos términos y te avisaremos de los cambios sustanciales. Si sigues usando la aplicación después del aviso, aceptas la nueva versión. Contacto: ${L.email}.`,
    ],
  },
]