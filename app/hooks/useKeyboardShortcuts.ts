/**
 * useKeyboardShortcuts — attaches keyboard shortcut listeners to `window`.
 *
 * Keyboard mapping:
 *  - Spacebar → calls `onAdvance`
 *  - R / r    → calls `onReset`
 *
 * Both keys call `e.preventDefault()` to suppress browser default actions
 * (e.g., page scroll on Space).
 *
 * Listeners are skipped when the event target is an `<input>` or `<textarea>`,
 * preventing interference while the user is typing.
 *
 * The listener is added only when `enabled` is true and cleaned up on unmount
 * or whenever `enabled` becomes false.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

'use client';

import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  onAdvance: () => void;
  onReset: () => void;
  /** When false the listener is not attached (and any existing one is removed). */
  enabled: boolean;
  /** When false, R does not trigger onReset. Defaults to true. */
  resetEnabled?: boolean;
}

/**
 * Hook that registers a `keydown` listener on `window` for Spacebar and R key.
 *
 * @param options.onAdvance - Callback invoked when Spacebar is pressed.
 * @param options.onReset   - Callback invoked when R/r is pressed.
 * @param options.enabled   - Whether the shortcuts are active.
 */
export function useKeyboardShortcuts({
  onAdvance,
  onReset,
  enabled,
  resetEnabled = true,
}: UseKeyboardShortcutsOptions): void {
  useEffect(() => {
    // Guard: SSR safety (window may not exist during server rendering)
    if (typeof window === 'undefined') return;

    // Guard: do not attach listener when disabled
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      // Skip when the user is typing or activating a focused control
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLButtonElement
      ) {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        onAdvance();
      } else if (resetEnabled && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        onReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: remove the listener when the component unmounts or enabled changes
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onAdvance, onReset, enabled, resetEnabled]);
}
