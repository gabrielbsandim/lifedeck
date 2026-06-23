import { LegalSection, LegalShell } from '@/components/legal/legal-shell'
import { COMPANY_CNPJ, COMPANY_EMAIL, COMPANY_NAME } from '@/lib/site'

export function PrivacyScreen() {
  return (
    <LegalShell
      updatedAt="Última atualização: junho de 2026"
      title="Política de Privacidade"
      intro={
        <>
          Esta Política descreve como o Lifedeck coleta, utiliza, armazena e
          protege suas informações pessoais, em conformidade com a Lei Geral de
          Proteção de Dados (LGPD — Lei nº 13.709/2018) e demais normas
          aplicáveis.
        </>
      }
    >
      <LegalSection title="1. Quem somos">
        <p>
          O Lifedeck é operado por <strong>{COMPANY_NAME}</strong>, inscrita no
          CNPJ sob o nº {COMPANY_CNPJ}. Para os fins desta Política, atuamos
          como <strong>controladores</strong> dos dados pessoais tratados no
          Serviço, nos termos da LGPD.
        </p>
        <p>
          Encarregado (DPO) e canal de contato:{' '}
          <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos">
        <p>Coletamos as seguintes categorias de dados pessoais:</p>
        <ul>
          <li>
            <strong>Dados de cadastro:</strong> nome de exibição e, quando você
            cria uma conta, endereço de e-mail;
          </li>
          <li>
            <strong>Dados de login com Google:</strong> ao optar por entrar com
            o Google, recebemos seu e-mail, nome e o status de verificação do
            e-mail. Não acessamos sua senha do Google;
          </li>
          <li>
            <strong>Conteúdo do usuário:</strong> as listas, tarefas, notas e
            compartilhamentos que você cria na Plataforma;
          </li>
          <li>
            <strong>Dados de uso:</strong> registros de acesso, funcionalidades
            utilizadas e logs de atividade;
          </li>
          <li>
            <strong>Dados técnicos:</strong> endereço IP, tipo de navegador,
            sistema operacional e cookies de sessão.
          </li>
        </ul>
        <p>
          Não coletamos dados pessoais sensíveis (conforme definição da LGPD)
          nem dados de menores de 18 anos.
        </p>
      </LegalSection>

      <LegalSection title="3. Finalidade do tratamento">
        <p>Utilizamos seus dados pessoais para:</p>
        <ul>
          <li>Prover, operar e melhorar continuamente o Serviço;</li>
          <li>Autenticação, controle de acesso e segurança de contas;</li>
          <li>
            Enviar comunicações essenciais do Serviço, como o código de
            verificação de e-mail, convites e notificações de listas;
          </li>
          <li>Cumprir obrigações legais e regulatórias;</li>
          <li>Prevenir fraudes e garantir a integridade da Plataforma.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Base legal (LGPD)">
        <p>
          O tratamento de dados pessoais está fundamentado nas seguintes bases
          legais previstas na LGPD:
        </p>
        <ul>
          <li>
            <strong>Execução de contrato (art. 7º, V):</strong> para prestar o
            Serviço;
          </li>
          <li>
            <strong>Legítimo interesse (art. 7º, IX):</strong> para segurança,
            prevenção a fraudes e melhoria do Serviço;
          </li>
          <li>
            <strong>Consentimento (art. 7º, I):</strong> para tratamentos
            específicos, quando aplicável;
          </li>
          <li>
            <strong>Cumprimento de obrigação legal (art. 7º, II):</strong>{' '}
            quando exigido por lei ou autoridade competente.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Compartilhamento e subprocessadores">
        <p>
          Não vendemos, alugamos ou comercializamos seus dados pessoais. Para
          operar o Serviço, contamos com prestadores que atuam como operadores
          de dados, somente na medida indispensável e mediante obrigações
          contratuais de proteção de dados:
        </p>
        <ul>
          <li>
            <strong>Vercel:</strong> hospedagem da aplicação e infraestrutura
            web;
          </li>
          <li>
            <strong>Neon:</strong> banco de dados gerenciado onde seu conteúdo é
            armazenado;
          </li>
          <li>
            <strong>Resend:</strong> envio de e-mails transacionais
            (verificação, convites e notificações);
          </li>
          <li>
            <strong>Google (Gemini, via Vercel AI Gateway):</strong> provedor do
            modelo de linguagem utilizado no recurso de geração de listas com
            IA;
          </li>
          <li>
            <strong>Google (OAuth):</strong> autenticação opcional via conta
            Google;
          </li>
          <li>
            <strong>Upstash:</strong> limitação de requisições (rate limiting)
            para segurança da API;
          </li>
          <li>
            <strong>Sentry:</strong> monitoramento de erros para diagnóstico e
            estabilidade da Plataforma;
          </li>
          <li>
            <strong>Autoridades públicas:</strong> quando exigido por lei,
            decisão judicial ou solicitação de órgão competente.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Geração com IA">
        <p>
          Ao usar a geração de listas com IA, o texto que você fornece é enviado
          ao provedor de modelo de linguagem exclusivamente para gerar a
          resposta da solicitação atual. O provedor contratado assegura,
          mediante acordo, que{' '}
          <strong>não usa o conteúdo para treinar modelos</strong>.
        </p>
        <p>
          Recomendamos não inserir dados pessoais sensíveis ou confidenciais nos
          campos de descrição utilizados pela geração com IA.
        </p>
      </LegalSection>

      <LegalSection title="7. Armazenamento e segurança">
        <p>
          Adotamos medidas técnicas e organizacionais adequadas para proteger
          suas informações, incluindo:
        </p>
        <ul>
          <li>Criptografia em trânsito (TLS);</li>
          <li>
            Senhas armazenadas com algoritmo de hashing forte (Argon2id) — nunca
            em texto puro;
          </li>
          <li>Controle de acesso por papel e princípio do menor privilégio;</li>
          <li>
            Cabeçalhos de segurança e política de segurança de conteúdo (CSP).
          </li>
        </ul>
        <p>
          Nenhum método de transmissão ou armazenamento é 100% seguro.
          Empenhamos esforços contínuos para proteger seus dados, mas não
          podemos garantir segurança absoluta.
        </p>
      </LegalSection>

      <LegalSection title="8. Seus direitos (LGPD)">
        <p>
          Na qualidade de titular de dados, você pode confirmar a existência de
          tratamento, acessar, corrigir, solicitar anonimização ou eliminação,
          revogar consentimento e solicitar a portabilidade dos seus dados.
        </p>
        <p>
          Para acesso e portabilidade, você pode gerar uma cópia completa
          diretamente em <strong>Conta → Exportar meus dados</strong> (formato
          JSON). Para eliminação, use <strong>Conta → Excluir conta</strong>,
          que remove permanentemente sua conta e listas.
        </p>
        <p>
          Para os demais direitos — ou caso o self-service não atenda — entre em
          contato pelo e-mail{' '}
          <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>. Responderemos
          no prazo legal.
        </p>
      </LegalSection>

      <LegalSection title="9. Retenção de dados">
        <p>
          Mantemos seus dados pessoais enquanto sua conta estiver ativa ou pelo
          período necessário para cumprir as finalidades descritas nesta
          Política. Após o encerramento da conta, seus dados são eliminados,
          ressalvado o prazo mínimo eventualmente exigido pela legislação
          aplicável.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies">
        <p>
          Utilizamos exclusivamente cookies essenciais para autenticação,
          manutenção de sessão e funcionamento básico do Serviço. Não utilizamos
          cookies de rastreamento de terceiros para fins publicitários ou de
          perfilamento comportamental.
        </p>
      </LegalSection>

      <LegalSection title="11. Menores de idade">
        <p>
          O Serviço é destinado a pessoas com idade igual ou superior a 18 anos.
          Não coletamos intencionalmente dados de menores. Caso identifiquemos
          que dados de um menor foram coletados inadvertidamente, tomaremos as
          medidas necessárias para eliminá-los.
        </p>
      </LegalSection>

      <LegalSection title="12. Atualizações desta Política">
        <p>
          Podemos atualizar esta Política periodicamente para refletir mudanças
          em nossas práticas ou na legislação aplicável. Notificaremos sobre
          alterações relevantes por e-mail ou por aviso na Plataforma, e a data
          de &ldquo;Última atualização&rdquo; ao topo será revisada.
        </p>
      </LegalSection>

      <LegalSection title="13. Contato / Encarregado (DPO)">
        <p>
          Para dúvidas, solicitações de titulares ou para exercer seus direitos
          previstos na LGPD, entre em contato:{' '}
          <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
        </p>
        <p>
          Você também tem o direito de peticionar perante a Autoridade Nacional
          de Proteção de Dados (ANPD), caso entenda que seus direitos não foram
          atendidos adequadamente.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
