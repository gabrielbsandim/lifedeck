import Link from 'next/link'
import { LegalSection, LegalShell } from '@/components/legal/legal-shell'
import { COMPANY_CNPJ, COMPANY_EMAIL, COMPANY_NAME } from '@/lib/site'

export function TermsScreen() {
  return (
    <LegalShell
      updatedAt="Última atualização: junho de 2026"
      title="Termos de Uso"
      intro={
        <>
          Ao acessar ou utilizar o Lifedeck (&ldquo;Plataforma&rdquo;,
          &ldquo;Serviço&rdquo;), você declara ter lido, compreendido e
          concordado com estes Termos de Uso. Se não concordar com qualquer
          parte, não utilize o Serviço.
        </>
      }
    >
      <LegalSection title="1. O Serviço">
        <p>
          O Lifedeck é um aplicativo de organização pessoal que permite criar
          listas e tarefas, organizar a rotina do dia a dia, compartilhar listas
          com outras pessoas, gerar listas com auxílio de inteligência
          artificial e acompanhar o próprio progresso.
        </p>
        <p>
          A Plataforma está em desenvolvimento contínuo. Funcionalidades,
          limites e condições de uso podem ser adicionados, alterados ou
          removidos ao longo do tempo.
        </p>
      </LegalSection>

      <LegalSection title="2. Cadastro e Conta">
        <p>
          Você pode começar a usar o Serviço como convidado, sem criar uma
          conta. Para preservar suas listas entre dispositivos, você pode criar
          uma conta com e-mail e senha ou entrar com sua conta Google. Ao criar
          uma conta, você:
        </p>
        <ul>
          <li>
            Compromete-se a fornecer informações verdadeiras e mantê-las
            atualizadas;
          </li>
          <li>
            É responsável por manter a confidencialidade de suas credenciais de
            acesso;
          </li>
          <li>Assume responsabilidade pelas atividades realizadas na conta;</li>
          <li>
            Deve nos notificar em caso de suspeita de acesso não autorizado,
            pelo e-mail <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Uso Aceitável">
        <p>
          Você concorda em utilizar a Plataforma exclusivamente para fins
          legítimos e em conformidade com a legislação brasileira aplicável. É
          expressamente vedado:
        </p>
        <ul>
          <li>
            Usar a Plataforma para fins ilegais, fraudulentos ou prejudiciais a
            terceiros;
          </li>
          <li>Acessar dados ou contas de outros usuários sem autorização;</li>
          <li>Transmitir vírus, malware ou qualquer código malicioso;</li>
          <li>
            Realizar engenharia reversa, descompilação ou desmontagem de
            qualquer parte da Plataforma;
          </li>
          <li>
            Utilizar bots, scripts automatizados ou raspagem de dados (scraping)
            sem autorização expressa, ou de forma que sobrecarregue a
            infraestrutura do Serviço.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Seu Conteúdo">
        <p>
          As listas, tarefas, notas e demais conteúdos que você cria continuam
          sendo seus. Você nos concede apenas a licença limitada e necessária
          para armazenar, processar e exibir esse conteúdo com o objetivo de
          operar o Serviço para você e para as pessoas com quem você
          compartilhar suas listas.
        </p>
        <p>
          Você é o único responsável pelo conteúdo que insere na Plataforma e
          por garantir que possui os direitos necessários sobre ele.
        </p>
      </LegalSection>

      <LegalSection title="5. Geração com Inteligência Artificial">
        <p>
          O recurso de geração de listas com IA envia o texto que você fornece a
          um provedor de modelo de linguagem, com o único propósito de gerar um
          rascunho editável de lista. O resultado é uma sugestão automatizada e
          pode conter imprecisões ou omissões.
        </p>
        <p>
          O conteúdo gerado não constitui aconselhamento profissional, jurídico,
          médico ou financeiro. Revise sempre o rascunho antes de utilizá-lo.
        </p>
      </LegalSection>

      <LegalSection title="6. Propriedade Intelectual">
        <p>
          Todo o conteúdo da Plataforma — incluindo código-fonte, design,
          logotipos, marcas, textos, funcionalidades e interfaces — é
          propriedade exclusiva do Lifedeck ou de seus licenciadores, protegido
          pela legislação de propriedade intelectual aplicável.
        </p>
        <p>
          Estes Termos não concedem a você qualquer direito de propriedade sobre
          os ativos intelectuais do Serviço. É vedado reproduzir, distribuir ou
          criar obras derivadas sem autorização prévia e expressa.
        </p>
      </LegalSection>

      <LegalSection title="7. Dados e Privacidade">
        <p>
          O tratamento de seus dados pessoais é regido pela nossa{' '}
          <Link href="/privacy">Política de Privacidade</Link>, elaborada em
          conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº
          13.709/2018). Ao usar o Serviço, você declara ter lido e concordado
          com ela.
        </p>
      </LegalSection>

      <LegalSection title="8. Disponibilidade do Serviço">
        <p>
          Empenhamos esforços razoáveis para manter o Serviço disponível, mas
          não garantimos disponibilidade ininterrupta. O Serviço pode ser
          suspenso temporariamente para manutenção, atualizações ou por razões
          técnicas, sem aviso prévio quando necessário.
        </p>
        <p>
          Por estar em desenvolvimento, funcionalidades podem mudar a qualquer
          momento.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitação de Responsabilidade">
        <p>
          Na máxima extensão permitida pela legislação aplicável, o Lifedeck não
          se responsabiliza por danos indiretos, incidentais, especiais,
          consequenciais ou punitivos decorrentes do uso ou da impossibilidade
          de uso do Serviço, incluindo, sem limitação, perda de dados ou
          interrupção de atividades.
        </p>
      </LegalSection>

      <LegalSection title="10. Encerramento da Conta">
        <p>
          Você pode encerrar sua conta a qualquer momento diretamente na
          Plataforma, em <strong>Conta → Excluir conta</strong>, o que remove
          permanentemente sua conta e suas listas. Antes disso, você pode
          exportar uma cópia dos seus dados em{' '}
          <strong>Conta → Exportar meus dados</strong>.
        </p>
        <p>
          Reservamo-nos o direito de suspender ou encerrar contas que violem
          estes Termos, apresentem comportamento prejudicial à Plataforma ou a
          outros usuários, ou mediante determinação de autoridade competente.
        </p>
      </LegalSection>

      <LegalSection title="11. Modificações dos Termos">
        <p>
          Podemos atualizar estes Termos periodicamente. Quando houver
          alterações relevantes, notificaremos os usuários por e-mail ou
          mediante aviso na Plataforma, com antecedência razoável. O uso
          continuado do Serviço após a publicação das alterações constituirá
          aceitação dos novos termos.
        </p>
      </LegalSection>

      <LegalSection title="12. Legislação e Foro">
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer
          controvérsias oriundas deste instrumento, salvo disposição legal em
          contrário.
        </p>
      </LegalSection>

      <LegalSection title="13. Contato">
        <p>
          O Lifedeck é operado por <strong>{COMPANY_NAME}</strong>, inscrita no
          CNPJ sob o nº {COMPANY_CNPJ}. Dúvidas, sugestões ou solicitações
          relacionadas a estes Termos devem ser encaminhadas para:{' '}
          <a href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
