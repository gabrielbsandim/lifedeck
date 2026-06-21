import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge } from '@/components/badge'

describe('Badge', () => {
  it('renders neutral tone by default', () => {
    render(<Badge>Daily</Badge>)
    expect(screen.getByText('Daily').className).toContain('text-ink-600')
  })

  it('applies a chosen tone', () => {
    render(<Badge tone="shared">Shared</Badge>)
    expect(screen.getByText('Shared').className).toContain('text-violet-500')
  })
})
