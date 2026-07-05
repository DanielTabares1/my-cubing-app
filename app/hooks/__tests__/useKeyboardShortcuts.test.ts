/**
 * useKeyboardShortcuts unit tests.
 * Feature: 3style-bld-edge-trainer
 *
 * Tests keyboard event handling for Space and R keys.
 * Requirements: 6.1, 6.2, 6.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fire a synthetic KeyboardEvent on window.
 * @param key       - The `key` property (e.g. ' ', 'r', 'R').
 * @param target    - Optional EventTarget override (defaults to document.body).
 */
function fireKeyDown(key: string, target: EventTarget = document.body): void {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  // Override the `target` property so the handler can inspect it
  Object.defineProperty(event, 'target', { value: target, writable: false });
  window.dispatchEvent(event);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useKeyboardShortcuts', () => {
  let onAdvance: ReturnType<typeof vi.fn>;
  let onReset: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAdvance = vi.fn();
    onReset = vi.fn();
  });

  // -------------------------------------------------------------------------
  // Space key
  // -------------------------------------------------------------------------

  it('calls onAdvance when Space is pressed — Requirement 6.1', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    fireKeyDown(' ');
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onReset).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // R key (both cases)
  // -------------------------------------------------------------------------

  it('calls onReset when lowercase r is pressed — Requirement 6.2', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    fireKeyDown('r');
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('calls onReset when uppercase R is pressed — Requirement 6.2', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    fireKeyDown('R');
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Skip when target is input / textarea — Requirement 6.3
  // -------------------------------------------------------------------------

  it('does NOT call onAdvance when Space target is an <input>', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    const input = document.createElement('input');
    fireKeyDown(' ', input);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('does NOT call onAdvance when Space target is a <textarea>', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    const textarea = document.createElement('textarea');
    fireKeyDown(' ', textarea);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  it('does NOT call onReset when R target is an <input>', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    const input = document.createElement('input');
    fireKeyDown('r', input);
    expect(onReset).not.toHaveBeenCalled();
  });

  it('does NOT call onReset when R target is a <textarea>', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    const textarea = document.createElement('textarea');
    fireKeyDown('r', textarea);
    expect(onReset).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Disabled — no callbacks should fire
  // -------------------------------------------------------------------------

  it('does NOT call onAdvance or onReset when enabled is false', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: false }),
    );

    fireKeyDown(' ');
    fireKeyDown('r');
    fireKeyDown('R');
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it('does NOT call onReset when resetEnabled is false', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true, resetEnabled: false }),
    );

    fireKeyDown('r');
    fireKeyDown('R');
    expect(onReset).not.toHaveBeenCalled();
  });

  it('does NOT call onAdvance when Space target is a <button>', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    const button = document.createElement('button');
    fireKeyDown(' ', button);
    expect(onAdvance).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cleanup on unmount
  // -------------------------------------------------------------------------

  it('removes the listener after unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    unmount();

    fireKeyDown(' ');
    fireKeyDown('r');
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Unrelated keys should not trigger callbacks
  // -------------------------------------------------------------------------

  it('does not call any callback for unrelated keys', () => {
    renderHook(() =>
      useKeyboardShortcuts({ onAdvance, onReset, enabled: true }),
    );

    fireKeyDown('Enter');
    fireKeyDown('ArrowUp');
    fireKeyDown('a');
    expect(onAdvance).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });
});
