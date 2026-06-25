import type { LegalDocument } from '@/messages/types'

const terms: LegalDocument = {
  title: 'Términos de Uso',
  intro:
    'Al acceder o utilizar Lifedeck (la “Plataforma”, el “Servicio”), declaras haber leído, comprendido y aceptado estos Términos de Uso. Si no estás de acuerdo con alguna parte, no utilices el Servicio.',
  sections: [
    {
      title: '1. El Servicio',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck es una aplicación de organización personal que permite crear listas y tareas, organizar la rutina diaria, compartir listas con otras personas, generar listas con ayuda de inteligencia artificial y seguir tu propio progreso.',
        },
        {
          kind: 'p',
          text: 'La Plataforma está en desarrollo continuo. Las funciones, los límites y las condiciones de uso pueden añadirse, modificarse o eliminarse con el tiempo.',
        },
        {
          kind: 'p',
          text: 'Lifedeck ofrece planes de pago opcionales (Pro y Premium) con facturación recurrente. Las funciones de pago incluyen la sincronización con Google Calendar, los recordatorios y el asistente de WhatsApp. Puedes cancelar tu suscripción en cualquier momento, y permanece activa hasta el final del período pagado.',
        },
      ],
    },
    {
      title: '2. Registro y Cuenta',
      blocks: [
        {
          kind: 'p',
          text: 'Puedes empezar a usar el Servicio como invitado, sin crear una cuenta. Para conservar tus listas entre dispositivos, puedes crear una cuenta con correo y contraseña o iniciar sesión con tu cuenta de Google. Al crear una cuenta, tú:',
        },
        {
          kind: 'list',
          items: [
            'Te comprometes a proporcionar información veraz y a mantenerla actualizada;',
            'Eres responsable de mantener la confidencialidad de tus credenciales de acceso;',
            'Asumes la responsabilidad por las actividades realizadas en tu cuenta;',
            'Debes notificarnos ante cualquier sospecha de acceso no autorizado, en {email}.',
          ],
        },
      ],
    },
    {
      title: '3. Uso Aceptable',
      blocks: [
        {
          kind: 'p',
          text: 'Aceptas utilizar la Plataforma exclusivamente con fines legítimos y conforme a la legislación aplicable. Queda expresamente prohibido:',
        },
        {
          kind: 'list',
          items: [
            'Usar la Plataforma con fines ilegales, fraudulentos o perjudiciales para terceros;',
            'Acceder a datos o cuentas de otros usuarios sin autorización;',
            'Transmitir virus, malware o cualquier código malicioso;',
            'Realizar ingeniería inversa, descompilar o desensamblar cualquier parte de la Plataforma;',
            'Utilizar bots, scripts automatizados o extracción de datos (scraping) sin autorización expresa, o de forma que sobrecargue la infraestructura del Servicio.',
          ],
        },
      ],
    },
    {
      title: '4. Tu Contenido',
      blocks: [
        {
          kind: 'p',
          text: 'Las listas, tareas, notas y demás contenidos que creas siguen siendo tuyos. Nos concedes únicamente la licencia limitada y necesaria para almacenar, procesar y mostrar ese contenido con el fin de operar el Servicio para ti y para las personas con quienes compartas tus listas.',
        },
        {
          kind: 'p',
          text: 'Eres el único responsable del contenido que introduces en la Plataforma y de garantizar que cuentas con los derechos necesarios sobre él.',
        },
      ],
    },
    {
      title: '5. Generación con Inteligencia Artificial',
      blocks: [
        {
          kind: 'p',
          text: 'La función de generación de listas con IA envía el texto que proporcionas a un proveedor de modelo de lenguaje, con el único propósito de generar un borrador editable de lista. El resultado es una sugerencia automatizada y puede contener imprecisiones u omisiones.',
        },
        {
          kind: 'p',
          text: 'El contenido generado no constituye asesoramiento profesional, jurídico, médico ni financiero. Revisa siempre el borrador antes de utilizarlo.',
        },
        {
          kind: 'p',
          text: 'Lifedeck también ofrece un asistente de IA opcional a través de WhatsApp, capaz de leer y actuar sobre tus tareas, listas y calendario en tu nombre. Los mensajes que envías al asistente, incluidos audios e imágenes, son procesados por proveedores de IA para generar respuestas. El uso de IA está sujeto a límites por plan.',
        },
      ],
    },
    {
      title: '6. Propiedad Intelectual',
      blocks: [
        {
          kind: 'p',
          text: 'Todo el contenido de la Plataforma (incluidos el código fuente, el diseño, los logotipos, las marcas, los textos, las funciones y las interfaces) es propiedad exclusiva de Lifedeck o de sus licenciantes, protegido por la legislación de propiedad intelectual aplicable.',
        },
        {
          kind: 'p',
          text: 'Estos Términos no te conceden ningún derecho de propiedad sobre los activos intelectuales del Servicio. Queda prohibido reproducir, distribuir o crear obras derivadas sin autorización previa y expresa.',
        },
      ],
    },
    {
      title: '7. Datos y Privacidad',
      blocks: [
        {
          kind: 'p',
          text: 'El tratamiento de tus datos personales se rige por nuestra [Política de Privacidad](/privacy), elaborada conforme a la Ley General de Protección de Datos de Brasil (LGPD, Ley n.º 13.709/2018). Al usar el Servicio, declaras haberla leído y aceptado.',
        },
      ],
    },
    {
      title: '8. Disponibilidad del Servicio',
      blocks: [
        {
          kind: 'p',
          text: 'Hacemos esfuerzos razonables para mantener el Servicio disponible, pero no garantizamos una disponibilidad ininterrumpida. El Servicio puede suspenderse temporalmente por mantenimiento, actualizaciones o razones técnicas, sin previo aviso cuando sea necesario.',
        },
        {
          kind: 'p',
          text: 'Al estar en desarrollo, las funciones pueden cambiar en cualquier momento.',
        },
      ],
    },
    {
      title: '9. Limitación de Responsabilidad',
      blocks: [
        {
          kind: 'p',
          text: 'En la máxima medida permitida por la legislación aplicable, Lifedeck no se hace responsable de daños indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o de la imposibilidad de uso del Servicio, incluyendo, sin limitación, la pérdida de datos o la interrupción de actividades.',
        },
      ],
    },
    {
      title: '10. Cancelación de la Cuenta',
      blocks: [
        {
          kind: 'p',
          text: 'Puedes cerrar tu cuenta en cualquier momento directamente en la Plataforma, en **Cuenta → Eliminar cuenta**, lo que elimina permanentemente tu cuenta y tus listas. Antes de eso, puedes exportar una copia de tus datos en **Cuenta → Exportar mis datos**.',
        },
        {
          kind: 'p',
          text: 'Nos reservamos el derecho de suspender o cancelar cuentas que infrinjan estos Términos, presenten un comportamiento perjudicial para la Plataforma u otros usuarios, o por orden de una autoridad competente.',
        },
      ],
    },
    {
      title: '11. Modificaciones de los Términos',
      blocks: [
        {
          kind: 'p',
          text: 'Podemos actualizar estos Términos periódicamente. Cuando haya cambios relevantes, notificaremos a los usuarios por correo o mediante un aviso en la Plataforma, con una antelación razonable. El uso continuado del Servicio tras la publicación de los cambios constituirá la aceptación de los nuevos términos.',
        },
      ],
    },
    {
      title: '12. Legislación y Jurisdicción',
      blocks: [
        {
          kind: 'p',
          text: 'Estos Términos se rigen por las leyes de la República Federativa de Brasil. Se elige el fuero de la comarca de São Paulo/SP para resolver cualquier controversia derivada de este instrumento, salvo disposición legal en contrario.',
        },
      ],
    },
    {
      title: '13. Contacto',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck es operado por **{company}**, inscrita en el CNPJ con el n.º {cnpj}. Las dudas, sugerencias o solicitudes relacionadas con estos Términos deben enviarse a: {email}.',
        },
      ],
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Política de Privacidad',
  intro:
    'Esta Política describe cómo Lifedeck recopila, utiliza, almacena y protege tu información personal, conforme a la Ley General de Protección de Datos de Brasil (LGPD, Ley n.º 13.709/2018) y demás normas aplicables.',
  sections: [
    {
      title: '1. Quiénes somos',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck es operado por **{company}**, inscrita en el CNPJ con el n.º {cnpj}. A efectos de esta Política, actuamos como **responsables** del tratamiento de los datos personales tratados en el Servicio, conforme a la LGPD.',
        },
        {
          kind: 'p',
          text: 'Delegado de Protección de Datos (DPO) y canal de contacto: {email}.',
        },
      ],
    },
    {
      title: '2. Datos que recopilamos',
      blocks: [
        {
          kind: 'p',
          text: 'Recopilamos las siguientes categorías de datos personales:',
        },
        {
          kind: 'list',
          items: [
            '**Datos de registro:** nombre visible y, cuando creas una cuenta, dirección de correo;',
            '**Datos de inicio de sesión con Google:** si eliges iniciar sesión con Google, recibimos tu correo, tu nombre y el estado de verificación del correo. Nunca accedemos a tu contraseña de Google;',
            '**Contenido del usuario:** las listas, tareas, notas y comparticiones que creas en la Plataforma;',
            '**Datos de uso:** registros de acceso, funciones utilizadas y registros de actividad;',
            '**Datos técnicos:** dirección IP, tipo de navegador, sistema operativo y cookies de sesión.',
            'Número de teléfono de WhatsApp y el contenido de los mensajes que envías al asistente (texto, audio, imágenes), cuando vinculas WhatsApp;',
            'Eventos del calendario y datos de conexión, cuando conectas Google Calendar;',
            'Estado de suscripción y pago (nunca almacenamos números de tarjeta).',
          ],
        },
        {
          kind: 'p',
          text: 'No recopilamos datos personales sensibles (según la definición de la LGPD) ni datos de menores de 18 años.',
        },
      ],
    },
    {
      title: '3. Finalidad del tratamiento',
      blocks: [
        { kind: 'p', text: 'Utilizamos tus datos personales para:' },
        {
          kind: 'list',
          items: [
            'Proveer, operar y mejorar continuamente el Servicio;',
            'Autenticar, controlar el acceso y proteger las cuentas;',
            'Enviar comunicaciones esenciales del Servicio, como el código de verificación de correo, invitaciones y notificaciones de listas;',
            'Cumplir obligaciones legales y regulatorias;',
            'Prevenir fraudes y garantizar la integridad de la Plataforma.',
          ],
        },
      ],
    },
    {
      title: '4. Base legal (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'El tratamiento de datos personales se fundamenta en las siguientes bases legales previstas en la LGPD:',
        },
        {
          kind: 'list',
          items: [
            '**Ejecución de un contrato (art. 7, V):** para prestar el Servicio;',
            '**Interés legítimo (art. 7, IX):** para la seguridad, la prevención de fraudes y la mejora del Servicio;',
            '**Consentimiento (art. 7, I):** para tratamientos específicos, cuando corresponda;',
            '**Cumplimiento de una obligación legal (art. 7, II):** cuando lo exija la ley o una autoridad competente.',
          ],
        },
      ],
    },
    {
      title: '5. Compartición y subprocesadores',
      blocks: [
        {
          kind: 'p',
          text: 'No vendemos, alquilamos ni comercializamos tus datos personales. Para operar el Servicio, contamos con proveedores que actúan como encargados del tratamiento, solo en la medida indispensable y bajo obligaciones contractuales de protección de datos:',
        },
        {
          kind: 'list',
          items: [
            '**Vercel:** alojamiento de la aplicación e infraestructura web;',
            '**Neon:** base de datos gestionada donde se almacena tu contenido;',
            '**Resend:** envío de correos transaccionales (verificación, invitaciones y notificaciones);',
            '**Google (Gemini, vía Vercel AI Gateway):** proveedor del modelo de lenguaje utilizado en la función de generación de listas con IA;',
            '**Google (OAuth):** autenticación opcional mediante una cuenta de Google;',
            '**Upstash:** limitación de solicitudes (rate limiting) para la seguridad de la API;',
            '**Sentry:** monitoreo de errores para el diagnóstico y la estabilidad de la Plataforma;',
            '**Autoridades públicas:** cuando lo exija la ley, una orden judicial o la solicitud de un órgano competente.',
            '**Meta (WhatsApp Cloud API):** entrega de mensajes del asistente;',
            '**Google (Calendar API):** sincronización del calendario;',
            '**Stripe y Asaas:** cobro de suscripciones;',
            '**Proveedores de IA (p. ej. Google Gemini):** procesamiento de los mensajes del asistente.',
          ],
        },
      ],
    },
    {
      title: '6. Generación con IA',
      blocks: [
        {
          kind: 'p',
          text: 'Al usar la generación de listas con IA, el texto que proporcionas se envía al proveedor del modelo de lenguaje exclusivamente para generar la respuesta de la solicitud actual. El proveedor contratado garantiza, mediante acuerdo, que **no utiliza el contenido para entrenar modelos**.',
        },
        {
          kind: 'p',
          text: 'Recomendamos no introducir datos personales sensibles o confidenciales en los campos de descripción utilizados por la generación con IA.',
        },
        {
          kind: 'p',
          text: 'Los audios e imágenes enviados al asistente de WhatsApp son transcritos o analizados por proveedores de IA únicamente para atender tu solicitud. El contexto de la conversación se conserva brevemente para mantener la coherencia de las respuestas y puede eliminarse junto con tu cuenta.',
        },
      ],
    },
    {
      title: '7. Almacenamiento y seguridad',
      blocks: [
        {
          kind: 'p',
          text: 'Adoptamos medidas técnicas y organizativas adecuadas para proteger tu información, incluyendo:',
        },
        {
          kind: 'list',
          items: [
            'Cifrado en tránsito (TLS);',
            'Contraseñas almacenadas con un algoritmo de hashing robusto (Argon2id), nunca en texto plano;',
            'Control de acceso por rol y principio de mínimo privilegio;',
            'Cabeceras de seguridad y política de seguridad de contenido (CSP).',
          ],
        },
        {
          kind: 'p',
          text: 'Ningún método de transmisión o almacenamiento es 100% seguro. Hacemos esfuerzos continuos para proteger tus datos, pero no podemos garantizar una seguridad absoluta.',
        },
      ],
    },
    {
      title: '8. Tus derechos (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'Como titular de los datos, puedes confirmar la existencia del tratamiento, acceder, corregir, solicitar la anonimización o eliminación, revocar el consentimiento y solicitar la portabilidad de tus datos.',
        },
        {
          kind: 'p',
          text: 'Para el acceso y la portabilidad, puedes generar una copia completa directamente en **Cuenta → Exportar mis datos** (formato JSON). Para la eliminación, usa **Cuenta → Eliminar cuenta**, que elimina permanentemente tu cuenta y tus listas.',
        },
        {
          kind: 'p',
          text: 'Para los demás derechos, o si el autoservicio no es suficiente, contáctanos en {email}. Responderemos dentro del plazo legal.',
        },
      ],
    },
    {
      title: '9. Conservación de datos',
      blocks: [
        {
          kind: 'p',
          text: 'Conservamos tus datos personales mientras tu cuenta esté activa o durante el periodo necesario para cumplir las finalidades descritas en esta Política. Tras el cierre de la cuenta, tus datos se eliminan, salvo el plazo mínimo que pueda exigir la legislación aplicable.',
        },
      ],
    },
    {
      title: '10. Cookies',
      blocks: [
        {
          kind: 'p',
          text: 'Utilizamos exclusivamente cookies esenciales para la autenticación, el mantenimiento de la sesión y el funcionamiento básico del Servicio. No utilizamos cookies de rastreo de terceros con fines publicitarios o de elaboración de perfiles de comportamiento.',
        },
      ],
    },
    {
      title: '11. Menores de edad',
      blocks: [
        {
          kind: 'p',
          text: 'El Servicio está destinado a personas de 18 años o más. No recopilamos intencionadamente datos de menores. Si detectamos que se han recopilado datos de un menor de forma inadvertida, tomaremos las medidas necesarias para eliminarlos.',
        },
      ],
    },
    {
      title: '12. Actualizaciones de esta Política',
      blocks: [
        {
          kind: 'p',
          text: 'Podemos actualizar esta Política periódicamente para reflejar cambios en nuestras prácticas o en la legislación aplicable. Te notificaremos los cambios relevantes por correo o mediante un aviso en la Plataforma, y se revisará la fecha de “Última actualización” en la parte superior.',
        },
      ],
    },
    {
      title: '13. Contacto / Delegado (DPO)',
      blocks: [
        {
          kind: 'p',
          text: 'Para dudas, solicitudes de los titulares o para ejercer tus derechos conforme a la LGPD, contáctanos: {email}.',
        },
        {
          kind: 'p',
          text: 'También tienes derecho a presentar una reclamación ante la Autoridad Nacional de Protección de Datos de Brasil (ANPD) si consideras que tus derechos no se han atendido adecuadamente.',
        },
      ],
    },
  ],
}

export const esLegal = { terms, privacy }
