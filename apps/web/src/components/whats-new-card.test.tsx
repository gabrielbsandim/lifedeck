import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getMessages } from '@lifedeck/i18n'
import { MessagesProvider } from '@/lib/i18n/messages-provider'
import { WhatsNewCard } from '@/components/whats-new-card'
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/site'

function renderCard(locale: 'en' | 'pt') {
  return render(
    <MessagesProvider locale={locale} messages={getMessages(locale)}>
      <WhatsNewCard />
    </MessagesProvider>,
  )
}

describe('WhatsNewCard', () => {
  it('lists the release highlights', () => {
    renderCard('en')

    expect(screen.getByRole('heading', { name: "What's new" })).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })

  it('links both store badges in the reader’s language', () => {
    renderCard('pt')

    const apple = screen.getByAltText('Baixar na App Store')
    const play = screen.getByAltText('Disponível no Google Play')
    expect(apple).toHaveAttribute('src', '/badges/app-store-pt.svg')
    expect(play).toHaveAttribute('src', '/badges/google-play-pt.png')
    expect(apple.closest('a')).toHaveAttribute('href', APP_STORE_URL)
    expect(play.closest('a')).toHaveAttribute('href', GOOGLE_PLAY_URL)
  })
})
