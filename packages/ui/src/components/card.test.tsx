import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '@/components/card'

describe('Card', () => {
  it('renders children and merges class names', () => {
    render(<Card className="p-6">Body</Card>)
    const card = screen.getByText('Body')
    expect(card.className).toContain('p-6')
    expect(card.className).toContain('rounded-2xl')
  })
})
