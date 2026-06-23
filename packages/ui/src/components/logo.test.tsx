import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo, LogoMark, Wordmark } from '@/components/logo'

describe('LogoMark', () => {
  it('renders an accessible mark with the default label', () => {
    render(<LogoMark />)
    expect(screen.getByRole('img', { name: 'Lifedeck' })).toBeInTheDocument()
  })

  it('accepts a custom title and size', () => {
    render(<LogoMark size={48} title="Lifedeck home" />)
    const mark = screen.getByRole('img', { name: 'Lifedeck home' })
    expect(mark).toHaveAttribute('width', '48')
  })

  it('renders the monochrome variant with a knockout dot', () => {
    const { container } = render(<LogoMark monochrome />)
    expect(container.querySelector('mask')).not.toBeNull()
    expect(container.querySelector('g')).toHaveAttribute('fill', 'currentColor')
  })
})

describe('Wordmark', () => {
  it('renders the brand name', () => {
    render(<Wordmark />)
    expect(screen.getByText('Lifedeck')).toBeInTheDocument()
  })
})

describe('Logo', () => {
  it('renders the mark alone by default', () => {
    render(<Logo />)
    expect(screen.getByRole('img', { name: 'Lifedeck' })).toBeInTheDocument()
    expect(screen.queryByText('Lifedeck')).toBeNull()
  })

  it('renders a horizontal lockup with the wordmark', () => {
    render(<Logo withWordmark />)
    expect(screen.getByRole('img', { name: 'Lifedeck' })).toBeInTheDocument()
    expect(screen.getByText('Lifedeck')).toBeInTheDocument()
  })

  it('renders a stacked lockup', () => {
    render(<Logo withWordmark layout="stacked" />)
    expect(screen.getByText('Lifedeck')).toBeInTheDocument()
  })
})
