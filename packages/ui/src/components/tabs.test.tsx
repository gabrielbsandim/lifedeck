import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from '@/components/tabs'

const TABS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
]

describe('Tabs', () => {
  it('marks the active tab as selected', () => {
    render(<Tabs tabs={TABS} value="day" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Daily' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: 'Weekly' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('emits the selected value on click', async () => {
    const onChange = vi.fn()
    render(<Tabs tabs={TABS} value="day" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Weekly' }))
    expect(onChange).toHaveBeenCalledWith('week')
  })
})
