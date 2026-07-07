import { useState, useEffect, useCallback } from 'react'

/**
 * Lightweight localStorage-backed state hook.
 * Persists state across component unmount/remount (e.g. navigating
 * between sections and back). Each section uses a unique key prefix.
 *
 * IMPORTANT: keys are scoped per-user to prevent data leakage between
 * different accounts on the same browser. Always pass the userId when
 * building the key, e.g. `useSessionState(\`u:${userId}:marca:text\`, ...)`.
 *
 * Usage:
 *   const [plan, setPlan] = useSessionState(`u:${userId}:planificar:plan`, null)
 */

const PREFIX = 'brave_session_'

export function useSessionState<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const fullKey = PREFIX + key

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const stored = localStorage.getItem(fullKey)
      if (stored !== null) {
        return JSON.parse(stored) as T
      }
    } catch {
      // ignore parse errors
    }
    return initialValue
  })

  useEffect(() => {
    try {
      localStorage.setItem(fullKey, JSON.stringify(state))
    } catch {
      // storage full or unavailable — silently ignore
    }
  }, [fullKey, state])

  return [state, setState]
}

/**
 * Clears all session state keys matching a section prefix.
 * Pass the FULL user-scoped section prefix, e.g. `u:${userId}:planificar`.
 * Use to implement "Empezar de nuevo" / reset buttons.
 */
export function clearSectionState(section: string) {
  if (typeof window === 'undefined') return
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + section))
  keys.forEach(k => localStorage.removeItem(k))
}

/**
 * Clears a single session key (user-scoped).
 */
export function clearSessionKey(key: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(PREFIX + key)
}

/**
 * Clears ALL session state for every user and every section.
 * Use on logout to ensure the next user starts with a clean slate
 * and never sees stale data from a previous session.
 */
export function clearAllSessionState() {
  if (typeof window === 'undefined') return
  const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX))
  keys.forEach(k => localStorage.removeItem(k))
}