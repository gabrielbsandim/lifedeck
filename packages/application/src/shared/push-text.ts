import type { MessageLanguage } from '@lifedeck/domain'

// Titles for the lock screen, in the three languages the assistant speaks. The
// bodies mostly reuse the copy the caller already composed for WhatsApp and the
// bell, so only the short headline and the two cases with no existing sentence
// (a reminder and an assignment) live here.
type Titles = {
  reminder: string
  brief: string
  nudge: string
  checkin: string
  assigned: string
}

const TITLES: Record<MessageLanguage, Titles> = {
  en: {
    reminder: 'Reminder',
    brief: 'Your day',
    nudge: 'Still on your list',
    checkin: 'Habit check-in',
    assigned: 'New task for you',
  },
  pt: {
    reminder: 'Lembrete',
    brief: 'Seu dia',
    nudge: 'Ainda na sua lista',
    checkin: 'Check-in de hábito',
    assigned: 'Nova tarefa para você',
  },
  es: {
    reminder: 'Recordatorio',
    brief: 'Tu día',
    nudge: 'Sigue en tu lista',
    checkin: 'Check-in de hábito',
    assigned: 'Nueva tarea para ti',
  },
}

export function pushTitles(language: MessageLanguage): Titles {
  return TITLES[language]
}

// The caller passes a time already formatted in the user's locale and timezone.
export function reminderPushBody(title: string, when: string): string {
  return `${title} · ${when}`
}

export function assignedPushBody(taskTitle: string, listTitle: string): string {
  return `${taskTitle} · ${listTitle}`
}
