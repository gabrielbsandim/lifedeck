import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TextField } from '@/components/text-field'

describe('TextField', () => {
  it('associates the label with the input', () => {
    render(<TextField label="Task name" />)
    expect(screen.getByLabelText('Task name')).toBeInTheDocument()
  })

  it('shows an error message and marks the field invalid', () => {
    render(<TextField label="Task name" error="Task name can't be empty" />)
    const input = screen.getByLabelText('Task name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText("Task name can't be empty")).toBeInTheDocument()
  })

  it('renders without a label', () => {
    render(<TextField placeholder="Search" />)
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument()
  })
})
