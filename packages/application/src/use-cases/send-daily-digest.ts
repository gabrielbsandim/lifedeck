import { asEntityId } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { EmailLocale, EmailSender } from '@/ports/email-sender'
import type { UserRepository } from '@/ports/user-repository'
import type { DailyBoardView } from '@/use-cases/get-daily-board'

type GetDailyBoard = (ownerId: string, date: string) => Promise<DailyBoardView>

type Dependencies = {
  getDailyBoard: GetDailyBoard
  users: UserRepository
  emailSender: EmailSender
  clock: Clock
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function makeSendDailyDigest({
  getDailyBoard,
  users,
  emailSender,
  clock,
}: Dependencies) {
  return async function sendDailyDigest(
    userId: string,
  ): Promise<{ sent: boolean }> {
    const user = await users.findById(asEntityId(userId))
    if (!user?.email) {
      return { sent: false }
    }

    const date = toIsoDate(clock.now())
    const board = await getDailyBoard(userId, date)
    const total = board.tasks.length
    const completed = board.tasks.filter(
      task => task.status === 'completed',
    ).length
    const pendingTitles = board.tasks
      .filter(task => task.status === 'pending')
      .map(task => task.title)

    const locale: EmailLocale = user.locale === 'pt' ? 'pt' : 'en'
    await emailSender.sendDailyDigest(
      user.email,
      { date, total, completed, pendingTitles },
      locale,
    )

    return { sent: true }
  }
}
