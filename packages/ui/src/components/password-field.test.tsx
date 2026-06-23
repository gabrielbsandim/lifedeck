import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PasswordField } from '@/components/password-field'

describe('PasswordField', () => {
  it('hides the value by default and reveals it on toggle', async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Password" showLabel="Show" hideLabel="Hide" />)

    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show' }))
    expect(input).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide' }))
    expect(input).toHaveAttribute('type', 'password')
  })

  it('shows an error message and marks the field invalid', () => {
    render(<PasswordField label="Password" error="Too short" />)
    const input = screen.getByLabelText('Password')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Too short')).toBeInTheDocument()
  })

  it('defaults the toggle to a show-password label', () => {
    render(<PasswordField label="Password" />)
    expect(
      screen.getByRole('button', { name: 'Show password' }),
    ).toBeInTheDocument()
  })
})
