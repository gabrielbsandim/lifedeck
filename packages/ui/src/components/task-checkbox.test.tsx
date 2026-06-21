import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCheckbox } from './task-checkbox'

describe('TaskCheckbox', () => {
  it('reflects the checked state through aria', () => {
    render(<TaskCheckbox checked label="Done" onChange={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Done' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('toggles to the opposite value on click', async () => {
    const onChange = vi.fn()
    render(<TaskCheckbox checked={false} label="Done" onChange={onChange} />)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Done' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not fire when disabled', async () => {
    const onChange = vi.fn()
    render(
      <TaskCheckbox
        checked={false}
        label="Done"
        onChange={onChange}
        disabled
      />,
    )
    await userEvent.click(screen.getByRole('checkbox', { name: 'Done' }))
    expect(onChange).not.toHaveBeenCalled()
  })
})
