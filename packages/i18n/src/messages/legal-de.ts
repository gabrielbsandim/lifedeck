import type { LegalDocument } from '@/messages/types'

const terms: LegalDocument = {
  title: 'Nutzungsbedingungen',
  intro:
    'Indem Sie Lifedeck (die „Plattform“, der „Dienst“) aufrufen oder nutzen, bestätigen Sie, dass Sie diese Nutzungsbedingungen gelesen, verstanden und akzeptiert haben. Wenn Sie mit einem Teil nicht einverstanden sind, nutzen Sie den Dienst nicht.',
  sections: [
    {
      title: '1. Der Dienst',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck ist eine App zur persönlichen Organisation, mit der Sie Listen und Aufgaben erstellen, Ihren Alltag organisieren, Listen mit anderen Personen teilen, Listen mithilfe künstlicher Intelligenz erstellen und Ihren eigenen Fortschritt verfolgen können.',
        },
        {
          kind: 'p',
          text: 'Die Plattform wird kontinuierlich weiterentwickelt. Funktionen, Limits und Nutzungsbedingungen können im Laufe der Zeit hinzugefügt, geändert oder entfernt werden.',
        },
        {
          kind: 'p',
          text: 'Lifedeck bietet optionale kostenpflichtige Pläne (Pro und Premium) an. Zu den kostenpflichtigen Funktionen gehören die Synchronisierung mit Google Calendar, Erinnerungen und der WhatsApp-Assistent. Die Bedingungen für diese Abonnements sind in Abschnitt 2 beschrieben.',
        },
      ],
    },
    {
      title: '2. Zahlungen und Abonnements',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck bietet optionale kostenpflichtige Pläne (Pro und Premium) an, die monatlich oder jährlich abgerechnet werden. Die aktuellen Preise werden in der App angezeigt, bevor Sie einen Kauf bestätigen, und können anfallende Steuern enthalten.',
        },
        {
          kind: 'p',
          text: 'Abonnements verlängern sich am Ende jedes Abrechnungszeitraums automatisch um denselben Zeitraum, bis Sie kündigen. Zahlungen werden von unseren Zahlungsdienstleistern Stripe (international) und Asaas (Brasilien) abgewickelt; wir speichern Ihre Kartennummer nicht.',
        },
        {
          kind: 'p',
          text: 'Sie können jederzeit unter **Konto → Abrechnung** kündigen. Die Kündigung stoppt die nächste Abbuchung; Ihr bezahlter Zugang bleibt bis zum Ende des bereits bezahlten Zeitraums bestehen und wird danach nicht verlängert.',
        },
        {
          kind: 'p',
          text: '**Widerrufsrecht (Art. 49 des brasilianischen Verbraucherschutzgesetzes):** Wenn Sie Verbraucher in Brasilien sind, können Sie innerhalb von 7 Tagen ab dem Vertragsdatum von einem Kauf zurücktreten und erhalten den vollen Betrag dieser Abbuchung erstattet. Um dieses Recht auszuüben, kontaktieren Sie uns unter {email}.',
        },
        {
          kind: 'p',
          text: 'Außerhalb der 7-tägigen Widerrufsfrist werden bereits erfolgte Abbuchungen nicht erstattet, und eine Kündigung führt nicht zu einer anteiligen Erstattung des laufenden Zeitraums. Schlägt eine Verlängerungszahlung fehl, können kostenpflichtige Funktionen ausgesetzt werden und das Konto kann in den kostenlosen Plan zurückfallen.',
        },
        {
          kind: 'p',
          text: 'Wir können Preise oder Funktionen der Pläne ändern. Wesentliche Änderungen kündigen wir im Voraus an, und sie gelten erst ab der nächsten Verlängerung; Sie können vorher kündigen, wenn Sie nicht einverstanden sind.',
        },
      ],
    },
    {
      title: '3. Konto und Registrierung',
      blocks: [
        {
          kind: 'p',
          text: 'Sie können den Dienst als Gast nutzen, ohne ein Konto zu erstellen. Um Ihre Listen geräteübergreifend zu behalten, können Sie ein Konto mit E-Mail und Passwort erstellen oder sich mit Ihrem Google-Konto anmelden. Wenn Sie ein Konto erstellen, gilt:',
        },
        {
          kind: 'list',
          items: [
            'Sie verpflichten sich, wahrheitsgemäße Angaben zu machen und diese aktuell zu halten;',
            'Sie sind dafür verantwortlich, Ihre Zugangsdaten vertraulich zu behandeln;',
            'Sie übernehmen die Verantwortung für die Aktivitäten, die über Ihr Konto erfolgen;',
            'Sie müssen uns jeden Verdacht auf unbefugten Zugriff unter {email} melden.',
          ],
        },
      ],
    },
    {
      title: '4. Zulässige Nutzung',
      blocks: [
        {
          kind: 'p',
          text: 'Sie verpflichten sich, die Plattform ausschließlich für rechtmäßige Zwecke und im Einklang mit geltendem Recht zu nutzen. Ausdrücklich verboten ist:',
        },
        {
          kind: 'list',
          items: [
            'die Nutzung der Plattform für illegale, betrügerische oder schädliche Zwecke;',
            'der unbefugte Zugriff auf Daten oder Konten anderer Nutzer;',
            'die Übertragung von Viren, Malware oder sonstigem Schadcode;',
            'Reverse Engineering, Dekompilieren oder Disassemblieren eines Teils der Plattform;',
            'der Einsatz von Bots, automatisierten Skripten oder Data Scraping ohne ausdrückliche Genehmigung oder in einer Weise, die die Infrastruktur des Dienstes überlastet.',
          ],
        },
      ],
    },
    {
      title: '5. Ihre Inhalte',
      blocks: [
        {
          kind: 'p',
          text: 'Die Listen, Aufgaben, Notizen und sonstigen Inhalte, die Sie erstellen, bleiben Ihr Eigentum. Sie gewähren uns lediglich die eingeschränkte Lizenz, die erforderlich ist, um diese Inhalte zu speichern, zu verarbeiten und anzuzeigen, damit wir den Dienst für Sie und für die Personen, mit denen Sie Ihre Listen teilen, betreiben können.',
        },
        {
          kind: 'p',
          text: 'Sie sind allein verantwortlich für die Inhalte, die Sie der Plattform hinzufügen, und dafür, dass Sie die erforderlichen Rechte daran besitzen.',
        },
      ],
    },
    {
      title: '6. KI-Generierung',
      blocks: [
        {
          kind: 'p',
          text: 'Die Funktion zur Listenerstellung mit KI sendet den von Ihnen eingegebenen Text an einen Anbieter von Sprachmodellen, ausschließlich um einen bearbeitbaren Listenentwurf zu erstellen. Das Ergebnis ist ein automatisierter Vorschlag und kann Ungenauigkeiten oder Lücken enthalten.',
        },
        {
          kind: 'p',
          text: 'Generierte Inhalte stellen keine fachliche, rechtliche, medizinische oder finanzielle Beratung dar. Prüfen Sie den Entwurf immer, bevor Sie ihn verwenden.',
        },
        {
          kind: 'p',
          text: 'Lifedeck bietet außerdem einen optionalen KI-Assistenten über WhatsApp an, der Ihre Aufgaben, Listen und Ihren Kalender in Ihrem Namen lesen und bearbeiten kann. Nachrichten, die Sie an den Assistenten senden, einschließlich Audio und Bildern, werden von KI-Anbietern verarbeitet, um Antworten zu erzeugen. Die KI-Nutzung unterliegt planabhängigen Limits.',
        },
      ],
    },
    {
      title: '7. Geistiges Eigentum',
      blocks: [
        {
          kind: 'p',
          text: 'Alle Inhalte der Plattform (einschließlich Quellcode, Design, Logos, Marken, Texte, Funktionen und Oberflächen) sind ausschließliches Eigentum von Lifedeck oder seinen Lizenzgebern und durch das geltende Recht zum Schutz des geistigen Eigentums geschützt.',
        },
        {
          kind: 'p',
          text: 'Diese Bedingungen gewähren Ihnen keine Eigentumsrechte an den immateriellen Gütern des Dienstes. Die Vervielfältigung, Verbreitung oder Erstellung abgeleiteter Werke ohne vorherige, ausdrückliche Genehmigung ist untersagt.',
        },
      ],
    },
    {
      title: '8. Daten und Datenschutz',
      blocks: [
        {
          kind: 'p',
          text: 'Die Verarbeitung Ihrer personenbezogenen Daten richtet sich nach unserer [Datenschutzerklärung](/privacy), die im Einklang mit dem brasilianischen Allgemeinen Datenschutzgesetz (LGPD, Gesetz Nr. 13.709/2018) erstellt wurde. Durch die Nutzung des Dienstes bestätigen Sie, dass Sie sie gelesen und akzeptiert haben.',
        },
      ],
    },
    {
      title: '9. Verfügbarkeit des Dienstes',
      blocks: [
        {
          kind: 'p',
          text: 'Wir unternehmen angemessene Anstrengungen, um den Dienst verfügbar zu halten, garantieren jedoch keine unterbrechungsfreie Verfügbarkeit. Der Dienst kann wegen Wartung, Updates oder aus technischen Gründen vorübergehend ausgesetzt werden, falls erforderlich auch ohne vorherige Ankündigung.',
        },
        {
          kind: 'p',
          text: 'Da sich der Dienst in Entwicklung befindet, können sich Funktionen jederzeit ändern.',
        },
      ],
    },
    {
      title: '10. Haftungsbeschränkung',
      blocks: [
        {
          kind: 'p',
          text: 'Soweit nach geltendem Recht zulässig, haftet Lifedeck nicht für indirekte, beiläufige, besondere, Folge- oder Strafschäden, die sich aus der Nutzung oder der Unmöglichkeit der Nutzung des Dienstes ergeben, einschließlich, ohne Einschränkung, Datenverlust oder Unterbrechung von Tätigkeiten.',
        },
      ],
    },
    {
      title: '11. Beendigung des Kontos',
      blocks: [
        {
          kind: 'p',
          text: 'Sie können Ihr Konto jederzeit direkt auf der Plattform unter **Konto → Konto löschen** schließen; dabei werden Ihr Konto und Ihre Listen dauerhaft entfernt. Vorher können Sie unter **Konto → Meine Daten exportieren** eine Kopie Ihrer Daten exportieren.',
        },
        {
          kind: 'p',
          text: 'Wir behalten uns das Recht vor, Konten zu sperren oder zu kündigen, die gegen diese Bedingungen verstoßen, sich in einer für die Plattform oder andere Nutzer schädlichen Weise verhalten, oder auf Anordnung einer zuständigen Behörde.',
        },
      ],
    },
    {
      title: '12. Änderungen der Bedingungen',
      blocks: [
        {
          kind: 'p',
          text: 'Wir können diese Bedingungen von Zeit zu Zeit aktualisieren. Bei wesentlichen Änderungen informieren wir die Nutzer per E-Mail oder durch einen Hinweis auf der Plattform mit angemessener Vorlaufzeit. Die weitere Nutzung des Dienstes nach Veröffentlichung der Änderungen gilt als Zustimmung zu den neuen Bedingungen.',
        },
      ],
    },
    {
      title: '13. Anwendbares Recht und Gerichtsstand',
      blocks: [
        {
          kind: 'p',
          text: 'Diese Bedingungen unterliegen dem Recht der Föderativen Republik Brasilien. Für alle Streitigkeiten aus diesem Vertrag wird der Gerichtsstand São Paulo/SP vereinbart, sofern gesetzlich nichts anderes vorgeschrieben ist.',
        },
      ],
    },
    {
      title: '14. Kontakt',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck wird betrieben von **{company}**, eingetragen unter CNPJ Nr. {cnpj}. Fragen, Anregungen oder Anliegen zu diesen Bedingungen richten Sie bitte an: {email}.',
        },
      ],
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Datenschutzerklärung',
  intro:
    'Diese Erklärung beschreibt, wie Lifedeck Ihre personenbezogenen Daten erhebt, verwendet, speichert und schützt, im Einklang mit dem brasilianischen Allgemeinen Datenschutzgesetz (LGPD, Gesetz Nr. 13.709/2018) und anderen anwendbaren Vorschriften.',
  sections: [
    {
      title: '1. Wer wir sind',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck wird betrieben von **{company}**, eingetragen unter CNPJ Nr. {cnpj}. Im Sinne dieser Erklärung handeln wir nach dem LGPD als **Verantwortlicher** für die im Dienst verarbeiteten personenbezogenen Daten.',
        },
        {
          kind: 'p',
          text: 'Datenschutzbeauftragter (DPO) und Kontaktkanal: {email}.',
        },
        {
          kind: 'p',
          text: 'Wenn Sie eine Buchungsseite veröffentlichen, werden die Daten, die Ihre Kunden bei der Buchung eingeben (Name, E-Mail, Telefon, Notiz und die gebuchten Zeiten), in Ihrem Auftrag verarbeitet. Für diese Daten **sind Sie der Verantwortliche** und Lifedeck handelt nach dem LGPD als **Operator** (Auftragsverarbeiter): Wir verwenden sie nur, um Ihre Buchungen abzuwickeln, die Bestätigungen, Erinnerungen und Änderungen per E-Mail zu versenden, und speichern sie, solange Ihr Konto besteht. Sie beantworten die Anfragen Ihrer Kunden zu deren Daten, und wir unterstützen Sie dabei. Wenn Sie Ihr Konto löschen, werden auch Ihre Kunden und Buchungen gelöscht.',
        },
      ],
    },
    {
      title: '2. Welche Daten wir erheben',
      blocks: [
        {
          kind: 'p',
          text: 'Wir erheben die folgenden Kategorien personenbezogener Daten:',
        },
        {
          kind: 'list',
          items: [
            '**Kontodaten:** Anzeigename und, wenn Sie ein Konto erstellen, E-Mail-Adresse;',
            '**Daten aus der Google-Anmeldung:** Wenn Sie sich mit Google anmelden, erhalten wir Ihre E-Mail-Adresse, Ihren Namen und den Status der E-Mail-Bestätigung. Wir haben niemals Zugriff auf Ihr Google-Passwort;',
            '**Nutzerinhalte:** die Listen, Aufgaben, Notizen und Freigaben, die Sie auf der Plattform erstellen;',
            '**WhatsApp-Daten:** Ihre WhatsApp-Telefonnummer und der Inhalt der Nachrichten, die Sie an den Assistenten senden (Text, Audio, Bilder), wenn Sie WhatsApp verknüpfen;',
            '**Kalenderdaten:** Ihre Kalendertermine und Verbindungsdaten, wenn Sie Google Calendar verbinden;',
            '**Buchungsdaten:** Ihre Buchungsseite, Leistungen und Zeiten sowie die Kunden und Buchungen, die darüber eingehen (siehe Abschnitt 1 dazu, wer für Kundendaten verantwortlich ist);',
            '**Abonnementdaten:** Ihr Plan sowie der Status von Abonnement und Zahlung (wir speichern niemals Kartennummern);',
            '**Nutzungsdaten:** Zugriffsprotokolle, genutzte Funktionen und Aktivitätsprotokolle;',
            '**Technische Daten:** IP-Adresse, Browsertyp, Betriebssystem und Sitzungscookies.',
          ],
        },
        {
          kind: 'p',
          text: 'Wir erheben keine sensiblen personenbezogenen Daten (im Sinne des LGPD) und keine Daten von Minderjährigen unter 18 Jahren.',
        },
      ],
    },
    {
      title: '3. Zweck der Verarbeitung',
      blocks: [
        {
          kind: 'p',
          text: 'Wir verwenden Ihre personenbezogenen Daten, um:',
        },
        {
          kind: 'list',
          items: [
            'den Dienst bereitzustellen, zu betreiben und kontinuierlich zu verbessern;',
            'Konten zu authentifizieren, den Zugriff darauf zu steuern und sie abzusichern;',
            'Abonnements und Zahlungen für die kostenpflichtigen Pläne abzuwickeln;',
            'wesentliche Mitteilungen zum Dienst zu senden, etwa den Code zur E-Mail-Bestätigung, Einladungen und Benachrichtigungen zu Listen;',
            'gesetzliche und regulatorische Pflichten zu erfüllen;',
            'Betrug zu verhindern und die Integrität der Plattform sicherzustellen.',
          ],
        },
      ],
    },
    {
      title: '4. Rechtsgrundlage (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'Die Verarbeitung personenbezogener Daten stützt sich auf die folgenden im LGPD festgelegten Rechtsgrundlagen:',
        },
        {
          kind: 'list',
          items: [
            '**Vertragserfüllung (Art. 7, V):** zur Bereitstellung des Dienstes und Verwaltung der Abonnements;',
            '**Berechtigtes Interesse (Art. 7, IX):** für Sicherheit, Betrugsprävention und Verbesserung des Dienstes;',
            '**Einwilligung (Art. 7, I):** für bestimmte Verarbeitungen, soweit zutreffend;',
            '**Erfüllung einer rechtlichen Verpflichtung (Art. 7, II):** wenn gesetzlich oder von einer zuständigen Behörde vorgeschrieben.',
          ],
        },
      ],
    },
    {
      title: '5. Weitergabe und Unterauftragsverarbeiter',
      blocks: [
        {
          kind: 'p',
          text: 'Wir verkaufen, vermieten oder handeln nicht mit Ihren personenbezogenen Daten. Für den Betrieb des Dienstes setzen wir Anbieter ein, die als Auftragsverarbeiter tätig sind, nur im unbedingt erforderlichen Umfang und unter vertraglichen Datenschutzpflichten:',
        },
        {
          kind: 'list',
          items: [
            '**Vercel:** Hosting der Anwendung und Web-Infrastruktur;',
            '**Neon:** verwaltete Datenbank, in der Ihre Inhalte gespeichert werden;',
            '**Upstash:** Begrenzung der Anfragerate und kurzlebiger Kontext von Assistenten-Unterhaltungen;',
            '**Resend:** Versand transaktionaler E-Mails (Bestätigung, Einladungen und Benachrichtigungen);',
            '**Google (OAuth):** optionale Anmeldung mit einem Google-Konto;',
            '**Google (Calendar API):** Kalendersynchronisierung, wenn Sie sie aktivieren;',
            '**Meta (WhatsApp Cloud API):** Zustellung der Nachrichten des Assistenten, wenn Sie WhatsApp verknüpfen;',
            '**KI-Anbieter (Google Gemini, über Vercel AI Gateway):** Erstellung von KI-Listenentwürfen und Verarbeitung von Nachrichten an den Assistenten (Text, Audio, Bilder);',
            '**Stripe und Asaas:** Abwicklung von Abonnementzahlungen;',
            '**Sentry:** Fehlerüberwachung zur Diagnose und Stabilität der Plattform;',
            '**Behörden:** wenn gesetzlich, durch gerichtliche Anordnung oder auf Ersuchen einer zuständigen Stelle vorgeschrieben.',
          ],
        },
        {
          kind: 'p',
          text: 'Die Nutzung und Übertragung von Informationen, die Lifedeck über Google APIs erhält, entspricht der Google API Services User Data Policy, einschließlich ihrer Limited-Use-Anforderungen. Über Google Calendar erhaltene Informationen werden nur verwendet, um die von Ihnen aktivierten Funktionen zur Kalendersynchronisierung bereitzustellen, werden niemals verkauft und niemals für Werbung oder zum Training allgemeiner KI-Modelle verwendet.',
        },
      ],
    },
    {
      title: '6. Internationale Datenübermittlung',
      blocks: [
        {
          kind: 'p',
          text: 'Einige der oben genannten Anbieter verarbeiten Daten auf Servern außerhalb Brasiliens, unter anderem in den Vereinigten Staaten. Wenn wir personenbezogene Daten international übermitteln, tun wir dies unter den vom LGPD (Art. 33) geforderten Garantien und setzen auf Anbieter, die ein angemessenes Datenschutzniveau und vertragliche Garantien bieten.',
        },
      ],
    },
    {
      title: '7. KI-Generierung',
      blocks: [
        {
          kind: 'p',
          text: 'Wenn Sie die Listenerstellung mit KI nutzen, wird der von Ihnen eingegebene Text ausschließlich an den Anbieter des Sprachmodells gesendet, um die Antwort auf die aktuelle Anfrage zu erzeugen. Der beauftragte Anbieter sichert vertraglich zu, dass er **die Inhalte nicht zum Training von Modellen verwendet**.',
        },
        {
          kind: 'p',
          text: 'Wir empfehlen, in den Beschreibungsfeldern der KI-Generierung keine sensiblen oder vertraulichen personenbezogenen Daten einzugeben.',
        },
        {
          kind: 'p',
          text: 'Audio und Bilder, die an den WhatsApp-Assistenten gesendet werden, werden von KI-Anbietern ausschließlich zur Erfüllung Ihrer Anfrage transkribiert oder analysiert. Der Kontext der Unterhaltung wird kurzzeitig gespeichert, damit die Antworten stimmig bleiben, und kann zusammen mit Ihrem Konto gelöscht werden.',
        },
      ],
    },
    {
      title: '8. Speicherung und Sicherheit',
      blocks: [
        {
          kind: 'p',
          text: 'Wir treffen geeignete technische und organisatorische Maßnahmen zum Schutz Ihrer Informationen, darunter:',
        },
        {
          kind: 'list',
          items: [
            'Verschlüsselung bei der Übertragung (TLS);',
            'Passwörter, die mit einem starken Hash-Algorithmus (Argon2id) gespeichert werden, niemals im Klartext;',
            'Verschlüsselung sensibler Zugangsdaten im Ruhezustand, etwa von Zugriffstoken für Kalender;',
            'Rollenbasierte Zugriffskontrolle und das Prinzip der minimalen Rechte;',
            'Sicherheits-Header und eine Content Security Policy (CSP).',
          ],
        },
        {
          kind: 'p',
          text: 'Keine Methode der Übertragung oder Speicherung ist zu 100 % sicher. Wir bemühen uns fortlaufend, Ihre Daten zu schützen, können jedoch keine absolute Sicherheit garantieren.',
        },
      ],
    },
    {
      title: '9. Ihre Rechte (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'Als betroffene Person können Sie das Bestehen einer Verarbeitung bestätigen lassen, auf Ihre Daten zugreifen, sie berichtigen, ihre Anonymisierung oder Löschung verlangen, Ihre Einwilligung widerrufen und die Übertragbarkeit Ihrer Daten verlangen.',
        },
        {
          kind: 'p',
          text: 'Für Auskunft und Übertragbarkeit können Sie direkt unter **Konto → Meine Daten exportieren** eine vollständige Kopie erstellen (JSON-Format). Für die Löschung nutzen Sie **Konto → Konto löschen**; dabei werden Ihr Konto und Ihre Listen dauerhaft entfernt.',
        },
        {
          kind: 'p',
          text: 'Für die übrigen Rechte, oder wenn die Selbstbedienung nicht ausreicht, kontaktieren Sie uns unter {email}. Wir antworten innerhalb der gesetzlichen Frist.',
        },
      ],
    },
    {
      title: '10. Speicherdauer',
      blocks: [
        {
          kind: 'p',
          text: 'Wir speichern Ihre personenbezogenen Daten, solange Ihr Konto aktiv ist oder für den Zeitraum, der zur Erfüllung der in dieser Erklärung beschriebenen Zwecke erforderlich ist. Nach Schließung Ihres Kontos werden Ihre Daten gelöscht, mit Ausnahme einer etwaigen Mindestfrist, die das geltende Recht vorschreibt, etwa für Abrechnungsunterlagen, die zur Erfüllung steuerlicher und buchhalterischer Pflichten aufbewahrt werden.',
        },
      ],
    },
    {
      title: '11. Cookies',
      blocks: [
        {
          kind: 'p',
          text: 'Wir verwenden nur essenzielle Cookies für die Authentifizierung, die Aufrechterhaltung der Sitzung und die grundlegende Funktion des Dienstes. Wir verwenden keine Tracking-Cookies von Drittanbietern für Werbung oder verhaltensbasierte Profilbildung.',
        },
      ],
    },
    {
      title: '12. Minderjährige',
      blocks: [
        {
          kind: 'p',
          text: 'Der Dienst richtet sich an Personen ab 18 Jahren. Wir erheben nicht wissentlich Daten von Minderjährigen. Stellen wir fest, dass Daten einer minderjährigen Person versehentlich erhoben wurden, ergreifen wir die erforderlichen Maßnahmen, um sie zu löschen.',
        },
      ],
    },
    {
      title: '13. Aktualisierungen dieser Erklärung',
      blocks: [
        {
          kind: 'p',
          text: 'Wir können diese Erklärung regelmäßig aktualisieren, um Änderungen unserer Praktiken oder des geltenden Rechts widerzuspiegeln. Über wesentliche Änderungen informieren wir Sie per E-Mail oder durch einen Hinweis auf der Plattform, und das Datum „Zuletzt aktualisiert“ oben wird angepasst.',
        },
      ],
    },
    {
      title: '14. Kontakt / DPO',
      blocks: [
        {
          kind: 'p',
          text: 'Bei Fragen, Anfragen betroffener Personen oder zur Ausübung Ihrer Rechte nach dem LGPD kontaktieren Sie uns: {email}.',
        },
        {
          kind: 'p',
          text: 'Sie haben außerdem das Recht, sich an die brasilianische Nationale Datenschutzbehörde (ANPD) zu wenden, wenn Sie der Ansicht sind, dass Ihre Rechte nicht angemessen berücksichtigt wurden.',
        },
      ],
    },
  ],
}

const deleteAccount: LegalDocument = {
  title: 'Ihr Konto löschen',
  intro:
    'Auf dieser Seite wird erklärt, wie Sie Ihr Konto bei Lifedeck, einer App von GBS Tecnologia da Informação Ltda, löschen und was mit Ihren Daten geschieht. Die Löschung erfolgt sofort und kann nicht rückgängig gemacht werden.',
  sections: [
    {
      title: 'In der App oder im Web',
      blocks: [
        {
          kind: 'list',
          items: [
            'In der iPhone- oder Android-App: Öffnen Sie **Einstellungen → Konto → Konto löschen** und bestätigen Sie.',
            'Im Web: Melden Sie sich auf lifedeck.com.br an, öffnen Sie **Einstellungen → Konto → Konto löschen** und bestätigen Sie.',
            'Vorher können Sie unter **Einstellungen → Konto → Meine Daten exportieren** eine Kopie herunterladen.',
          ],
        },
      ],
    },
    {
      title: 'Ohne Zugriff auf das Konto',
      blocks: [
        {
          kind: 'p',
          text: 'Schreiben Sie von der E-Mail-Adresse des Kontos an {email} und bitten Sie um Löschung. Wir prüfen, dass die Anfrage von Ihnen stammt, löschen das Konto und antworten innerhalb der gesetzlichen Frist.',
        },
      ],
    },
    {
      title: 'Was gelöscht wird',
      blocks: [
        {
          kind: 'list',
          items: [
            'Profil, Name, E-Mail-Adresse, Foto und Einstellungen.',
            'Listen, Aufgaben, Gewohnheiten, wiederkehrende Aufgaben, Kalendertermine und Kalenderverbindungen.',
            'Buchungsseite, Leistungen, Kunden und Buchungen.',
            'Verlauf der Unterhaltungen mit dem Assistenten, verknüpfte WhatsApp-Nummern, Geräte für Benachrichtigungen und API-Schlüssel.',
            'Abonnement: Wir kündigen die wiederkehrende Abbuchung beim Zahlungsdienstleister, bevor wir das Konto löschen.',
          ],
        },
      ],
    },
    {
      title: 'Was erhalten bleibt',
      blocks: [
        {
          kind: 'list',
          items: [
            'Abrechnungsunterlagen, die das Steuer- und Buchhaltungsrecht vorschreibt, für die gesetzliche Frist.',
            'Listen anderer Personen, an denen Sie beteiligt waren, bleiben deren Eigentum; Sie werden daraus entfernt.',
          ],
        },
      ],
    },
  ],
}

export const deLegal = { terms, privacy, deleteAccount }
