export type Messages = {
  app: {
    name: string
    tagline: string
  }
  onboarding: {
    title: string
    subtitle: string
    namePlaceholder: string
    start: string
  }
  common: {
    loading: string
    error: string
    retry: string
  }
  recurring: {
    manage: string
    title: string
    subtitle: string
    add: string
    empty: string
    titlePlaceholder: string
    frequency: string
    daily: string
    weekly: string
    monthly: string
    interval: string
    weekdays: string
    monthday: string
    startDate: string
    until: string
    save: string
    cancel: string
    edit: string
    delete: string
    back: string
  }
  nav: {
    today: string
    lists: string
    analytics: string
  }
  task: {
    add: string
    empty: string
    completed: string
    pending: string
    allDone: string
    progress: string
  }
  list: {
    daily: string
    shared: string
    share: string
  }
}
