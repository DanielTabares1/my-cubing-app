'use client'

import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type Theme = 'light' | 'dark'

const DEFAULT_THEME: Theme = 'light'

/**
 * Persists the user's theme preference in localStorage and applies
 * `data-theme="dark"` (or removes it) on the <html> element.
 *
 * Returns the current theme and a toggle function.
 * Safe to call during SSR — the localStorage read is deferred via
 * useSyncExternalStore so the server snapshot is null (defaults to light).
 */
export function useTheme(): { theme: Theme; toggleTheme: () => void; isDark: boolean } {
  const [storedTheme, setStoredTheme] = useLocalStorage<Theme>('bld-theme', DEFAULT_THEME)

  // storedTheme is null on the server and on first hydration render.
  // Fall back to light so SSR and first paint match.
  const theme: Theme = storedTheme ?? DEFAULT_THEME
  const isDark = theme === 'dark'

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.removeAttribute('data-theme')
    }
  }, [isDark])

  function toggleTheme() {
    setStoredTheme((prev) => ((prev ?? DEFAULT_THEME) === 'light' ? 'dark' : 'light'))
  }

  return { theme, toggleTheme, isDark }
}
