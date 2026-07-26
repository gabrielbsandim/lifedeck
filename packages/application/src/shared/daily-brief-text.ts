import type { MessageLanguage } from '@lifedeck/domain'

// The good-morning WhatsApp brief, composed as free-form text for a send inside
// WhatsApp's 24h window. Copy is inlined in the three languages the assistant
// speaks, mirroring whatsapp-reminder-text; the caller pre-localizes the date and
// event times. Once the window closes the brief goes out as a template instead,
// whose single body param must be one line: composeDailyBriefParam builds that
// short version.

export type DailyBriefEvent = { time: string; title: string }

export type DailyBriefWeather = {
  location: string
  tempMinC: number | null
  tempMaxC: number | null
  precipitationProbabilityPct: number | null
}

export type DailyBriefData = {
  /** Localized short date, e.g. "Mon, Jul 20", computed by the caller. */
  dateLabel: string
  pendingTitles: string[]
  doneCount: number
  totalCount: number
  carriedOver: number
  events: DailyBriefEvent[]
  weather: DailyBriefWeather | null
}

// How many tasks / events to list before collapsing the rest into "+N more",
// so a heavy day never sends a wall of text.
const MAX_LISTED = 5

type Copy = {
  greeting: string
  today: string
  done: (done: number, total: number) => string
  noTasks: string
  allCaughtUp: string
  more: (n: number) => string
  agenda: string
  noEvents: string
  rain: (p: number) => string
  carriedOver: (n: number) => string
  // One-line template variants: a template body param cannot hold the bullet
  // list, so the counts are spelled out instead.
  pendingCount: (n: number) => string
  eventCount: (n: number) => string
  nothingToday: string
}

const COPY: Record<MessageLanguage, Copy> = {
  en: {
    greeting: 'Good morning',
    today: 'Today',
    done: (d, t) => `${d}/${t} done`,
    noTasks: 'No tasks for today.',
    allCaughtUp: "You're all caught up for today.",
    more: n => `+${n} more`,
    agenda: 'Agenda',
    noEvents: 'Nothing scheduled.',
    rain: p => `rain ${p}%`,
    carriedOver: n => `${n} carried over from earlier.`,
    pendingCount: n => (n === 1 ? '1 task pending' : `${n} tasks pending`),
    eventCount: n => (n === 1 ? '1 event' : `${n} events`),
    nothingToday: 'nothing on your plate',
  },
  pt: {
    greeting: 'Bom dia',
    today: 'Hoje',
    done: (d, t) => `${d}/${t} concluídas`,
    noTasks: 'Nenhuma tarefa para hoje.',
    allCaughtUp: 'Você está em dia por hoje.',
    more: n => `+${n} a mais`,
    agenda: 'Agenda',
    noEvents: 'Nada agendado.',
    rain: p => `chuva ${p}%`,
    carriedOver: n => `${n} vieram de dias anteriores.`,
    pendingCount: n =>
      n === 1 ? '1 tarefa pendente' : `${n} tarefas pendentes`,
    eventCount: n => (n === 1 ? '1 compromisso' : `${n} compromissos`),
    nothingToday: 'nada pendente',
  },
  es: {
    greeting: 'Buenos días',
    today: 'Hoy',
    done: (d, t) => `${d}/${t} completadas`,
    noTasks: 'Sin tareas para hoy.',
    allCaughtUp: 'Estás al día por hoy.',
    more: n => `+${n} más`,
    agenda: 'Agenda',
    noEvents: 'Nada agendado.',
    rain: p => `lluvia ${p}%`,
    carriedOver: n => `${n} vienen de días anteriores.`,
    pendingCount: n =>
      n === 1 ? '1 tarea pendiente' : `${n} tareas pendientes`,
    eventCount: n => (n === 1 ? '1 evento' : `${n} eventos`),
    nothingToday: 'nada pendiente',
  },
}

function weatherLine(copy: Copy, weather: DailyBriefWeather): string | null {
  const { tempMinC, tempMaxC, precipitationProbabilityPct } = weather
  if (tempMinC === null && tempMaxC === null) {
    return null
  }
  const range =
    tempMinC !== null && tempMaxC !== null
      ? `${Math.round(tempMinC)}–${Math.round(tempMaxC)}°C`
      : `${Math.round((tempMaxC ?? tempMinC) as number)}°C`
  const rain =
    precipitationProbabilityPct !== null && precipitationProbabilityPct > 0
      ? `, ${copy.rain(precipitationProbabilityPct)}`
      : ''
  return `🌤️ ${weather.location}: ${range}${rain}`
}

export function composeDailyBrief(
  language: MessageLanguage,
  data: DailyBriefData,
): string {
  const copy = COPY[language]
  const sections: string[] = [`☀️ ${copy.greeting}!`]

  // Tasks.
  const taskLines: string[] = [`*${copy.today} • ${data.dateLabel}*`]
  if (data.totalCount === 0) {
    taskLines.push(copy.noTasks)
  } else {
    taskLines.push(copy.done(data.doneCount, data.totalCount))
    if (data.pendingTitles.length === 0) {
      taskLines.push(copy.allCaughtUp)
    } else {
      for (const title of data.pendingTitles.slice(0, MAX_LISTED)) {
        taskLines.push(`• ${title}`)
      }
      const extra = data.pendingTitles.length - MAX_LISTED
      if (extra > 0) {
        taskLines.push(copy.more(extra))
      }
    }
  }
  sections.push(taskLines.join('\n'))

  // Agenda.
  const agendaLines: string[] = [`📅 ${copy.agenda}`]
  if (data.events.length === 0) {
    agendaLines.push(copy.noEvents)
  } else {
    for (const event of data.events.slice(0, MAX_LISTED)) {
      agendaLines.push(`• ${event.time} ${event.title}`)
    }
    const extra = data.events.length - MAX_LISTED
    if (extra > 0) {
      agendaLines.push(copy.more(extra))
    }
  }
  sections.push(agendaLines.join('\n'))

  // Weather (optional).
  if (data.weather) {
    const line = weatherLine(copy, data.weather)
    if (line) {
      sections.push(line)
    }
  }

  // Carry-over (optional).
  if (data.carriedOver > 0) {
    sections.push(`↩️ ${copy.carriedOver(data.carriedOver)}`)
  }

  return sections.join('\n\n')
}

// The same brief squeezed into one line, for the `daily_brief` template's single
// body param once WhatsApp's free-form window has closed. It deliberately drops
// the task and event titles: a template param cannot carry a bullet list, and the
// point of the fallback is to tell the user their day is waiting, not to reprint
// it. The template's own static copy provides the greeting and the nudge to open
// the app.
export function composeDailyBriefParam(
  language: MessageLanguage,
  data: DailyBriefData,
): string {
  const copy = COPY[language]
  const parts: string[] = [`${copy.today} • ${data.dateLabel}`]

  if (data.pendingTitles.length > 0) {
    parts.push(copy.pendingCount(data.pendingTitles.length))
  } else if (data.totalCount > 0) {
    parts.push(copy.done(data.doneCount, data.totalCount))
  }
  if (data.events.length > 0) {
    const first = data.events[0] as DailyBriefEvent
    parts.push(
      data.events.length === 1
        ? `${copy.eventCount(1)} (${first.time})`
        : `${copy.eventCount(data.events.length)} (${first.time}…)`,
    )
  }
  if (data.weather) {
    const line = weatherLine(copy, data.weather)
    if (line) {
      // The emoji and place name are noise on a single line; keep the numbers.
      parts.push(line.replace(/^🌤️\s*/, '').replace(/^[^:]+:\s*/, ''))
    }
  }
  if (parts.length === 1) {
    parts.push(copy.nothingToday)
  }

  return parts.join(' • ')
}
