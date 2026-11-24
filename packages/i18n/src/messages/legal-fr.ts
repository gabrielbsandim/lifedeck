import type { LegalDocument } from '@/messages/types'

const terms: LegalDocument = {
  title: 'Conditions d’utilisation',
  intro:
    'En accédant à Lifedeck ou en l’utilisant (la « Plateforme », le « Service »), vous confirmez avoir lu, compris et accepté les présentes Conditions d’utilisation. Si vous n’êtes pas d’accord avec l’une de leurs parties, n’utilisez pas le Service.',
  sections: [
    {
      title: '1. Le Service',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck est une application d’organisation personnelle qui vous permet de créer des listes et des tâches, d’organiser votre routine quotidienne, de partager des listes avec d’autres personnes, de générer des listes avec l’aide de l’intelligence artificielle et de suivre votre propre progression.',
        },
        {
          kind: 'p',
          text: 'La Plateforme est en développement continu. Des fonctionnalités, limites et conditions d’utilisation peuvent être ajoutées, modifiées ou supprimées au fil du temps.',
        },
        {
          kind: 'p',
          text: 'Lifedeck propose des offres payantes facultatives (Pro et Premium). Les fonctionnalités payantes comprennent la synchronisation avec Google Calendar, les rappels et l’assistant WhatsApp. Les conditions qui régissent ces abonnements sont décrites à la section 2.',
        },
      ],
    },
    {
      title: '2. Paiements et abonnements',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck propose des offres payantes facultatives (Pro et Premium), facturées mensuellement ou annuellement. Les prix en vigueur sont affichés dans l’app avant que vous ne confirmiez un achat et peuvent inclure les taxes applicables.',
        },
        {
          kind: 'p',
          text: 'Les abonnements se renouvellent automatiquement à la fin de chaque cycle de facturation, pour la même durée, jusqu’à ce que vous les résiliiez. Les paiements sont traités par nos prestataires de paiement, Stripe (international) et Asaas (Brésil) ; nous ne conservons pas votre numéro de carte.',
        },
        {
          kind: 'p',
          text: 'Vous pouvez résilier à tout moment dans **Compte → Facturation**. La résiliation arrête le prélèvement suivant ; votre accès payant se poursuit jusqu’à la fin de la période déjà payée et n’est pas renouvelé ensuite.',
        },
        {
          kind: 'p',
          text: '**Droit de rétractation (art. 49 du Code brésilien de protection du consommateur) :** si vous êtes un consommateur au Brésil, vous pouvez vous rétracter d’un achat dans un délai de 7 jours à compter de la date de souscription et obtenir le remboursement intégral de ce prélèvement. Pour exercer ce droit, contactez-nous à {email}.',
        },
        {
          kind: 'p',
          text: 'En dehors du délai de rétractation de 7 jours, les montants déjà prélevés ne sont pas remboursables et la résiliation ne donne lieu à aucun remboursement au prorata de la période en cours. Si un paiement de renouvellement échoue, les fonctionnalités payantes peuvent être suspendues et le compte peut repasser à l’offre gratuite.',
        },
        {
          kind: 'p',
          text: 'Nous pouvons modifier les prix ou les fonctionnalités des offres. Nous annoncerons à l’avance les changements importants, qui ne s’appliqueront qu’à partir du renouvellement suivant ; vous pouvez résilier avant si vous n’êtes pas d’accord.',
        },
      ],
    },
    {
      title: '3. Compte et inscription',
      blocks: [
        {
          kind: 'p',
          text: 'Vous pouvez commencer à utiliser le Service en tant qu’invité, sans créer de compte. Pour conserver vos listes sur tous vos appareils, vous pouvez créer un compte avec une adresse e-mail et un mot de passe ou vous connecter avec votre compte Google. Lorsque vous créez un compte, vous :',
        },
        {
          kind: 'list',
          items: [
            'Vous engagez à fournir des informations exactes et à les tenir à jour ;',
            'Êtes responsable de la confidentialité de vos identifiants d’accès ;',
            'Assumez la responsabilité des activités réalisées depuis votre compte ;',
            'Devez nous signaler tout soupçon d’accès non autorisé, à {email}.',
          ],
        },
      ],
    },
    {
      title: '4. Utilisation acceptable',
      blocks: [
        {
          kind: 'p',
          text: 'Vous vous engagez à utiliser la Plateforme uniquement à des fins légitimes et dans le respect de la législation applicable. Sont expressément interdits :',
        },
        {
          kind: 'list',
          items: [
            'Utiliser la Plateforme à des fins illégales, frauduleuses ou nuisibles ;',
            'Accéder aux données ou aux comptes d’autres utilisateurs sans autorisation ;',
            'Transmettre des virus, logiciels malveillants ou tout code malveillant ;',
            'Procéder à l’ingénierie inverse, décompiler ou désassembler toute partie de la Plateforme ;',
            'Utiliser des bots, scripts automatisés ou l’extraction de données (scraping) sans autorisation expresse, ou d’une manière qui surcharge l’infrastructure du Service.',
          ],
        },
      ],
    },
    {
      title: '5. Votre contenu',
      blocks: [
        {
          kind: 'p',
          text: 'Les listes, tâches, notes et autres contenus que vous créez restent les vôtres. Vous nous accordez uniquement la licence limitée nécessaire pour stocker, traiter et afficher ce contenu afin de faire fonctionner le Service pour vous et pour les personnes avec qui vous partagez vos listes.',
        },
        {
          kind: 'p',
          text: 'Vous êtes seul responsable du contenu que vous ajoutez à la Plateforme et de vous assurer que vous détenez les droits nécessaires sur celui-ci.',
        },
      ],
    },
    {
      title: '6. Génération par IA',
      blocks: [
        {
          kind: 'p',
          text: 'La fonctionnalité de génération de listes par IA envoie le texte que vous fournissez à un fournisseur de modèle de langage, dans le seul but de générer un brouillon de liste modifiable. Le résultat est une suggestion automatisée et peut contenir des inexactitudes ou des omissions.',
        },
        {
          kind: 'p',
          text: 'Le contenu généré ne constitue pas un conseil professionnel, juridique, médical ou financier. Relisez toujours le brouillon avant de l’utiliser.',
        },
        {
          kind: 'p',
          text: 'Lifedeck propose également un assistant IA facultatif sur WhatsApp, capable de consulter vos tâches, listes et agenda et d’agir dessus en votre nom. Les messages que vous envoyez à l’assistant, y compris les audios et les images, sont traités par des fournisseurs d’IA afin de produire des réponses. L’utilisation de l’IA est soumise à des limites propres à chaque offre.',
        },
      ],
    },
    {
      title: '7. Propriété intellectuelle',
      blocks: [
        {
          kind: 'p',
          text: 'L’ensemble du contenu de la Plateforme (y compris le code source, le design, les logos, les marques, les textes, les fonctionnalités et les interfaces) est la propriété exclusive de Lifedeck ou de ses concédants de licence, et est protégé par la législation applicable en matière de propriété intellectuelle.',
        },
        {
          kind: 'p',
          text: 'Les présentes Conditions ne vous confèrent aucun droit de propriété sur les actifs intellectuels du Service. Toute reproduction, distribution ou création d’œuvres dérivées sans autorisation préalable et expresse est interdite.',
        },
      ],
    },
    {
      title: '8. Données et confidentialité',
      blocks: [
        {
          kind: 'p',
          text: 'Le traitement de vos données personnelles est régi par notre [Politique de confidentialité](/privacy), rédigée conformément à la loi générale brésilienne sur la protection des données (LGPD, loi n° 13.709/2018). En utilisant le Service, vous confirmez l’avoir lue et acceptée.',
        },
      ],
    },
    {
      title: '9. Disponibilité du Service',
      blocks: [
        {
          kind: 'p',
          text: 'Nous faisons des efforts raisonnables pour maintenir le Service disponible, mais nous ne garantissons pas une disponibilité ininterrompue. Le Service peut être temporairement suspendu pour maintenance, mises à jour ou raisons techniques, sans préavis lorsque cela est nécessaire.',
        },
        {
          kind: 'p',
          text: 'Le Service étant en développement, ses fonctionnalités peuvent changer à tout moment.',
        },
      ],
    },
    {
      title: '10. Limitation de responsabilité',
      blocks: [
        {
          kind: 'p',
          text: 'Dans toute la mesure permise par la législation applicable, Lifedeck n’est pas responsable des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs résultant de l’utilisation ou de l’impossibilité d’utiliser le Service, y compris, sans s’y limiter, la perte de données ou l’interruption d’activités.',
        },
      ],
    },
    {
      title: '11. Résiliation du compte',
      blocks: [
        {
          kind: 'p',
          text: 'Vous pouvez fermer votre compte à tout moment directement sur la Plateforme, dans **Compte → Supprimer le compte**, ce qui supprime définitivement votre compte et vos listes. Au préalable, vous pouvez exporter une copie de vos données dans **Compte → Exporter mes données**.',
        },
        {
          kind: 'p',
          text: 'Nous nous réservons le droit de suspendre ou de fermer les comptes qui enfreignent les présentes Conditions, qui adoptent un comportement nuisible à la Plateforme ou à d’autres utilisateurs, ou sur ordre d’une autorité compétente.',
        },
      ],
    },
    {
      title: '12. Modification des Conditions',
      blocks: [
        {
          kind: 'p',
          text: 'Nous pouvons mettre à jour les présentes Conditions de temps à autre. En cas de changements importants, nous en informerons les utilisateurs par e-mail ou par un avis sur la Plateforme, avec un préavis raisonnable. La poursuite de l’utilisation du Service après la publication des changements vaut acceptation des nouvelles conditions.',
        },
      ],
    },
    {
      title: '13. Droit applicable et juridiction',
      blocks: [
        {
          kind: 'p',
          text: 'Les présentes Conditions sont régies par les lois de la République fédérative du Brésil. Les tribunaux de la circonscription de São Paulo/SP sont désignés pour trancher tout litige découlant du présent instrument, sauf disposition légale contraire.',
        },
      ],
    },
    {
      title: '14. Contact',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck est exploité par **{company}**, immatriculée sous le CNPJ n° {cnpj}. Les questions, suggestions ou demandes relatives aux présentes Conditions doivent être envoyées à : {email}.',
        },
      ],
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Politique de confidentialité',
  intro:
    'La présente Politique décrit la manière dont Lifedeck collecte, utilise, conserve et protège vos informations personnelles, conformément à la loi générale brésilienne sur la protection des données (LGPD, loi n° 13.709/2018) et aux autres règles applicables.',
  sections: [
    {
      title: '1. Qui sommes-nous',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck est exploité par **{company}**, immatriculée sous le CNPJ n° {cnpj}. Aux fins de la présente Politique, nous agissons en tant que **responsable du traitement** des données personnelles traitées dans le Service, au sens de la LGPD.',
        },
        {
          kind: 'p',
          text: 'Délégué à la protection des données (DPO) et canal de contact : {email}.',
        },
        {
          kind: 'p',
          text: 'Lorsque vous publiez une page de réservation, les données que vos clients saisissent pour réserver avec vous (nom, e-mail, téléphone, note et horaires réservés) sont traitées pour votre compte. Pour ces données, **vous êtes le responsable du traitement** et Lifedeck agit en tant qu’**opérateur** (sous-traitant) au sens de la LGPD : nous les utilisons uniquement pour gérer vos réservations, envoyer les confirmations, rappels et modifications par e-mail, et nous les conservons tant que votre compte existe. Vous répondez aux demandes de vos clients concernant leurs données, et nous vous aidons à le faire. La suppression de votre compte entraîne celle de vos clients et de vos réservations.',
        },
      ],
    },
    {
      title: '2. Données que nous collectons',
      blocks: [
        {
          kind: 'p',
          text: 'Nous collectons les catégories de données personnelles suivantes :',
        },
        {
          kind: 'list',
          items: [
            '**Données de compte :** nom affiché et, lorsque vous créez un compte, adresse e-mail ;',
            '**Données de connexion Google :** si vous choisissez de vous connecter avec Google, nous recevons votre e-mail, votre nom et le statut de vérification de votre e-mail. Nous n’avons jamais accès à votre mot de passe Google ;',
            '**Contenu utilisateur :** les listes, tâches, notes et partages que vous créez sur la Plateforme ;',
            '**Données WhatsApp :** votre numéro de téléphone WhatsApp et le contenu des messages que vous envoyez à l’assistant (texte, audio, images), lorsque vous associez WhatsApp ;',
            '**Données d’agenda :** vos événements d’agenda et vos données de connexion, lorsque vous connectez Google Calendar ;',
            '**Données de réservation :** votre page de réservation, vos prestations et vos horaires, ainsi que les clients et réservations qu’elle reçoit (voir la section 1 sur le responsable du traitement des données des clients) ;',
            '**Données d’abonnement :** votre offre ainsi que le statut de votre abonnement et de vos paiements (nous ne conservons jamais les numéros de carte) ;',
            '**Données d’utilisation :** journaux d’accès, fonctionnalités utilisées et journaux d’activité ;',
            '**Données techniques :** adresse IP, type de navigateur, système d’exploitation et cookies de session.',
          ],
        },
        {
          kind: 'p',
          text: 'Nous ne collectons pas de données personnelles sensibles (au sens de la LGPD) ni de données de mineurs de moins de 18 ans.',
        },
      ],
    },
    {
      title: '3. Finalités du traitement',
      blocks: [
        {
          kind: 'p',
          text: 'Nous utilisons vos données personnelles pour :',
        },
        {
          kind: 'list',
          items: [
            'Fournir, exploiter et améliorer en continu le Service ;',
            'Authentifier les comptes, en contrôler l’accès et les sécuriser ;',
            'Traiter les abonnements et les paiements des offres payantes ;',
            'Envoyer les communications essentielles du Service, comme le code de vérification de l’e-mail, les invitations et les notifications de listes ;',
            'Respecter les obligations légales et réglementaires ;',
            'Prévenir la fraude et garantir l’intégrité de la Plateforme.',
          ],
        },
      ],
    },
    {
      title: '4. Base légale (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'Le traitement des données personnelles repose sur les bases légales suivantes prévues par la LGPD :',
        },
        {
          kind: 'list',
          items: [
            '**Exécution d’un contrat (art. 7, V) :** pour fournir le Service et gérer les abonnements ;',
            '**Intérêt légitime (art. 7, IX) :** pour la sécurité, la prévention de la fraude et l’amélioration du Service ;',
            '**Consentement (art. 7, I) :** pour des traitements spécifiques, le cas échéant ;',
            '**Respect d’une obligation légale (art. 7, II) :** lorsque la loi ou une autorité compétente l’exige.',
          ],
        },
      ],
    },
    {
      title: '5. Partage et sous-traitants',
      blocks: [
        {
          kind: 'p',
          text: 'Nous ne vendons, ne louons ni n’échangeons vos données personnelles. Pour faire fonctionner le Service, nous faisons appel à des prestataires agissant en tant que sous-traitants, uniquement dans la mesure strictement nécessaire et sous des obligations contractuelles de protection des données :',
        },
        {
          kind: 'list',
          items: [
            '**Vercel :** hébergement de l’application et infrastructure web ;',
            '**Neon :** base de données gérée où votre contenu est stocké ;',
            '**Upstash :** limitation du débit des requêtes et contexte de conversation de courte durée de l’assistant ;',
            '**Resend :** envoi d’e-mails transactionnels (vérification, invitations et notifications) ;',
            '**Google (OAuth) :** connexion facultative avec un compte Google ;',
            '**Google (Calendar API) :** synchronisation de l’agenda, lorsque vous l’activez ;',
            '**Meta (WhatsApp Cloud API) :** acheminement des messages de l’assistant, lorsque vous associez WhatsApp ;',
            '**Fournisseurs d’IA (Google Gemini, via Vercel AI Gateway) :** génération de brouillons de listes par IA et traitement des messages de l’assistant (texte, audio, images) ;',
            '**Stripe et Asaas :** traitement des paiements d’abonnement ;',
            '**Sentry :** surveillance des erreurs à des fins de diagnostic et de stabilité de la Plateforme ;',
            '**Autorités publiques :** lorsque la loi, une décision de justice ou la demande d’un organisme compétent l’exige.',
          ],
        },
        {
          kind: 'p',
          text: 'L’utilisation et le transfert par Lifedeck des informations reçues des API Google respectent la Google API Services User Data Policy, y compris ses exigences de Limited Use. Les informations obtenues via Google Calendar sont utilisées uniquement pour fournir les fonctionnalités de synchronisation d’agenda que vous activez, ne sont jamais vendues et ne sont jamais utilisées à des fins publicitaires ni pour entraîner des modèles d’IA généralistes.',
        },
      ],
    },
    {
      title: '6. Transfert international de données',
      blocks: [
        {
          kind: 'p',
          text: 'Certains des prestataires mentionnés ci-dessus traitent des données sur des serveurs situés hors du Brésil, notamment aux États-Unis. Lorsque nous transférons des données personnelles à l’international, nous le faisons dans le respect des garanties exigées par la LGPD (art. 33), en faisant appel à des prestataires qui offrent un niveau adéquat de protection des données et des garanties contractuelles.',
        },
      ],
    },
    {
      title: '7. Génération par IA',
      blocks: [
        {
          kind: 'p',
          text: 'Lorsque vous utilisez la génération de listes par IA, le texte que vous fournissez est envoyé au fournisseur de modèle de langage exclusivement pour générer la réponse à la demande en cours. Le fournisseur sous contrat garantit, par accord, qu’il **n’utilise pas le contenu pour entraîner des modèles**.',
        },
        {
          kind: 'p',
          text: 'Nous vous recommandons de ne pas saisir de données personnelles sensibles ou confidentielles dans les champs de description utilisés par la génération par IA.',
        },
        {
          kind: 'p',
          text: 'Les audios et images envoyés à l’assistant WhatsApp sont transcrits ou analysés par des fournisseurs d’IA uniquement pour répondre à votre demande. Le contexte de conversation est conservé brièvement pour garder des réponses cohérentes et peut être supprimé avec votre compte.',
        },
      ],
    },
    {
      title: '8. Conservation et sécurité',
      blocks: [
        {
          kind: 'p',
          text: 'Nous adoptons des mesures techniques et organisationnelles appropriées pour protéger vos informations, notamment :',
        },
        {
          kind: 'list',
          items: [
            'Chiffrement en transit (TLS) ;',
            'Mots de passe stockés avec un algorithme de hachage robuste (Argon2id), jamais en clair ;',
            'Chiffrement au repos des identifiants sensibles, comme les jetons d’accès aux agendas ;',
            'Contrôle d’accès basé sur les rôles et principe du moindre privilège ;',
            'En-têtes de sécurité et Content Security Policy (CSP).',
          ],
        },
        {
          kind: 'p',
          text: 'Aucune méthode de transmission ou de stockage n’est sûre à 100 %. Nous faisons des efforts constants pour protéger vos données, mais nous ne pouvons pas garantir une sécurité absolue.',
        },
      ],
    },
    {
      title: '9. Vos droits (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'En tant que personne concernée, vous pouvez obtenir la confirmation de l’existence d’un traitement, accéder à vos données, les rectifier, demander leur anonymisation ou leur suppression, retirer votre consentement et demander la portabilité de vos données.',
        },
        {
          kind: 'p',
          text: 'Pour l’accès et la portabilité, vous pouvez générer une copie complète directement dans **Compte → Exporter mes données** (format JSON). Pour la suppression, utilisez **Compte → Supprimer le compte**, qui supprime définitivement votre compte et vos listes.',
        },
        {
          kind: 'p',
          text: 'Pour les autres droits, ou si le libre-service ne suffit pas, contactez-nous à {email}. Nous répondrons dans le délai légal.',
        },
      ],
    },
    {
      title: '10. Durée de conservation',
      blocks: [
        {
          kind: 'p',
          text: 'Nous conservons vos données personnelles tant que votre compte est actif ou pendant la durée nécessaire pour atteindre les finalités décrites dans la présente Politique. Après la fermeture de votre compte, vos données sont supprimées, sauf pendant toute durée minimale imposée par la législation applicable, comme les registres de facturation conservés pour satisfaire aux obligations fiscales et comptables.',
        },
      ],
    },
    {
      title: '11. Cookies',
      blocks: [
        {
          kind: 'p',
          text: 'Nous utilisons uniquement des cookies essentiels pour l’authentification, le maintien de la session et le fonctionnement de base du Service. Nous n’utilisons pas de cookies de suivi tiers à des fins publicitaires ou de profilage comportemental.',
        },
      ],
    },
    {
      title: '12. Mineurs',
      blocks: [
        {
          kind: 'p',
          text: 'Le Service est destiné aux personnes âgées de 18 ans ou plus. Nous ne collectons pas intentionnellement de données de mineurs. Si nous constatons que des données d’un mineur ont été collectées par inadvertance, nous prendrons les mesures nécessaires pour les supprimer.',
        },
      ],
    },
    {
      title: '13. Mises à jour de la présente Politique',
      blocks: [
        {
          kind: 'p',
          text: 'Nous pouvons mettre à jour la présente Politique périodiquement pour refléter des changements dans nos pratiques ou dans la législation applicable. Nous vous informerons des changements importants par e-mail ou par un avis sur la Plateforme, et la date de « Dernière mise à jour » en haut de page sera révisée.',
        },
      ],
    },
    {
      title: '14. Contact / DPO',
      blocks: [
        {
          kind: 'p',
          text: 'Pour toute question, demande de personne concernée ou pour exercer vos droits au titre de la LGPD, contactez-nous : {email}.',
        },
        {
          kind: 'p',
          text: 'Vous avez également le droit d’adresser une réclamation à l’Autorité nationale brésilienne de protection des données (ANPD) si vous estimez que vos droits n’ont pas été correctement pris en compte.',
        },
      ],
    },
  ],
}

const deleteAccount: LegalDocument = {
  title: 'Supprimer votre compte',
  intro:
    'Cette page explique comment supprimer votre compte Lifedeck, une app de GBS Tecnologia da Informação Ltda, et ce qu’il advient de vos données. La suppression est immédiate et irréversible.',
  sections: [
    {
      title: 'Dans l’app ou sur le web',
      blocks: [
        {
          kind: 'list',
          items: [
            'Dans l’app iPhone ou Android : ouvrez **Réglages → Compte → Supprimer le compte** et confirmez.',
            'Sur le web : connectez-vous sur lifedeck.com.br, ouvrez **Réglages → Compte → Supprimer le compte** et confirmez.',
            'Au préalable, vous pouvez télécharger une copie dans **Réglages → Compte → Exporter mes données**.',
          ],
        },
      ],
    },
    {
      title: 'Sans accès au compte',
      blocks: [
        {
          kind: 'p',
          text: 'Écrivez à {email} depuis l’adresse e-mail du compte pour demander la suppression. Nous vérifions que la demande vient bien de vous, supprimons le compte et répondons dans le délai légal.',
        },
      ],
    },
    {
      title: 'Ce qui est supprimé',
      blocks: [
        {
          kind: 'list',
          items: [
            'Profil, nom, e-mail, photo et préférences.',
            'Listes, tâches, habitudes, tâches récurrentes, événements d’agenda et connexions d’agenda.',
            'Page de réservation, prestations, clients et réservations.',
            'Historique des conversations avec l’assistant, numéros WhatsApp associés, appareils de notification et clés API.',
            'Abonnement : nous annulons le prélèvement récurrent auprès du prestataire de paiement avant de supprimer le compte.',
          ],
        },
      ],
    },
    {
      title: 'Ce qui est conservé',
      blocks: [
        {
          kind: 'list',
          items: [
            'Les registres de facturation exigés par la législation fiscale et comptable, pendant la durée légale.',
            'Les listes appartenant à d’autres personnes dont vous faisiez partie restent les leurs ; vous en êtes retiré.',
          ],
        },
      ],
    },
  ],
}

export const frLegal = { terms, privacy, deleteAccount }
