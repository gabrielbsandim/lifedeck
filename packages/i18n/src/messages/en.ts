import type { Messages } from '@/messages/types'

export const en: Messages = {
  app: {
    name: 'TaskIn',
    tagline: 'Plan your day, share your lists.',
  },
  onboarding: {
    title: 'Welcome to TaskIn',
    subtitle: 'Tell us your name to start your daily list.',
    namePlaceholder: 'Your name',
    start: 'Start',
  },
  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    retry: 'Try again',
  },
  nav: {
    today: 'Today',
    lists: 'Lists',
    analytics: 'Analytics',
  },
  task: {
    add: 'Add a task',
    empty: 'Nothing here yet. Add your first task.',
    completed: 'Completed',
    pending: 'Pending',
    allDone: 'All done — lovely work, you two! 🎉',
    progress: '{done} of {total} done',
  },
  list: {
    daily: 'Daily list',
    shared: 'Shared with you',
    share: 'Share',
  },
}
