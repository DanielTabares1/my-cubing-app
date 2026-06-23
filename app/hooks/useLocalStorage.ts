'use client'

import { useCallback, useMemo, useSyncExternalStore } from 'react'

function isBrowser(): boolean {
  return typeof window !== 'undefined'
}

function subscribeToLocalStorage(key: string, callback: () => void) {
  if (!isBrowser()) return () => {}

  const customEventName = `local-storage:${key}`

  function handleStorage(event: StorageEvent) {
    if (event.key === key) {
      callback()
    }
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(customEventName, callback)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(customEventName, callback)
  }
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const subscribe = useCallback(
    (callback: () => void) => subscribeToLocalStorage(key, callback),
    [key],
  )

  const getSnapshot = useCallback(() => {
    if (!isBrowser()) return null
    return window.localStorage.getItem(key)
  }, [key])

  const getServerSnapshot = useCallback(() => null, [])

  const rawValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const storedValue = useMemo(() => {
    if (rawValue === null) {
      return initialValue
    }

    try {
      return JSON.parse(rawValue) as T
    } catch (error) {
      console.warn(`useLocalStorage: error reading key "${key}" from localStorage:`, error)
      return initialValue
    }
  }, [initialValue, key, rawValue])

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (!isBrowser()) return

      const next = value instanceof Function ? value(storedValue) : value

      try {
        window.localStorage.setItem(key, JSON.stringify(next))
        window.dispatchEvent(new Event(`local-storage:${key}`))
      } catch (error) {
        console.error(`useLocalStorage: error writing key "${key}" to localStorage:`, error)
      }
    },
    [key, storedValue],
  )

  return [storedValue, setValue]
}
