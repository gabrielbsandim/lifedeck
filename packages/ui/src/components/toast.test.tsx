import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toast } from '@/components/toast'

describe('Toast', () => {
  it('renders a success toast by default', () => {
    render(<Toast>Task added</Toast>)
    expect(screen.getByRole('status')).toHaveTextContent('Task added')
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  it('renders an error toast', () => {
    render(<Toast tone="error">Could not save</Toast>)
    expect(screen.getByText('!')).toBeInTheDocument()
  })
})
