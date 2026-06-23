import type { LegalDocument } from '@/messages/types'

const terms: LegalDocument = {
  title: 'Termos de Uso',
  intro:
    'Ao acessar ou utilizar o Lifedeck (“Plataforma”, “Serviço”), você declara ter lido, compreendido e concordado com estes Termos de Uso. Se não concordar com qualquer parte, não utilize o Serviço.',
  sections: [
    {
      title: '1. O Serviço',
      blocks: [
        {
          kind: 'p',
          text: 'O Lifedeck é um aplicativo de organização pessoal que permite criar listas e tarefas, organizar a rotina do dia a dia, compartilhar listas com outras pessoas, gerar listas com auxílio de inteligência artificial e acompanhar o próprio progresso.',
        },
        {
          kind: 'p',
          text: 'A Plataforma está em desenvolvimento contínuo. Funcionalidades, limites e condições de uso podem ser adicionados, alterados ou removidos ao longo do tempo.',
        },
      ],
    },
    {
      title: '2. Cadastro e Conta',
      blocks: [
        {
          kind: 'p',
          text: 'Você pode começar a usar o Serviço como convidado, sem criar uma conta. Para preservar suas listas entre dispositivos, você pode criar uma conta com e-mail e senha ou entrar com sua conta Google. Ao criar uma conta, você:',
        },
        {
          kind: 'list',
          items: [
            'Compromete-se a fornecer informações verdadeiras e mantê-las atualizadas;',
            'É responsável por manter a confidencialidade de suas credenciais de acesso;',
            'Assume responsabilidade pelas atividades realizadas na conta;',
            'Deve nos notificar em caso de suspeita de acesso não autorizado, pelo e-mail {email}.',
          ],
        },
      ],
    },
    {
      title: '3. Uso Aceitável',
      blocks: [
        {
          kind: 'p',
          text: 'Você concorda em utilizar a Plataforma exclusivamente para fins legítimos e em conformidade com a legislação brasileira aplicável. É expressamente vedado:',
        },
        {
          kind: 'list',
          items: [
            'Usar a Plataforma para fins ilegais, fraudulentos ou prejudiciais a terceiros;',
            'Acessar dados ou contas de outros usuários sem autorização;',
            'Transmitir vírus, malware ou qualquer código malicioso;',
            'Realizar engenharia reversa, descompilação ou desmontagem de qualquer parte da Plataforma;',
            'Utilizar bots, scripts automatizados ou raspagem de dados (scraping) sem autorização expressa, ou de forma que sobrecarregue a infraestrutura do Serviço.',
          ],
        },
      ],
    },
    {
      title: '4. Seu Conteúdo',
      blocks: [
        {
          kind: 'p',
          text: 'As listas, tarefas, notas e demais conteúdos que você cria continuam sendo seus. Você nos concede apenas a licença limitada e necessária para armazenar, processar e exibir esse conteúdo com o objetivo de operar o Serviço para você e para as pessoas com quem você compartilhar suas listas.',
        },
        {
          kind: 'p',
          text: 'Você é o único responsável pelo conteúdo que insere na Plataforma e por garantir que possui os direitos necessários sobre ele.',
        },
      ],
    },
    {
      title: '5. Geração com Inteligência Artificial',
      blocks: [
        {
          kind: 'p',
          text: 'O recurso de geração de listas com IA envia o texto que você fornece a um provedor de modelo de linguagem, com o único propósito de gerar um rascunho editável de lista. O resultado é uma sugestão automatizada e pode conter imprecisões ou omissões.',
        },
        {
          kind: 'p',
          text: 'O conteúdo gerado não constitui aconselhamento profissional, jurídico, médico ou financeiro. Revise sempre o rascunho antes de utilizá-lo.',
        },
      ],
    },
    {
      title: '6. Propriedade Intelectual',
      blocks: [
        {
          kind: 'p',
          text: 'Todo o conteúdo da Plataforma — incluindo código-fonte, design, logotipos, marcas, textos, funcionalidades e interfaces — é propriedade exclusiva do Lifedeck ou de seus licenciadores, protegido pela legislação de propriedade intelectual aplicável.',
        },
        {
          kind: 'p',
          text: 'Estes Termos não concedem a você qualquer direito de propriedade sobre os ativos intelectuais do Serviço. É vedado reproduzir, distribuir ou criar obras derivadas sem autorização prévia e expressa.',
        },
      ],
    },
    {
      title: '7. Dados e Privacidade',
      blocks: [
        {
          kind: 'p',
          text: 'O tratamento de seus dados pessoais é regido pela nossa [Política de Privacidade](/privacy), elaborada em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018). Ao usar o Serviço, você declara ter lido e concordado com ela.',
        },
      ],
    },
    {
      title: '8. Disponibilidade do Serviço',
      blocks: [
        {
          kind: 'p',
          text: 'Empenhamos esforços razoáveis para manter o Serviço disponível, mas não garantimos disponibilidade ininterrupta. O Serviço pode ser suspenso temporariamente para manutenção, atualizações ou por razões técnicas, sem aviso prévio quando necessário.',
        },
        {
          kind: 'p',
          text: 'Por estar em desenvolvimento, funcionalidades podem mudar a qualquer momento.',
        },
      ],
    },
    {
      title: '9. Limitação de Responsabilidade',
      blocks: [
        {
          kind: 'p',
          text: 'Na máxima extensão permitida pela legislação aplicável, o Lifedeck não se responsabiliza por danos indiretos, incidentais, especiais, consequenciais ou punitivos decorrentes do uso ou da impossibilidade de uso do Serviço, incluindo, sem limitação, perda de dados ou interrupção de atividades.',
        },
      ],
    },
    {
      title: '10. Encerramento da Conta',
      blocks: [
        {
          kind: 'p',
          text: 'Você pode encerrar sua conta a qualquer momento diretamente na Plataforma, em **Conta → Excluir conta**, o que remove permanentemente sua conta e suas listas. Antes disso, você pode exportar uma cópia dos seus dados em **Conta → Exportar meus dados**.',
        },
        {
          kind: 'p',
          text: 'Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, apresentem comportamento prejudicial à Plataforma ou a outros usuários, ou mediante determinação de autoridade competente.',
        },
      ],
    },
    {
      title: '11. Modificações dos Termos',
      blocks: [
        {
          kind: 'p',
          text: 'Podemos atualizar estes Termos periodicamente. Quando houver alterações relevantes, notificaremos os usuários por e-mail ou mediante aviso na Plataforma, com antecedência razoável. O uso continuado do Serviço após a publicação das alterações constituirá aceitação dos novos termos.',
        },
      ],
    },
    {
      title: '12. Legislação e Foro',
      blocks: [
        {
          kind: 'p',
          text: 'Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas deste instrumento, salvo disposição legal em contrário.',
        },
      ],
    },
    {
      title: '13. Contato',
      blocks: [
        {
          kind: 'p',
          text: 'O Lifedeck é operado por **{company}**, inscrita no CNPJ sob o nº {cnpj}. Dúvidas, sugestões ou solicitações relacionadas a estes Termos devem ser encaminhadas para: {email}.',
        },
      ],
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Política de Privacidade',
  intro:
    'Esta Política descreve como o Lifedeck coleta, utiliza, armazena e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais normas aplicáveis.',
  sections: [
    {
      title: '1. Quem somos',
      blocks: [
        {
          kind: 'p',
          text: 'O Lifedeck é operado por **{company}**, inscrita no CNPJ sob o nº {cnpj}. Para os fins desta Política, atuamos como **controladores** dos dados pessoais tratados no Serviço, nos termos da LGPD.',
        },
        {
          kind: 'p',
          text: 'Encarregado (DPO) e canal de contato: {email}.',
        },
      ],
    },
    {
      title: '2. Dados que coletamos',
      blocks: [
        {
          kind: 'p',
          text: 'Coletamos as seguintes categorias de dados pessoais:',
        },
        {
          kind: 'list',
          items: [
            '**Dados de cadastro:** nome de exibição e, quando você cria uma conta, endereço de e-mail;',
            '**Dados de login com Google:** ao optar por entrar com o Google, recebemos seu e-mail, nome e o status de verificação do e-mail. Não acessamos sua senha do Google;',
            '**Conteúdo do usuário:** as listas, tarefas, notas e compartilhamentos que você cria na Plataforma;',
            '**Dados de uso:** registros de acesso, funcionalidades utilizadas e logs de atividade;',
            '**Dados técnicos:** endereço IP, tipo de navegador, sistema operacional e cookies de sessão.',
          ],
        },
        {
          kind: 'p',
          text: 'Não coletamos dados pessoais sensíveis (conforme definição da LGPD) nem dados de menores de 18 anos.',
        },
      ],
    },
    {
      title: '3. Finalidade do tratamento',
      blocks: [
        { kind: 'p', text: 'Utilizamos seus dados pessoais para:' },
        {
          kind: 'list',
          items: [
            'Prover, operar e melhorar continuamente o Serviço;',
            'Autenticação, controle de acesso e segurança de contas;',
            'Enviar comunicações essenciais do Serviço, como o código de verificação de e-mail, convites e notificações de listas;',
            'Cumprir obrigações legais e regulatórias;',
            'Prevenir fraudes e garantir a integridade da Plataforma.',
          ],
        },
      ],
    },
    {
      title: '4. Base legal (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'O tratamento de dados pessoais está fundamentado nas seguintes bases legais previstas na LGPD:',
        },
        {
          kind: 'list',
          items: [
            '**Execução de contrato (art. 7º, V):** para prestar o Serviço;',
            '**Legítimo interesse (art. 7º, IX):** para segurança, prevenção a fraudes e melhoria do Serviço;',
            '**Consentimento (art. 7º, I):** para tratamentos específicos, quando aplicável;',
            '**Cumprimento de obrigação legal (art. 7º, II):** quando exigido por lei ou autoridade competente.',
          ],
        },
      ],
    },
    {
      title: '5. Compartilhamento e subprocessadores',
      blocks: [
        {
          kind: 'p',
          text: 'Não vendemos, alugamos ou comercializamos seus dados pessoais. Para operar o Serviço, contamos com prestadores que atuam como operadores de dados, somente na medida indispensável e mediante obrigações contratuais de proteção de dados:',
        },
        {
          kind: 'list',
          items: [
            '**Vercel:** hospedagem da aplicação e infraestrutura web;',
            '**Neon:** banco de dados gerenciado onde seu conteúdo é armazenado;',
            '**Resend:** envio de e-mails transacionais (verificação, convites e notificações);',
            '**Google (Gemini, via Vercel AI Gateway):** provedor do modelo de linguagem utilizado no recurso de geração de listas com IA;',
            '**Google (OAuth):** autenticação opcional via conta Google;',
            '**Upstash:** limitação de requisições (rate limiting) para segurança da API;',
            '**Sentry:** monitoramento de erros para diagnóstico e estabilidade da Plataforma;',
            '**Autoridades públicas:** quando exigido por lei, decisão judicial ou solicitação de órgão competente.',
          ],
        },
      ],
    },
    {
      title: '6. Geração com IA',
      blocks: [
        {
          kind: 'p',
          text: 'Ao usar a geração de listas com IA, o texto que você fornece é enviado ao provedor de modelo de linguagem exclusivamente para gerar a resposta da solicitação atual. O provedor contratado assegura, mediante acordo, que **não usa o conteúdo para treinar modelos**.',
        },
        {
          kind: 'p',
          text: 'Recomendamos não inserir dados pessoais sensíveis ou confidenciais nos campos de descrição utilizados pela geração com IA.',
        },
      ],
    },
    {
      title: '7. Armazenamento e segurança',
      blocks: [
        {
          kind: 'p',
          text: 'Adotamos medidas técnicas e organizacionais adequadas para proteger suas informações, incluindo:',
        },
        {
          kind: 'list',
          items: [
            'Criptografia em trânsito (TLS);',
            'Senhas armazenadas com algoritmo de hashing forte (Argon2id) — nunca em texto puro;',
            'Controle de acesso por papel e princípio do menor privilégio;',
            'Cabeçalhos de segurança e política de segurança de conteúdo (CSP).',
          ],
        },
        {
          kind: 'p',
          text: 'Nenhum método de transmissão ou armazenamento é 100% seguro. Empenhamos esforços contínuos para proteger seus dados, mas não podemos garantir segurança absoluta.',
        },
      ],
    },
    {
      title: '8. Seus direitos (LGPD)',
      blocks: [
        {
          kind: 'p',
          text: 'Na qualidade de titular de dados, você pode confirmar a existência de tratamento, acessar, corrigir, solicitar anonimização ou eliminação, revogar consentimento e solicitar a portabilidade dos seus dados.',
        },
        {
          kind: 'p',
          text: 'Para acesso e portabilidade, você pode gerar uma cópia completa diretamente em **Conta → Exportar meus dados** (formato JSON). Para eliminação, use **Conta → Excluir conta**, que remove permanentemente sua conta e listas.',
        },
        {
          kind: 'p',
          text: 'Para os demais direitos — ou caso o self-service não atenda — entre em contato pelo e-mail {email}. Responderemos no prazo legal.',
        },
      ],
    },
    {
      title: '9. Retenção de dados',
      blocks: [
        {
          kind: 'p',
          text: 'Mantemos seus dados pessoais enquanto sua conta estiver ativa ou pelo período necessário para cumprir as finalidades descritas nesta Política. Após o encerramento da conta, seus dados são eliminados, ressalvado o prazo mínimo eventualmente exigido pela legislação aplicável.',
        },
      ],
    },
    {
      title: '10. Cookies',
      blocks: [
        {
          kind: 'p',
          text: 'Utilizamos exclusivamente cookies essenciais para autenticação, manutenção de sessão e funcionamento básico do Serviço. Não utilizamos cookies de rastreamento de terceiros para fins publicitários ou de perfilamento comportamental.',
        },
      ],
    },
    {
      title: '11. Menores de idade',
      blocks: [
        {
          kind: 'p',
          text: 'O Serviço é destinado a pessoas com idade igual ou superior a 18 anos. Não coletamos intencionalmente dados de menores. Caso identifiquemos que dados de um menor foram coletados inadvertidamente, tomaremos as medidas necessárias para eliminá-los.',
        },
      ],
    },
    {
      title: '12. Atualizações desta Política',
      blocks: [
        {
          kind: 'p',
          text: 'Podemos atualizar esta Política periodicamente para refletir mudanças em nossas práticas ou na legislação aplicável. Notificaremos sobre alterações relevantes por e-mail ou por aviso na Plataforma, e a data de “Última atualização” ao topo será revisada.',
        },
      ],
    },
    {
      title: '13. Contato / Encarregado (DPO)',
      blocks: [
        {
          kind: 'p',
          text: 'Para dúvidas, solicitações de titulares ou para exercer seus direitos previstos na LGPD, entre em contato: {email}.',
        },
        {
          kind: 'p',
          text: 'Você também tem o direito de peticionar perante a Autoridade Nacional de Proteção de Dados (ANPD), caso entenda que seus direitos não foram atendidos adequadamente.',
        },
      ],
    },
  ],
}

export const ptLegal = { terms, privacy }
