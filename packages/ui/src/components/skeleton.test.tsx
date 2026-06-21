import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from '@/components/skeleton'

describe('Skeleton', () => {
  it('renders a shimmering placeholder and merges class names', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('animate-shimmer')
    expect(el.className).toContain('h-4')
  })
})
