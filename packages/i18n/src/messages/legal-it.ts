import type { LegalDocument } from '@/messages/types'

const terms: LegalDocument = {
  title: 'Termini di utilizzo',
  intro:
    'Accedendo a Lifedeck (la “Piattaforma”, il “Servizio”) o utilizzandolo, confermi di aver letto, compreso e accettato i presenti Termini di utilizzo. Se non sei d’accordo con una qualsiasi parte, non utilizzare il Servizio.',
  sections: [
    {
      title: '1. Il Servizio',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck è un’app di organizzazione personale che ti permette di creare liste e attività, organizzare la tua routine quotidiana, condividere liste con altre persone, generare liste con l’aiuto dell’intelligenza artificiale e monitorare i tuoi progressi.',
        },
        {
          kind: 'p',
          text: 'La Piattaforma è in continuo sviluppo. Funzionalità, limiti e condizioni d’uso possono essere aggiunti, modificati o rimossi nel tempo.',
        },
        {
          kind: 'p',
          text: 'Lifedeck offre piani a pagamento facoltativi (Pro e Premium). Le funzionalità a pagamento includono la sincronizzazione con Google Calendar, i promemoria e l’assistente su WhatsApp. Le condizioni che regolano questi abbonamenti sono descritte nella sezione 2.',
        },
      ],
    },
    {
      title: '2. Pagamenti e abbonamenti',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck offre piani a pagamento facoltativi (Pro e Premium), fatturati mensilmente o annualmente. I prezzi in vigore sono mostrati nell’app prima che tu confermi un acquisto e possono includere le imposte applicabili.',
        },
        {
          kind: 'p',
          text: 'Gli abbonamenti si rinnovano automaticamente alla fine di ogni ciclo di fatturazione, per lo stesso periodo, finché non li annulli. I pagamenti sono elaborati dai nostri fornitori di pagamento, Stripe (internazionale) e Asaas (Brasile); non conserviamo il numero della tua carta.',
        },
        {
          kind: 'p',
          text: 'Puoi annullare in qualsiasi momento in **Account → Fatturazione**. L’annullamento blocca l’addebito successivo; il tuo accesso a pagamento continua fino alla fine del periodo già pagato e dopo non viene rinnovato.',
        },
        {
          kind: 'p',
          text: '**Diritto di recesso (art. 49 del Codice brasiliano di tutela del consumatore):** se sei un consumatore in Brasile, puoi recedere da un acquisto entro 7 giorni dalla data della sottoscrizione e ricevere il rimborso integrale di quell’addebito. Per esercitare questo diritto, contattaci all’indirizzo {email}.',
        },
        {
          kind: 'p',
          text: 'Al di fuori del periodo di recesso di 7 giorni, gli addebiti già effettuati non sono rimborsabili e l’annullamento non dà luogo al rimborso proporzionale del periodo in corso. Se il pagamento di un rinnovo non va a buon fine, le funzionalità a pagamento possono essere sospese e l’account può tornare al piano gratuito.',
        },
        {
          kind: 'p',
          text: 'Possiamo modificare i prezzi o le funzionalità dei piani. Annunceremo in anticipo le modifiche rilevanti, che si applicano solo a partire dal rinnovo successivo; puoi annullare prima se non sei d’accordo.',
        },
      ],
    },
    {
      title: '3. Account e registrazione',
      blocks: [
        {
          kind: 'p',
          text: 'Puoi iniziare a usare il Servizio come ospite, senza creare un account. Per conservare le tue liste su più dispositivi, puoi creare un account con email e password o accedere con il tuo account Google. Quando crei un account:',
        },
        {
          kind: 'list',
          items: [
            'Ti impegni a fornire informazioni veritiere e a mantenerle aggiornate;',
            'Sei responsabile di mantenere riservate le tue credenziali di accesso;',
            'Ti assumi la responsabilità delle attività svolte tramite il tuo account;',
            'Devi segnalarci qualsiasi sospetto di accesso non autorizzato, all’indirizzo {email}.',
          ],
        },
      ],
    },
    {
      title: '4. Uso consentito',
      blocks: [
        {
          kind: 'p',
          text: 'Ti impegni a utilizzare la Piattaforma esclusivamente per scopi legittimi e nel rispetto della legge applicabile. È espressamente vietato:',
        },
        {
          kind: 'list',
          items: [
            'Utilizzare la Piattaforma per scopi illeciti, fraudolenti o dannosi;',
            'Accedere ai dati o agli account di altri utenti senza autorizzazione;',
            'Trasmettere virus, malware o qualsiasi codice dannoso;',
            'Effettuare reverse engineering, decompilare o disassemblare qualsiasi parte della Piattaforma;',
            'Utilizzare bot, script automatizzati o scraping di dati senza autorizzazione espressa, o in modo da sovraccaricare l’infrastruttura del Servizio.',
          ],
        },
      ],
    },
    {
      title: '5. I tuoi contenuti',
      blocks: [
        {
          kind: 'p',
          text: 'Le liste, le attività, le note e gli altri contenuti che crei restano tuoi. Ci concedi solo la licenza limitata necessaria per archiviare, elaborare e mostrare tali contenuti al fine di far funzionare il Servizio per te e per le persone con cui condividi le tue liste.',
        },
        {
          kind: 'p',
          text: 'Sei l’unico responsabile dei contenuti che aggiungi alla Piattaforma e di assicurarti di detenere i diritti necessari su di essi.',
        },
      ],
    },
    {
      title: '6. Generazione con IA',
      blocks: [
        {
          kind: 'p',
          text: 'La funzionalità di generazione di liste con IA invia il testo che fornisci a un fornitore di modelli linguistici, al solo scopo di generare una bozza di lista modificabile. Il risultato è un suggerimento automatico e può contenere imprecisioni od omissioni.',
        },
        {
          kind: 'p',
          text: 'I contenuti generati non costituiscono consulenza professionale, legale, medica o finanziaria. Rivedi sempre la bozza prima di utilizzarla.',
        },
        {
          kind: 'p',
          text: 'Lifedeck offre anche un assistente IA facoltativo su WhatsApp che può leggere e agire sulle tue attività, liste e calendario per tuo conto. I messaggi che invii all’assistente, inclusi audio e immagini, sono elaborati da fornitori di IA per produrre le risposte. L’uso dell’IA è soggetto a limiti per piano.',
        },
      ],
    },
    {
      title: '7. Proprietà intellettuale',
      blocks: [
        {
          kind: 'p',
          text: 'Tutti i contenuti della Piattaforma (inclusi codice sorgente, design, loghi, marchi, testi, funzionalità e interfacce) sono di proprietà esclusiva di Lifedeck o dei suoi licenzianti, tutelati dalla legge applicabile in materia di proprietà intellettuale.',
        },
        {
          kind: 'p',
          text: 'I presenti Termini non ti conferiscono alcun diritto di proprietà sui beni intellettuali del Servizio. È vietato riprodurre, distribuire o creare opere derivate senza autorizzazione preventiva ed espressa.',
        },
      ],
    },
    {
      title: '8. Dati e privacy',
      blocks: [
        {
          kind: 'p',
          text: 'Il trattamento dei tuoi dati personali è disciplinato dalla nostra [Informativa sulla privacy](/privacy), redatta in conformità alla Legge generale brasiliana sulla protezione dei dati (LGPD, Legge n. 13.709/2018). Utilizzando il Servizio, confermi di averla letta e accettata.',
        },
      ],
    },
    {
      title: '9. Disponibilità del Servizio',
      blocks: [
        {
          kind: 'p',
          text: 'Ci impegniamo in modo ragionevole per mantenere il Servizio disponibile, ma non garantiamo una disponibilità ininterrotta. Il Servizio può essere sospeso temporaneamente per manutenzione, aggiornamenti o motivi tecnici, senza preavviso quando necessario.',
        },
        {
          kind: 'p',
          text: 'Essendo in fase di sviluppo, le funzionalità possono cambiare in qualsiasi momento.',
        },
      ],
    },
    {
      title: '10. Limitazione di responsabilità',
      blocks: [
        {
          kind: 'p',
          text: 'Nella misura massima consentita dalla legge applicabile, Lifedeck non è responsabile per danni indiretti, incidentali, speciali, consequenziali o punitivi derivanti dall’uso o dall’impossibilità di usare il Servizio, inclusi, a titolo esemplificativo, la perdita di dati o l’interruzione delle attività.',
        },
      ],
    },
    {
      title: '11. Chiusura dell’account',
      blocks: [
        {
          kind: 'p',
          text: 'Puoi chiudere il tuo account in qualsiasi momento direttamente sulla Piattaforma, in **Account → Elimina account**, che rimuove definitivamente il tuo account e le tue liste. Prima di farlo, puoi esportare una copia dei tuoi dati in **Account → Esporta i miei dati**.',
        },
        {
          kind: 'p',
          text: 'Ci riserviamo il diritto di sospendere o chiudere gli account che violano i presenti Termini, che tengono comportamenti dannosi per la Piattaforma o per altri utenti, o su ordine di un’autorità competente.',
        },
      ],
    },
    {
      title: '12. Modifiche ai Termini',
      blocks: [
        {
          kind: 'p',
          text: 'Possiamo aggiornare periodicamente i presenti Termini. In caso di modifiche rilevanti, informeremo gli utenti via email o tramite un avviso sulla Piattaforma, con un preavviso ragionevole. L’uso continuato del Servizio dopo la pubblicazione delle modifiche costituisce accettazione dei nuovi termini.',
        },
      ],
    },
    {
      title: '13. Legge applicabile e foro competente',
      blocks: [
        {
          kind: 'p',
          text: 'I presenti Termini sono regolati dalle leggi della Repubblica Federativa del Brasile. Per la risoluzione di eventuali controversie derivanti dal presente strumento è eletto il foro del distretto di São Paulo/SP, salvo diversa disposizione di legge.',
        },
      ],
    },
    {
      title: '14. Contatti',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck è gestita da **{company}**, iscritta con CNPJ n. {cnpj}. Domande, suggerimenti o richieste relativi ai presenti Termini vanno inviati a: {email}.',
        },
      ],
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Informativa sulla privacy',
  intro:
    'La presente Informativa descrive come Lifedeck raccoglie, utilizza, conserva e protegge le tue informazioni personali, in conformità alla Legge generale brasiliana sulla protezione dei dati (LGPD, Legge n. 13.709/2018) e alle altre norme applicabili.',
  sections: [
    {
      title: '1. Chi siamo',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck è gestita da **{company}**, iscritta con CNPJ n. {cnpj}. Ai fini della presente Informativa, agiamo in qualità di **titolare del trattamento** dei dati personali trattati nel Servizio, ai sensi della LGPD.',
        },
        {
          kind: 'p',
          text: 'Responsabile della protezione dei dati (DPO) e canale di contatto: {email}.',
        },
        {
          kind: 'p',
          text: 'Quando pubblichi una pagina di prenotazione, i dati che i tuoi clienti inseriscono per prenotare con te (nome, email, telefono, nota e gli orari prenotati) sono trattati per tuo conto. Per tali dati **sei tu il titolare del trattamento** e Lifedeck agisce come **operatore** (responsabile del trattamento) ai sensi della LGPD: li utilizziamo solo per gestire le tue prenotazioni, inviare via email le conferme, i promemoria e le modifiche, e li conserviamo finché esiste il tuo account. Sei tu a rispondere alle richieste dei tuoi clienti sui loro dati, e noi ti aiutiamo a farlo. L’eliminazione del tuo account elimina anche i tuoi clienti e le tue prenotazioni.',
        },
      ],
    },
    {
      title: '2. Dati che raccogliamo',
      blocks: [
        {
          kind: 'p',
          text: 'Raccogliamo le seguenti categorie di dati personali:',
        },
        {
          kind: 'list',
          items: [
            '**Dati dell’account:** nome visualizzato e, quando crei un account, indirizzo email;',
            '**Dati di accesso con Google:** se scegli di accedere con Google, riceviamo la tua email, il tuo nome e lo stato di verifica dell’email. Non accediamo mai alla tua password di Google;',
            '**Contenuti dell’utente:** le liste, le attività, le note e le condivisioni che crei sulla Piattaforma;',
            '**Dati di WhatsApp:** il tuo numero di telefono WhatsApp e il contenuto dei messaggi che invii all’assistente (testo, audio, immagini), quando colleghi WhatsApp;',
            '**Dati del calendario:** gli eventi del tuo calendario e i dati di collegamento, quando colleghi Google Calendar;',
            '**Dati delle prenotazioni:** la tua pagina di prenotazione, i servizi e gli orari, e i clienti e le prenotazioni che riceve (vedi la sezione 1 su chi è titolare dei dati dei clienti);',
            '**Dati dell’abbonamento:** il tuo piano e lo stato dell’abbonamento e dei pagamenti (non conserviamo mai i numeri delle carte);',
            '**Dati di utilizzo:** registri di accesso, funzionalità utilizzate e log delle attività;',
            '**Dati tecnici:** indirizzo IP, tipo di browser, sistema operativo e cookie di sessione.',
          ],
        },
        {
          kind: 'p',
          text: 'Non raccogliamo dati personali sensibili (come definiti dalla LGPD) né dati di minori di 18 anni.',
        },
      ],
    },
    {
      title: '3. Finalità del trattamento',
      blocks: [
        { kind: 'p', text: 'Utilizziamo i tuoi dati personali per:' },
        {
          kind: 'list',
          items: [
            'Fornire, gestire e migliorare continuamente il Servizio;',
            'Autenticare gli account, controllarne l’accesso e proteggerli;',
            'Elaborare abbonamenti e pagamenti dei piani a pagamento;',
            'Inviare comunicazioni essenziali del Servizio, come il codice di verifica dell’email, gli inviti e le notifiche delle liste;',
            'Adempiere agli obblighi legali e regolamentari;',
            'Prevenire le frodi e garantire l’integrità della Piattaforma.',
          ],
        },
      ],
    },
    {
      title: '4. Base giuridica (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'Il trattamento dei dati personali si fonda sulle seguenti basi giuridiche previste dalla LGPD:',
        },
        {
          kind: 'list',
          items: [
            '**Esecuzione di un contratto (art. 7, V):** per fornire il Servizio e gestire gli abbonamenti;',
            '**Legittimo interesse (art. 7, IX):** per la sicurezza, la prevenzione delle frodi e il miglioramento del Servizio;',
            '**Consenso (art. 7, I):** per trattamenti specifici, ove applicabile;',
            '**Adempimento di un obbligo legale (art. 7, II):** quando richiesto dalla legge o da un’autorità competente.',
          ],
        },
      ],
    },
    {
      title: '5. Condivisione e sub-responsabili',
      blocks: [
        {
          kind: 'p',
          text: 'Non vendiamo, affittiamo né scambiamo i tuoi dati personali. Per gestire il Servizio ci avvaliamo di fornitori che agiscono come responsabili del trattamento, solo nella misura strettamente necessaria e nel rispetto di obblighi contrattuali di protezione dei dati:',
        },
        {
          kind: 'list',
          items: [
            '**Vercel:** hosting dell’applicazione e infrastruttura web;',
            '**Neon:** database gestito in cui sono archiviati i tuoi contenuti;',
            '**Upstash:** limitazione della frequenza delle richieste e contesto di breve durata delle conversazioni con l’assistente;',
            '**Resend:** invio di email transazionali (verifica, inviti e notifiche);',
            '**Google (OAuth):** accesso facoltativo con un account Google;',
            '**Google (Calendar API):** sincronizzazione del calendario, quando la attivi;',
            '**Meta (WhatsApp Cloud API):** recapito dei messaggi dell’assistente, quando colleghi WhatsApp;',
            '**Fornitori di IA (Google Gemini, tramite Vercel AI Gateway):** generazione di bozze di liste con IA ed elaborazione dei messaggi dell’assistente (testo, audio, immagini);',
            '**Stripe e Asaas:** elaborazione dei pagamenti degli abbonamenti;',
            '**Sentry:** monitoraggio degli errori per la diagnostica e la stabilità della Piattaforma;',
            '**Autorità pubbliche:** quando richiesto dalla legge, da un ordine giudiziario o da una richiesta di un organismo competente.',
          ],
        },
        {
          kind: 'p',
          text: 'L’uso e il trasferimento da parte di Lifedeck delle informazioni ricevute dalle API di Google rispettano le Norme sui dati utente dei servizi API di Google (Google API Services User Data Policy), inclusi i requisiti di Uso limitato. Le informazioni ottenute tramite Google Calendar sono utilizzate solo per fornire le funzionalità di sincronizzazione del calendario che attivi, non vengono mai vendute e non vengono mai utilizzate per pubblicità o per addestrare modelli di IA generalizzati.',
        },
      ],
    },
    {
      title: '6. Trasferimento internazionale dei dati',
      blocks: [
        {
          kind: 'p',
          text: 'Alcuni dei fornitori elencati sopra trattano i dati su server situati fuori dal Brasile, anche negli Stati Uniti. Quando trasferiamo dati personali a livello internazionale, lo facciamo con le garanzie richieste dalla LGPD (art. 33), affidandoci a fornitori che offrono un livello adeguato di protezione dei dati e garanzie contrattuali.',
        },
      ],
    },
    {
      title: '7. Generazione con IA',
      blocks: [
        {
          kind: 'p',
          text: 'Quando utilizzi la generazione di liste con IA, il testo che fornisci viene inviato al fornitore del modello linguistico esclusivamente per generare la risposta alla richiesta corrente. Il fornitore incaricato garantisce, per contratto, che **non utilizza i contenuti per addestrare modelli**.',
        },
        {
          kind: 'p',
          text: 'Ti consigliamo di non inserire dati personali sensibili o riservati nei campi di descrizione utilizzati dalla generazione con IA.',
        },
        {
          kind: 'p',
          text: 'Gli audio e le immagini inviati all’assistente su WhatsApp sono trascritti o analizzati da fornitori di IA al solo scopo di soddisfare la tua richiesta. Il contesto della conversazione viene conservato per breve tempo per mantenere coerenti le risposte e può essere eliminato insieme al tuo account.',
        },
      ],
    },
    {
      title: '8. Conservazione e sicurezza',
      blocks: [
        {
          kind: 'p',
          text: 'Adottiamo misure tecniche e organizzative adeguate per proteggere le tue informazioni, tra cui:',
        },
        {
          kind: 'list',
          items: [
            'Crittografia in transito (TLS);',
            'Password conservate con un algoritmo di hashing robusto (Argon2id), mai in chiaro;',
            'Crittografia a riposo delle credenziali sensibili, come i token di accesso al calendario;',
            'Controllo degli accessi basato sui ruoli e principio del privilegio minimo;',
            'Header di sicurezza e una Content Security Policy (CSP).',
          ],
        },
        {
          kind: 'p',
          text: 'Nessun metodo di trasmissione o di archiviazione è sicuro al 100%. Ci impegniamo costantemente per proteggere i tuoi dati, ma non possiamo garantire una sicurezza assoluta.',
        },
      ],
    },
    {
      title: '9. I tuoi diritti (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'In qualità di interessato, puoi ottenere conferma dell’esistenza di un trattamento, accedere ai tuoi dati, correggerli, richiederne l’anonimizzazione o la cancellazione, revocare il consenso e richiederne la portabilità.',
        },
        {
          kind: 'p',
          text: 'Per l’accesso e la portabilità, puoi generare una copia completa direttamente in **Account → Esporta i miei dati** (formato JSON). Per la cancellazione, usa **Account → Elimina account**, che rimuove definitivamente il tuo account e le tue liste.',
        },
        {
          kind: 'p',
          text: 'Per gli altri diritti, o se le funzioni self-service non sono sufficienti, contattaci all’indirizzo {email}. Risponderemo entro il termine di legge.',
        },
      ],
    },
    {
      title: '10. Conservazione dei dati',
      blocks: [
        {
          kind: 'p',
          text: 'Conserviamo i tuoi dati personali finché il tuo account è attivo o per il periodo necessario a perseguire le finalità descritte nella presente Informativa. Dopo la chiusura del tuo account, i tuoi dati vengono eliminati, fatto salvo l’eventuale periodo minimo richiesto dalla legge applicabile, come i registri di fatturazione conservati per adempiere agli obblighi fiscali e contabili.',
        },
      ],
    },
    {
      title: '11. Cookie',
      blocks: [
        {
          kind: 'p',
          text: 'Utilizziamo solo cookie essenziali per l’autenticazione, il mantenimento della sessione e il funzionamento di base del Servizio. Non utilizziamo cookie di tracciamento di terze parti per pubblicità o profilazione comportamentale.',
        },
      ],
    },
    {
      title: '12. Minori',
      blocks: [
        {
          kind: 'p',
          text: 'Il Servizio è destinato a persone di almeno 18 anni. Non raccogliamo intenzionalmente dati di minori. Se rileviamo che i dati di un minore sono stati raccolti involontariamente, adotteremo le misure necessarie per eliminarli.',
        },
      ],
    },
    {
      title: '13. Aggiornamenti della presente Informativa',
      blocks: [
        {
          kind: 'p',
          text: 'Possiamo aggiornare periodicamente la presente Informativa per riflettere cambiamenti nelle nostre pratiche o nella legge applicabile. Ti informeremo delle modifiche rilevanti via email o tramite un avviso sulla Piattaforma, e la data di “Ultimo aggiornamento” in alto verrà aggiornata.',
        },
      ],
    },
    {
      title: '14. Contatti / DPO',
      blocks: [
        {
          kind: 'p',
          text: 'Per domande, richieste degli interessati o per esercitare i tuoi diritti ai sensi della LGPD, contattaci: {email}.',
        },
        {
          kind: 'p',
          text: 'Hai inoltre il diritto di presentare un reclamo all’Autorità nazionale brasiliana per la protezione dei dati (ANPD) se ritieni che i tuoi diritti non siano stati adeguatamente tutelati.',
        },
      ],
    },
  ],
}

const deleteAccount: LegalDocument = {
  title: 'Elimina il tuo account',
  intro:
    'Questa pagina spiega come eliminare il tuo account Lifedeck, un’app di GBS Tecnologia da Informação Ltda, e cosa succede ai tuoi dati. L’eliminazione è immediata e non può essere annullata.',
  sections: [
    {
      title: 'Nell’app o sul web',
      blocks: [
        {
          kind: 'list',
          items: [
            'Nell’app per iPhone o Android: apri **Impostazioni → Account → Elimina account** e conferma.',
            'Sul web: accedi su lifedeck.com.br, apri **Impostazioni → Account → Elimina account** e conferma.',
            'Prima di farlo, puoi scaricare una copia in **Impostazioni → Account → Esporta i miei dati**.',
          ],
        },
      ],
    },
    {
      title: 'Senza accesso all’account',
      blocks: [
        {
          kind: 'p',
          text: 'Scrivi a {email} dall’indirizzo email dell’account chiedendo l’eliminazione. Verifichiamo che la richiesta sia tua, eliminiamo l’account e rispondiamo entro il termine di legge.',
        },
      ],
    },
    {
      title: 'Cosa viene eliminato',
      blocks: [
        {
          kind: 'list',
          items: [
            'Profilo, nome, email, foto e preferenze.',
            'Liste, attività, abitudini, attività ricorrenti, eventi del calendario e collegamenti ai calendari.',
            'Pagina di prenotazione, servizi, clienti e prenotazioni.',
            'Cronologia delle conversazioni con l’assistente, numeri WhatsApp collegati, dispositivi per le notifiche e chiavi API.',
            'Abbonamento: annulliamo l’addebito ricorrente presso il fornitore di pagamento prima di eliminare l’account.',
          ],
        },
      ],
    },
    {
      title: 'Cosa viene conservato',
      blocks: [
        {
          kind: 'list',
          items: [
            'I registri di fatturazione richiesti dalla normativa fiscale e contabile, per il periodo previsto dalla legge.',
            'Le liste di proprietà di altre persone di cui facevi parte restano loro; vieni rimosso da esse.',
          ],
        },
      ],
    },
  ],
}

export const itLegal = { terms, privacy, deleteAccount }
