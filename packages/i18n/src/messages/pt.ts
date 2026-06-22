import type { Messages } from '@/messages/types'

export const pt: Messages = {
  app: {
    name: 'TaskIn',
    tagline: 'Planeje seu dia, compartilhe suas listas.',
  },
  onboarding: {
    title: 'Bem-vindo ao TaskIn',
    subtitle: 'Diga seu nome para começar sua lista do dia.',
    namePlaceholder: 'Seu nome',
    start: 'Começar',
  },
  common: {
    loading: 'Carregando…',
    error: 'Algo deu errado.',
    retry: 'Tentar de novo',
  },
  nav: {
    today: 'Hoje',
    lists: 'Listas',
    analytics: 'Análises',
  },
  task: {
    add: 'Adicionar tarefa',
    empty: 'Nada aqui ainda. Adicione sua primeira tarefa.',
    completed: 'Concluída',
    pending: 'Pendente',
    allDone: 'Tudo pronto — ótimo trabalho! 🎉',
    progress: '{done} de {total} concluídas',
  },
  list: {
    daily: 'Lista do dia',
    shared: 'Compartilhadas com você',
    share: 'Compartilhar',
  },
}
