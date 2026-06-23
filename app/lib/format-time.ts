/**
 * Utility function for formatting elapsed time in the timer display.
 * Requirements: 9.1
 */

/**
 * Converts milliseconds to a `MM:SS.cc` formatted string with zero-padding.
 * Centiseconds are calculated as `Math.floor((ms % 1000) / 10)`.
 *
 * @param ms - Elapsed time in milliseconds (non-negative integer)
 * @returns Formatted time string, e.g. `"01:23.45"`
 */
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const cc = String(centiseconds).padStart(2, '0');

  return `${mm}:${ss}.${cc}`;
}
