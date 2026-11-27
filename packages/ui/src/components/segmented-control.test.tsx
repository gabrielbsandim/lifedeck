import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from '@/components/segmented-control'

const OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'annual', label: 'Annual' },
] as const

describe('SegmentedControl', () => {
  it('names the group and presses only the selected option', () => {
    render(
      <SegmentedControl
        options={OPTIONS}
        value="annual"
        onChange={() => {}}
        label="Billing period"
      />,
    )
    expect(screen.getByRole('group', { name: 'Billing period' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Annual' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('emits the chosen value', async () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        options={OPTIONS}
        value="annual"
        onChange={onChange}
        label="Billing period"
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Monthly' }))
    expect(onChange).toHaveBeenCalledWith('monthly')
  })
})
