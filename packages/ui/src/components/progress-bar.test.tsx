import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProgressBar } from '@/components/progress-bar'

describe('ProgressBar', () => {
  it('exposes the clamped value through aria', () => {
    render(<ProgressBar value={60} label="Progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '60')
  })

  it('clamps values below 0 and above 100', () => {
    const { rerender } = render(<ProgressBar value={-10} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
    rerender(<ProgressBar value={140} />)
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    )
  })

  it('celebrates at 100%', () => {
    render(<ProgressBar value={100} />)
    expect(screen.getByRole('progressbar').className).toContain('animate-glow')
  })

  it('does not celebrate below 100%', () => {
    render(<ProgressBar value={99} />)
    expect(screen.getByRole('progressbar').className).not.toContain(
      'animate-glow',
    )
  })
})
