import { describe, expect, it, vi } from 'vitest'
import type { AppStateStatus } from 'react-native'
import { bindQueryFocusToAppState } from '@/lib/api/app-focus'

function fakeAppState() {
  let listener: ((status: AppStateStatus) => void) | undefined
  const remove = vi.fn()
  return {
    remove,
    emit: (status: AppStateStatus) => listener?.(status),
    addEventListener: (
      _type: 'change',
      next: (status: AppStateStatus) => void,
    ) => {
      listener = next
      return { remove }
    },
  }
}

describe('bindQueryFocusToAppState', () => {
  it('reports focus only while the app is active and unsubscribes on cleanup', () => {
    const appState = fakeAppState()
    const onFocus = vi.fn()
    let cleanup: (() => void) | undefined
    const focus = {
      setEventListener: (
        setup: (handler: (focused?: boolean) => void) => () => void,
      ) => {
        cleanup = setup(onFocus)
      },
    }

    bindQueryFocusToAppState(focus, appState)
    appState.emit('background')
    appState.emit('inactive')
    appState.emit('active')
    cleanup?.()

    expect(onFocus.mock.calls).toEqual([[false], [false], [true]])
    expect(appState.remove).toHaveBeenCalledOnce()
  })
})
