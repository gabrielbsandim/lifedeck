import { asEntityId, civilDate } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import { toEmailLocale, type EmailSender } from '@/ports/email-sender'
import type { UserRepository } from '@/ports/user-repository'
import type { DailyBoardView } from '@/use-cases/get-daily-board'

type GetDailyBoard = (ownerId: string, date: string) => Promise<DailyBoardView>

type Dependencies = {
  getDailyBoard: GetDailyBoard
  users: UserRepository
  emailSender: EmailSender
  clock: Clock
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

    const date = civilDate(clock.now(), user.timezone)
    const board = await getDailyBoard(userId, date)
    const total = board.tasks.length
    const completed = board.tasks.filter(
      task => task.status === 'completed',
    ).length
    const pendingTitles = board.tasks
      .filter(task => task.status === 'pending')
      .map(task => task.title)

    const locale = toEmailLocale(user.locale)
    await emailSender.sendDailyDigest(
      user.email,
      { date, total, completed, pendingTitles },
      locale,
    )

    return { sent: true }
  }
}
