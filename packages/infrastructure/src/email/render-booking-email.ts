import {
  formatEventTime,
  type BookingNotice,
  type BookingNoticeKind,
  type EmailLocale,
} from '@lifedeck/application'
import type { BookingLocation } from '@lifedeck/domain'
import { buildBookingInvite } from '@/calendar/ical'
import {
  LINK_FALLBACK,
  button,
  escapeHtml,
  layout,
  paragraph,
} from '@/email/render-email'

export type RenderedBookingEmail = {
  subject: string
  html: string
  // Null when there is nothing to put in a calendar yet (a pending request).
  ics: string | null
}

type KindCopy = {
  subject: (service: string, host: string) => string
  title: string
  intro: (service: string, host: string) => string
}

type LocaleCopy = {
  kinds: Record<BookingNoticeKind, KindCopy>
  when: string
  where: string
  reason: string
  manage: string
  places: Record<BookingLocation['kind'], string>
}

const COPY: Record<EmailLocale, LocaleCopy> = {
  en: {
    kinds: {
      requested: {
        subject: (s, h) => `Request received: ${s} with ${h}`,
        title: 'Request received',
        intro: (s, h) =>
          `Your request for <strong>${s}</strong> with <strong>${h}</strong> is waiting for confirmation.`,
      },
      confirmed: {
        subject: (s, h) => `Confirmed: ${s} with ${h}`,
        title: 'Booking confirmed',
        intro: (s, h) =>
          `Your <strong>${s}</strong> with <strong>${h}</strong> is booked.`,
      },
      rescheduled: {
        subject: (s, h) => `New time: ${s} with ${h}`,
        title: 'Booking moved',
        intro: (s, h) =>
          `Your <strong>${s}</strong> with <strong>${h}</strong> has a new time.`,
      },
      cancelled: {
        subject: (s, h) => `Cancelled: ${s} with ${h}`,
        title: 'Booking cancelled',
        intro: (s, h) =>
          `Your <strong>${s}</strong> with <strong>${h}</strong> was cancelled.`,
      },
      declined: {
        subject: (s, h) => `Not confirmed: ${s} with ${h}`,
        title: 'Request declined',
        intro: (s, h) =>
          `Your request for <strong>${s}</strong> with <strong>${h}</strong> could not be confirmed.`,
      },
      reminder: {
        subject: (s, h) => `Coming up: ${s} with ${h}`,
        title: 'See you soon',
        intro: (s, h) =>
          `A reminder of your <strong>${s}</strong> with <strong>${h}</strong>.`,
      },
    },
    when: 'When',
    where: 'Where',
    reason: 'Note',
    manage: 'Reschedule or cancel',
    places: {
      'online-meet': 'Online meeting',
      'online-link': 'Online',
      'in-person': 'In person',
      phone: 'By phone',
    },
  },
  pt: {
    kinds: {
      requested: {
        subject: (s, h) => `Pedido recebido: ${s} com ${h}`,
        title: 'Pedido recebido',
        intro: (s, h) =>
          `Seu pedido de <strong>${s}</strong> com <strong>${h}</strong> aguarda confirmação.`,
      },
      confirmed: {
        subject: (s, h) => `Confirmado: ${s} com ${h}`,
        title: 'Agendamento confirmado',
        intro: (s, h) =>
          `Seu horário de <strong>${s}</strong> com <strong>${h}</strong> está marcado.`,
      },
      rescheduled: {
        subject: (s, h) => `Novo horário: ${s} com ${h}`,
        title: 'Agendamento remarcado',
        intro: (s, h) =>
          `Seu horário de <strong>${s}</strong> com <strong>${h}</strong> mudou.`,
      },
      cancelled: {
        subject: (s, h) => `Cancelado: ${s} com ${h}`,
        title: 'Agendamento cancelado',
        intro: (s, h) =>
          `Seu horário de <strong>${s}</strong> com <strong>${h}</strong> foi cancelado.`,
      },
      declined: {
        subject: (s, h) => `Não confirmado: ${s} com ${h}`,
        title: 'Pedido recusado',
        intro: (s, h) =>
          `Seu pedido de <strong>${s}</strong> com <strong>${h}</strong> não pôde ser confirmado.`,
      },
      reminder: {
        subject: (s, h) => `Em breve: ${s} com ${h}`,
        title: 'Até logo',
        intro: (s, h) =>
          `Lembrete do seu horário de <strong>${s}</strong> com <strong>${h}</strong>.`,
      },
    },
    when: 'Quando',
    where: 'Onde',
    reason: 'Observação',
    manage: 'Remarcar ou cancelar',
    places: {
      'online-meet': 'Reunião online',
      'online-link': 'Online',
      'in-person': 'Presencial',
      phone: 'Por telefone',
    },
  },
  es: {
    kinds: {
      requested: {
        subject: (s, h) => `Solicitud recibida: ${s} con ${h}`,
        title: 'Solicitud recibida',
        intro: (s, h) =>
          `Tu solicitud de <strong>${s}</strong> con <strong>${h}</strong> espera confirmación.`,
      },
      confirmed: {
        subject: (s, h) => `Confirmado: ${s} con ${h}`,
        title: 'Reserva confirmada',
        intro: (s, h) =>
          `Tu <strong>${s}</strong> con <strong>${h}</strong> está reservado.`,
      },
      rescheduled: {
        subject: (s, h) => `Nuevo horario: ${s} con ${h}`,
        title: 'Reserva movida',
        intro: (s, h) =>
          `Tu <strong>${s}</strong> con <strong>${h}</strong> tiene un nuevo horario.`,
      },
      cancelled: {
        subject: (s, h) => `Cancelado: ${s} con ${h}`,
        title: 'Reserva cancelada',
        intro: (s, h) =>
          `Tu <strong>${s}</strong> con <strong>${h}</strong> fue cancelado.`,
      },
      declined: {
        subject: (s, h) => `No confirmado: ${s} con ${h}`,
        title: 'Solicitud rechazada',
        intro: (s, h) =>
          `Tu solicitud de <strong>${s}</strong> con <strong>${h}</strong> no pudo confirmarse.`,
      },
      reminder: {
        subject: (s, h) => `Pronto: ${s} con ${h}`,
        title: 'Hasta pronto',
        intro: (s, h) =>
          `Un recordatorio de tu <strong>${s}</strong> con <strong>${h}</strong>.`,
      },
    },
    when: 'Cuándo',
    where: 'Dónde',
    reason: 'Nota',
    manage: 'Cambiar o cancelar',
    places: {
      'online-meet': 'Reunión en línea',
      'online-link': 'En línea',
      'in-person': 'Presencial',
      phone: 'Por teléfono',
    },
  },
}

const METHOD: Record<BookingNoticeKind, 'PUBLISH' | 'CANCEL' | null> = {
  requested: null,
  confirmed: 'PUBLISH',
  rescheduled: 'PUBLISH',
  reminder: 'PUBLISH',
  cancelled: 'CANCEL',
  declined: 'CANCEL',
}

function placeDetail(
  location: BookingLocation,
  meetingUrl: string | null,
): string | null {
  const details: Record<BookingLocation['kind'], string | null> = {
    'online-link': location.kind === 'online-link' ? location.url : null,
    'in-person': location.kind === 'in-person' ? location.address : null,
    'online-meet': meetingUrl,
    phone: null,
  }
  return details[location.kind]
}

function row(label: string, value: string): string {
  return paragraph(`<strong>${escapeHtml(label)}:</strong> ${value}`)
}

export function renderBookingEmail(
  notice: BookingNotice,
  locale: EmailLocale,
): RenderedBookingEmail {
  const copy = COPY[locale]
  const kind = copy.kinds[notice.kind]
  const service = escapeHtml(notice.serviceName)
  const host = escapeHtml(notice.hostName)
  const start = notice.startsAt.toISOString()
  const when = `${formatEventTime(start, locale, notice.timeZone)} (${notice.timeZone})`
  const detail = placeDetail(notice.location, notice.meetingUrl)
  const place = copy.places[notice.location.kind]
  const where = detail ? `${place}: ${escapeHtml(detail)}` : place
  const body = [
    paragraph(kind.intro(service, host)),
    row(copy.when, escapeHtml(when)),
    row(copy.where, where),
    notice.reason ? row(copy.reason, escapeHtml(notice.reason)) : '',
    notice.manageUrl
      ? button(escapeHtml(notice.manageUrl), copy.manage, LINK_FALLBACK[locale])
      : '',
  ].join('')

  const method = METHOD[notice.kind]
  const ics = method
    ? buildBookingInvite({
        uid: `booking-${notice.bookingId}@lifedeck`,
        method,
        sequence: notice.sequence,
        summary: `${notice.serviceName} · ${notice.hostName}`,
        description: notice.manageUrl,
        location: detail ?? place,
        startsAt: notice.startsAt,
        endsAt: notice.endsAt,
        dtstamp: new Date(notice.sequence * 1000),
      })
    : null

  return {
    subject: kind.subject(notice.serviceName, notice.hostName),
    html: layout(kind.title, body, locale),
    ics,
  }
}
