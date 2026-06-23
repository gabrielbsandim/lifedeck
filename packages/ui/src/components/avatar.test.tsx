import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { Avatar } from '@/components/avatar'

describe('Avatar', () => {
  it('derives initials from two names', () => {
    render(<Avatar name="Maria Silva" />)
    expect(screen.getByText('MS')).toBeInTheDocument()
  })

  it('uses a single initial for one name', () => {
    render(<Avatar name="alice" />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('falls back to a placeholder for an empty name', () => {
    render(<Avatar name="   " />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('applies the violet tone and small size', () => {
    render(<Avatar name="Ana" tone="violet" size="sm" />)
    const el = screen.getByText('A')
    expect(el.className).toContain('bg-violet-500')
    expect(el.className).toContain('h-7')
  })

  it('renders an image when a src is given, keeping initials as fallback', () => {
    render(<Avatar name="Maria Silva" src="https://blob.test/a.webp" />)
    const img = screen.getByRole('img', { name: 'Maria Silva' })
    expect(img).toHaveAttribute('src', 'https://blob.test/a.webp')
    expect(screen.getByText('MS')).toBeInTheDocument()
  })

  it('falls back to initials when the image fails to load', () => {
    render(<Avatar name="Maria Silva" src="https://blob.test/bad.webp" />)
    fireEvent.error(screen.getByRole('img', { name: 'Maria Silva' }))
    expect(
      screen.queryByRole('img', { name: 'Maria Silva' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('MS')).toBeInTheDocument()
  })
})
