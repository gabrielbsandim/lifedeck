import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'
import { RequireAuth } from '@/components/require-auth'

const replace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}))

function renderGuard() {
  const { Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <RequireAuth>
        <p>protected content</p>
      </RequireAuth>
    </Wrapper>,
  )
}

describe('RequireAuth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    replace.mockClear()
  })

  it('renders children once a session resolves', async () => {
    mockFetchOnce({ data: { id: 'u1', displayName: 'Gabriel' } })

    renderGuard()

    expect(await screen.findByText('protected content')).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it('redirects to the sign-in home when signed out', async () => {
    mockFetchOnce(
      { error: { code: 'UNAUTHORIZED', message: 'no' } },
      false,
      401,
    )

    renderGuard()

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })
})
