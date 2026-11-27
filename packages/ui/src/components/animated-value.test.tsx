import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type * as FramerMotion from 'framer-motion'
import { AnimatedValue } from '@/components/animated-value'

const motionState = vi.hoisted(() => ({ reduced: false }))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion')
  return { ...actual, useReducedMotion: () => motionState.reduced }
})

describe('AnimatedValue', () => {
  it('shows the new value after a change', () => {
    const { rerender } = render(<AnimatedValue value="R$ 59" />)
    expect(screen.getByText('R$ 59')).toBeVisible()
    rerender(<AnimatedValue value="R$ 6,90" />)
    expect(screen.getByText('R$ 6,90')).toBeInTheDocument()
  })

  it('renders without movement when motion is reduced', () => {
    motionState.reduced = true
    render(<AnimatedValue value={3} className="tabular-nums" />)
    expect(screen.getByText('3').parentElement).toHaveClass('tabular-nums')
    motionState.reduced = false
  })
})
