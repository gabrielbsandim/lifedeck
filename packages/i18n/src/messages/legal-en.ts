import type { LegalDocument } from '@/messages/types'

const terms: LegalDocument = {
  title: 'Terms of Use',
  intro:
    'By accessing or using Lifedeck (the “Platform”, the “Service”), you confirm that you have read, understood and agreed to these Terms of Use. If you do not agree with any part, do not use the Service.',
  sections: [
    {
      title: '1. The Service',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck is a personal organization app that lets you create lists and tasks, organize your daily routine, share lists with other people, generate lists with the help of artificial intelligence and track your own progress.',
        },
        {
          kind: 'p',
          text: 'The Platform is under continuous development. Features, limits and conditions of use may be added, changed or removed over time.',
        },
        {
          kind: 'p',
          text: 'Lifedeck offers optional paid plans (Pro and Premium). Paid features include Google Calendar sync, reminders and the WhatsApp assistant. The terms that govern these subscriptions are described in section 2.',
        },
      ],
    },
    {
      title: '2. Payments and Subscriptions',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck offers optional paid plans (Pro and Premium), billed monthly or annually. Current prices are shown in the app before you confirm a purchase and may include applicable taxes.',
        },
        {
          kind: 'p',
          text: 'Subscriptions renew automatically at the end of each billing cycle, for the same period, until you cancel. Payments are processed by our payment providers, Stripe (international) and Asaas (Brazil); we do not store your card number.',
        },
        {
          kind: 'p',
          text: 'You can cancel at any time under **Account → Billing**. Cancellation stops the next charge; your paid access continues until the end of the period already paid for and is not renewed after that.',
        },
        {
          kind: 'p',
          text: '**Right of withdrawal (art. 49 of the Brazilian Consumer Protection Code):** if you are a consumer in Brazil, you may withdraw from a purchase within 7 days of the contracting date and receive a full refund of that charge. To exercise this right, contact us at {email}.',
        },
        {
          kind: 'p',
          text: 'Outside the 7-day withdrawal period, charges already made are non-refundable and cancellation does not generate a proportional refund of the current period. If a renewal payment fails, paid features may be suspended and the account may return to the free plan.',
        },
        {
          kind: 'p',
          text: 'We may change plan prices or features. We will announce relevant changes in advance, and they apply only from the next renewal; you may cancel beforehand if you do not agree.',
        },
      ],
    },
    {
      title: '3. Account and Sign-up',
      blocks: [
        {
          kind: 'p',
          text: 'You can start using the Service as a guest, without creating an account. To keep your lists across devices, you can create an account with email and password or sign in with your Google account. When you create an account, you:',
        },
        {
          kind: 'list',
          items: [
            'Agree to provide truthful information and keep it up to date;',
            'Are responsible for keeping your access credentials confidential;',
            'Take responsibility for the activities carried out under your account;',
            'Must notify us of any suspected unauthorized access, at {email}.',
          ],
        },
      ],
    },
    {
      title: '4. Acceptable Use',
      blocks: [
        {
          kind: 'p',
          text: 'You agree to use the Platform solely for legitimate purposes and in compliance with applicable law. The following is expressly prohibited:',
        },
        {
          kind: 'list',
          items: [
            'Using the Platform for illegal, fraudulent or harmful purposes;',
            'Accessing other users’ data or accounts without authorization;',
            'Transmitting viruses, malware or any malicious code;',
            'Reverse engineering, decompiling or disassembling any part of the Platform;',
            'Using bots, automated scripts or data scraping without express authorization, or in a way that overloads the Service infrastructure.',
          ],
        },
      ],
    },
    {
      title: '5. Your Content',
      blocks: [
        {
          kind: 'p',
          text: 'The lists, tasks, notes and other content you create remain yours. You grant us only the limited license needed to store, process and display that content in order to operate the Service for you and for the people you share your lists with.',
        },
        {
          kind: 'p',
          text: 'You are solely responsible for the content you add to the Platform and for ensuring you hold the necessary rights to it.',
        },
      ],
    },
    {
      title: '6. AI Generation',
      blocks: [
        {
          kind: 'p',
          text: 'The AI list generation feature sends the text you provide to a language model provider, for the sole purpose of generating an editable list draft. The result is an automated suggestion and may contain inaccuracies or omissions.',
        },
        {
          kind: 'p',
          text: 'Generated content does not constitute professional, legal, medical or financial advice. Always review the draft before using it.',
        },
        {
          kind: 'p',
          text: 'Lifedeck also offers an optional AI assistant over WhatsApp that can read and act on your tasks, lists and calendar on your behalf. Messages you send to the assistant, including audio and images, are processed by AI providers to produce responses. AI usage is subject to per-plan limits.',
        },
      ],
    },
    {
      title: '7. Intellectual Property',
      blocks: [
        {
          kind: 'p',
          text: 'All Platform content (including source code, design, logos, trademarks, text, features and interfaces) is the exclusive property of Lifedeck or its licensors, protected by applicable intellectual property law.',
        },
        {
          kind: 'p',
          text: 'These Terms grant you no ownership rights over the Service’s intellectual assets. Reproducing, distributing or creating derivative works without prior, express authorization is prohibited.',
        },
      ],
    },
    {
      title: '8. Data and Privacy',
      blocks: [
        {
          kind: 'p',
          text: 'The processing of your personal data is governed by our [Privacy Policy](/privacy), prepared in compliance with the Brazilian General Data Protection Law (LGPD, Law No. 13.709/2018). By using the Service, you confirm that you have read and agreed to it.',
        },
      ],
    },
    {
      title: '9. Service Availability',
      blocks: [
        {
          kind: 'p',
          text: 'We make reasonable efforts to keep the Service available, but we do not guarantee uninterrupted availability. The Service may be temporarily suspended for maintenance, updates or technical reasons, without prior notice when necessary.',
        },
        {
          kind: 'p',
          text: 'As it is under development, features may change at any time.',
        },
      ],
    },
    {
      title: '10. Limitation of Liability',
      blocks: [
        {
          kind: 'p',
          text: 'To the maximum extent permitted by applicable law, Lifedeck is not liable for indirect, incidental, special, consequential or punitive damages arising from the use of, or inability to use, the Service, including, without limitation, loss of data or interruption of activities.',
        },
      ],
    },
    {
      title: '11. Account Termination',
      blocks: [
        {
          kind: 'p',
          text: 'You can close your account at any time directly on the Platform, under **Account → Delete account**, which permanently removes your account and your lists. Before that, you can export a copy of your data under **Account → Export my data**.',
        },
        {
          kind: 'p',
          text: 'We reserve the right to suspend or terminate accounts that breach these Terms, behave in ways harmful to the Platform or other users, or upon order of a competent authority.',
        },
      ],
    },
    {
      title: '12. Changes to the Terms',
      blocks: [
        {
          kind: 'p',
          text: 'We may update these Terms from time to time. When there are relevant changes, we will notify users by email or via a notice on the Platform, with reasonable advance notice. Continued use of the Service after the changes are published constitutes acceptance of the new terms.',
        },
      ],
    },
    {
      title: '13. Governing Law and Venue',
      blocks: [
        {
          kind: 'p',
          text: 'These Terms are governed by the laws of the Federative Republic of Brazil. The courts of the district of São Paulo/SP are elected to resolve any disputes arising from this instrument, except as otherwise required by law.',
        },
      ],
    },
    {
      title: '14. Contact',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck is operated by **{company}**, registered under CNPJ No. {cnpj}. Questions, suggestions or requests related to these Terms should be sent to: {email}.',
        },
      ],
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Privacy Policy',
  intro:
    'This Policy describes how Lifedeck collects, uses, stores and protects your personal information, in compliance with the Brazilian General Data Protection Law (LGPD, Law No. 13.709/2018) and other applicable rules.',
  sections: [
    {
      title: '1. Who we are',
      blocks: [
        {
          kind: 'p',
          text: 'Lifedeck is operated by **{company}**, registered under CNPJ No. {cnpj}. For the purposes of this Policy, we act as the **controller** of the personal data processed in the Service, under the LGPD.',
        },
        {
          kind: 'p',
          text: 'Data Protection Officer (DPO) and contact channel: {email}.',
        },
      ],
    },
    {
      title: '2. Data we collect',
      blocks: [
        {
          kind: 'p',
          text: 'We collect the following categories of personal data:',
        },
        {
          kind: 'list',
          items: [
            '**Account data:** display name and, when you create an account, email address;',
            '**Google sign-in data:** if you choose to sign in with Google, we receive your email, name and email verification status. We never access your Google password;',
            '**User content:** the lists, tasks, notes and shares you create on the Platform;',
            '**WhatsApp data:** your WhatsApp phone number and the content of the messages you send to the assistant (text, audio, images), when you link WhatsApp;',
            '**Calendar data:** your calendar events and connection data, when you connect Google Calendar;',
            '**Subscription data:** your plan and subscription and payment status (we never store card numbers);',
            '**Usage data:** access records, features used and activity logs;',
            '**Technical data:** IP address, browser type, operating system and session cookies.',
          ],
        },
        {
          kind: 'p',
          text: 'We do not collect sensitive personal data (as defined by the LGPD) nor data of minors under 18.',
        },
      ],
    },
    {
      title: '3. Purpose of processing',
      blocks: [
        { kind: 'p', text: 'We use your personal data to:' },
        {
          kind: 'list',
          items: [
            'Provide, operate and continuously improve the Service;',
            'Authenticate, control access to, and secure accounts;',
            'Process subscriptions and payments for the paid plans;',
            'Send essential Service communications, such as the email verification code, invitations and list notifications;',
            'Comply with legal and regulatory obligations;',
            'Prevent fraud and ensure the integrity of the Platform.',
          ],
        },
      ],
    },
    {
      title: '4. Legal basis (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'The processing of personal data is based on the following legal bases set out in the LGPD:',
        },
        {
          kind: 'list',
          items: [
            '**Performance of a contract (art. 7, V):** to provide the Service and manage subscriptions;',
            '**Legitimate interest (art. 7, IX):** for security, fraud prevention and improvement of the Service;',
            '**Consent (art. 7, I):** for specific processing, where applicable;',
            '**Compliance with a legal obligation (art. 7, II):** when required by law or a competent authority.',
          ],
        },
      ],
    },
    {
      title: '5. Sharing and subprocessors',
      blocks: [
        {
          kind: 'p',
          text: 'We do not sell, rent or trade your personal data. To operate the Service, we rely on providers acting as data processors, only to the extent strictly necessary and under contractual data protection obligations:',
        },
        {
          kind: 'list',
          items: [
            '**Vercel:** application hosting and web infrastructure;',
            '**Neon:** managed database where your content is stored;',
            '**Upstash:** request rate limiting and short-lived assistant conversation context;',
            '**Resend:** sending transactional emails (verification, invitations and notifications);',
            '**Google (OAuth):** optional sign-in with a Google account;',
            '**Google (Calendar API):** calendar synchronization, when you enable it;',
            '**Meta (WhatsApp Cloud API):** delivering the assistant’s messages, when you link WhatsApp;',
            '**AI providers (Google Gemini, via Vercel AI Gateway):** generating AI list drafts and processing assistant messages (text, audio, images);',
            '**Stripe and Asaas:** processing subscription payments;',
            '**Sentry:** error monitoring for diagnostics and Platform stability;',
            '**Public authorities:** when required by law, court order or request from a competent body.',
          ],
        },
      ],
    },
    {
      title: '6. International data transfer',
      blocks: [
        {
          kind: 'p',
          text: 'Some of the providers listed above process data on servers located outside Brazil, including in the United States. When we transfer personal data internationally, we do so under the safeguards required by the LGPD (art. 33), relying on providers that offer an adequate level of data protection and contractual guarantees.',
        },
      ],
    },
    {
      title: '7. AI generation',
      blocks: [
        {
          kind: 'p',
          text: 'When you use AI list generation, the text you provide is sent to the language model provider exclusively to generate the response to the current request. The contracted provider warrants, by agreement, that it **does not use the content to train models**.',
        },
        {
          kind: 'p',
          text: 'We recommend not entering sensitive or confidential personal data in the description fields used by AI generation.',
        },
        {
          kind: 'p',
          text: 'Audio and images sent to the WhatsApp assistant are transcribed or analyzed by AI providers solely to fulfill your request. Conversation context is retained briefly to keep replies coherent and can be deleted along with your account.',
        },
      ],
    },
    {
      title: '8. Storage and security',
      blocks: [
        {
          kind: 'p',
          text: 'We adopt appropriate technical and organizational measures to protect your information, including:',
        },
        {
          kind: 'list',
          items: [
            'Encryption in transit (TLS);',
            'Passwords stored with a strong hashing algorithm (Argon2id), never in plain text;',
            'Encryption at rest of sensitive credentials, such as calendar access tokens;',
            'Role-based access control and the principle of least privilege;',
            'Security headers and a Content Security Policy (CSP).',
          ],
        },
        {
          kind: 'p',
          text: 'No method of transmission or storage is 100% secure. We make ongoing efforts to protect your data, but we cannot guarantee absolute security.',
        },
      ],
    },
    {
      title: '9. Your rights (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'As a data subject, you may confirm the existence of processing, access, correct, request anonymization or deletion, withdraw consent, and request portability of your data.',
        },
        {
          kind: 'p',
          text: 'For access and portability, you can generate a full copy directly under **Account → Export my data** (JSON format). For deletion, use **Account → Delete account**, which permanently removes your account and lists.',
        },
        {
          kind: 'p',
          text: 'For the remaining rights, or if self-service does not suffice, contact us at {email}. We will respond within the legal deadline.',
        },
      ],
    },
    {
      title: '10. Data retention',
      blocks: [
        {
          kind: 'p',
          text: 'We keep your personal data while your account is active or for the period needed to fulfill the purposes described in this Policy. After your account is closed, your data is deleted, except for any minimum period required by applicable law, such as billing records kept to meet tax and accounting obligations.',
        },
      ],
    },
    {
      title: '11. Cookies',
      blocks: [
        {
          kind: 'p',
          text: 'We use only essential cookies for authentication, session maintenance and basic Service functioning. We do not use third-party tracking cookies for advertising or behavioral profiling.',
        },
      ],
    },
    {
      title: '12. Minors',
      blocks: [
        {
          kind: 'p',
          text: 'The Service is intended for people aged 18 or older. We do not intentionally collect data from minors. If we identify that a minor’s data was inadvertently collected, we will take the necessary steps to delete it.',
        },
      ],
    },
    {
      title: '13. Updates to this Policy',
      blocks: [
        {
          kind: 'p',
          text: 'We may update this Policy periodically to reflect changes in our practices or in applicable law. We will notify you of relevant changes by email or via a notice on the Platform, and the “Last updated” date at the top will be revised.',
        },
      ],
    },
    {
      title: '14. Contact / DPO',
      blocks: [
        {
          kind: 'p',
          text: 'For questions, data subject requests or to exercise your rights under the LGPD, contact us: {email}.',
        },
        {
          kind: 'p',
          text: 'You also have the right to petition the Brazilian National Data Protection Authority (ANPD) if you believe your rights have not been adequately addressed.',
        },
      ],
    },
  ],
}

export const enLegal = { terms, privacy }
