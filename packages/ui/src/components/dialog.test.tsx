import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Dialog } from '@/components/dialog'

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Edit task">
        body
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the title and content when open', () => {
    render(
      <Dialog open onClose={() => {}} title="Edit task">
        <p>body</p>
      </Dialog>,
    )
    expect(
      screen.getByRole('dialog', { name: 'Edit task' }),
    ).toBeInTheDocument()
    expect(screen.getByText('body')).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Edit task">
        body
      </Dialog>,
    )
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus into the dialog on open and restores it on close', () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { rerender } = render(
      <Dialog open onClose={() => {}} title="Edit task">
        <button>Inside</button>
      </Dialog>,
    )
    expect(screen.getByRole('dialog')).toHaveFocus()

    rerender(
      <Dialog open={false} onClose={() => {}} title="Edit task">
        <button>Inside</button>
      </Dialog>,
    )
    expect(document.activeElement).toBe(trigger)
    trigger.remove()
  })

  it('traps Tab focus within the dialog', async () => {
    const user = userEvent.setup()
    render(
      <Dialog open onClose={() => {}} title="Edit task">
        <button>First</button>
        <button>Last</button>
      </Dialog>,
    )
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })

    last.focus()
    await user.tab()
    expect(first).toHaveFocus()

    await user.tab({ shift: true })
    expect(last).toHaveFocus()
  })

  it('closes on overlay click but not on content click', async () => {
    const onClose = vi.fn()
    render(
      <Dialog open onClose={onClose} title="Edit task" variant="sheet">
        <p>body</p>
      </Dialog>,
    )
    await userEvent.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('dialog').parentElement as HTMLElement,
    )
    expect(onClose).toHaveBeenCalledOnce()
  })
})
