// RN reimplementation of the web MessagesProvider. The message data comes from
// @lifedeck/i18n (pure, shared); only this thin React context is app-specific.
import { createContext, useContext, type ReactNode } from 'react'
import type { Locale, Messages } from '@lifedeck/i18n'

type I18nContextValue = {
  locale: Locale
  messages: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function MessagesProvider({
  locale,
  messages,
  children,
}: I18nContextValue & { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ locale, messages }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext)
  if (!value) {
    throw new Error('useI18n must be used within a MessagesProvider.')
  }
  return value
}
