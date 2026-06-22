import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type * as FramerMotion from 'framer-motion'
import { Celebration } from '@/components/celebration'

const motionState = vi.hoisted(() => ({ reduced: false }))

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof FramerMotion>('framer-motion')
  return { ...actual, useReducedMotion: () => motionState.reduced }
})

describe('Celebration', () => {
  afterEach(() => {
    motionState.reduced = false
  })

  it('renders nothing while inactive', () => {
    render(<Celebration active={false} />)
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
  })

  it('bursts a set of particles once it becomes active', () => {
    const { rerender } = render(<Celebration active={false} />)
    rerender(<Celebration active />)
    const burst = screen.getByTestId('celebration')
    expect(burst.querySelectorAll('span')).toHaveLength(16)
  })

  it('stays silent when the user prefers reduced motion', () => {
    motionState.reduced = true
    render(<Celebration active />)
    expect(screen.queryByTestId('celebration')).not.toBeInTheDocument()
  })
})
