import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { getMessages } from '@lifedeck/i18n'
import { MessagesProvider } from '@/lib/i18n/messages-provider'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'
import { AssistantChat } from '@/components/assistant-chat'

const push = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}))

const en = getMessages('en')

function renderChat() {
  const { Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MessagesProvider locale="en" messages={en}>
        <AssistantChat />
      </MessagesProvider>
    </Wrapper>,
  )
}

function type(value: string) {
  fireEvent.change(screen.getByPlaceholderText(en.assistant.inputPlaceholder), {
    target: { value },
  })
}

describe('AssistantChat', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    push.mockClear()
  })

  it('shows the welcome message and suggestion chips on an empty thread', () => {
    renderChat()
    expect(screen.getByText(en.assistant.welcomeTitle)).toBeInTheDocument()
    expect(screen.getByText(en.assistant.chips.addTask)).toBeInTheDocument()
  })

  it('sends a typed message and renders the reply with an action card', async () => {
    mockFetchOnce({
      data: {
        text: 'Added it.',
        actions: [
          {
            tool: 'addTask',
            input: { title: 'Buy milk' },
            result: { id: 't1' },
          },
        ],
      },
    })
    renderChat()

    type('buy milk')
    fireEvent.click(screen.getByLabelText(en.assistant.send))

    expect(await screen.findByText('Added it.')).toBeInTheDocument()
    expect(screen.getByText(en.assistant.cards.taskAdded)).toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('sends a chip tap as a message', async () => {
    mockFetchOnce({ data: { text: 'On it.', actions: [] } })
    renderChat()

    fireEvent.click(screen.getByText(en.assistant.chips.today))

    expect(await screen.findByText('On it.')).toBeInTheDocument()
  })

  it('shows the mic when the field is empty and the send button once typing', () => {
    renderChat()
    expect(screen.getByLabelText(en.assistant.recordAudio)).toBeInTheDocument()

    type('hello')
    expect(screen.getByLabelText(en.assistant.send)).toBeInTheDocument()
    expect(
      screen.queryByLabelText(en.assistant.recordAudio),
    ).not.toBeInTheDocument()
  })

  it('sends an attached image and renders its bubble', async () => {
    const original = URL.createObjectURL
    URL.createObjectURL = () => 'blob:mock'
    try {
      mockFetchOnce({ data: { text: 'Nice photo.', actions: [] } })
      const { container } = renderChat()

      const fileInput = container.querySelector(
        'input[type="file"]',
      ) as HTMLInputElement
      fireEvent.change(fileInput, {
        target: {
          files: [
            new File([new Uint8Array([1])], 'p.png', { type: 'image/png' }),
          ],
        },
      })

      expect(await screen.findByText('Nice photo.')).toBeInTheDocument()
      expect(
        screen.getByRole('img', { name: en.assistant.photo }),
      ).toBeInTheDocument()
    } finally {
      URL.createObjectURL = original
    }
  })

  it('shows an error with a retry when the request fails', async () => {
    mockFetchOnce(
      { error: { code: 'INTERNAL_ERROR', message: 'boom' } },
      false,
      500,
    )
    renderChat()

    type('hi')
    fireEvent.click(screen.getByLabelText(en.assistant.send))

    expect(await screen.findByText(en.assistant.errorTitle)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: en.assistant.retry }),
    ).toBeInTheDocument()
  })

  it('shows the Pro upsell when the assistant is locked', async () => {
    mockFetchOnce(
      { error: { code: 'ASSISTANT_LOCKED', message: 'locked' } },
      false,
      403,
    )
    renderChat()

    type('hi')
    fireEvent.click(screen.getByLabelText(en.assistant.send))

    expect(
      await screen.findByText(en.assistant.lockedTitle),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: en.assistant.upgrade }))
    expect(push).toHaveBeenCalledWith('/settings/billing')
  })
})
