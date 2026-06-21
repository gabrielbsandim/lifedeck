import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState } from '@/components/empty-state'

describe('EmptyState', () => {
  it('renders the title only', () => {
    render(<EmptyState title="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders icon, description and action when provided', () => {
    render(
      <EmptyState
        title="Nothing here yet"
        description="Add your first task."
        icon={<svg data-testid="icon" />}
        action={<button>Add</button>}
      />,
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Add your first task.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })
})
