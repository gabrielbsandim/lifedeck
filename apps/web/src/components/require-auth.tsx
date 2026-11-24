'use client'

import { useEffect, type ReactNode } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@lifedeck/ui'
import { useSession } from '@/lib/api/use-session'
import { signInPath } from '@/lib/navigation/return-to'

// Gate for the authenticated app shell. The home route already swaps to the
// onboarding/sign-in card when there is no session; the inner pages historically
// rendered their chrome and then failed every request with a 401 ("Something
// went wrong"). This mirrors the home behavior for them: while the session is
// resolving we show a placeholder, and once it resolves to "signed out" we send
// the user to the sign-in screen (the home route) instead of a broken shell,
// carrying the page they asked for so signing in lands them back on it.
//
// React Query refetches the session on mount and window focus, so a session that
// expires mid-visit is caught here on the next navigation or refocus without any
// refresh-token plumbing.
export function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const router = useRouter()

  const signedOut = !session.isPending && !session.data

  useEffect(() => {
    if (signedOut) {
      router.replace(
        signInPath(window.location.pathname + window.location.search) as Route,
      )
    }
  }, [signedOut, router])

  if (session.isPending || signedOut) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }

  return <>{children}</>
}
