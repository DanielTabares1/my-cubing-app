/**
 * StorageManager — centralized localStorage operations with error handling and type safety.
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 14.2, 15.2
 */

import type { TrainingCase, UserPreferences } from './types';

const CASES_KEY = 'bld-trainer-cases';
const PREFS_KEY = 'bld-trainer-prefs';

/** Returns true when running in a browser context (guards against SSR). */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

export const StorageManager = {
  /**
   * Save the training cases array to localStorage.
   * Clears any pre-existing data before writing (Requirement 4.2).
   * Throws a user-facing message when the storage quota is exceeded (Requirement 4.4).
   */
  saveTrainingCases(cases: TrainingCase[]): void {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(CASES_KEY);
      localStorage.setItem(CASES_KEY, JSON.stringify(cases));
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' ||
          // Firefox uses a numeric code for this error
          error.code === 22)
      ) {
        throw new Error(
          'El almacenamiento del navegador está lleno. Por favor, borra algunos datos e inténtalo de nuevo.'
        );
      }
      console.error('StorageManager.saveTrainingCases error:', error);
      throw new Error(
        'No se pudieron guardar los casos de entrenamiento. Los datos se mantendrán solo en memoria.'
      );
    }
  },

  /**
   * Load training cases from localStorage.
   * Returns null when there are no stored cases or if the stored JSON is corrupted (Requirement 4.3).
   */
  loadTrainingCases(): TrainingCase[] | null {
    if (!isBrowser()) return null;

    try {
      const raw = localStorage.getItem(CASES_KEY);
      if (raw === null) return null;

      const parsed: unknown = JSON.parse(raw);

      // Basic structural validation — discard corrupted data
      if (!Array.isArray(parsed)) {
        console.warn('StorageManager: stored cases data is not an array — discarding.');
        localStorage.removeItem(CASES_KEY);
        return null;
      }

      return parsed as TrainingCase[];
    } catch (error) {
      console.warn('StorageManager.loadTrainingCases: corrupted JSON — discarding.', error);
      try {
        localStorage.removeItem(CASES_KEY);
      } catch {
        // Ignore secondary errors during cleanup
      }
      return null;
    }
  },

  /**
   * Remove all stored training cases from localStorage (Requirement 4.5).
   */
  clearTrainingCases(): void {
    if (!isBrowser()) return;

    try {
      localStorage.removeItem(CASES_KEY);
    } catch (error) {
      console.error('StorageManager.clearTrainingCases error:', error);
    }
  },

  /**
   * Persist user preferences to localStorage.
   * Throws a user-facing message when the storage quota is exceeded (Requirement 14.2).
   */
  savePreferences(prefs: UserPreferences): void {
    if (!isBrowser()) return;

    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (error) {
      if (
        error instanceof DOMException &&
        (error.name === 'QuotaExceededError' || error.code === 22)
      ) {
        throw new Error(
          'El almacenamiento del navegador está lleno. No se pudieron guardar las preferencias.'
        );
      }
      console.error('StorageManager.savePreferences error:', error);
      throw new Error(
        'No se pudieron guardar las preferencias. Los cambios no se conservarán tras recargar la página.'
      );
    }
  },

  /**
   * Load user preferences from localStorage.
   * Returns null when no preferences are stored or if the stored JSON is corrupted.
   */
  loadPreferences(): UserPreferences | null {
    if (!isBrowser()) return null;

    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw === null) return null;

      const parsed: unknown = JSON.parse(raw);

      // Basic structural guard — discard corrupted data
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        console.warn('StorageManager: stored preferences data is malformed — discarding.');
        localStorage.removeItem(PREFS_KEY);
        return null;
      }

      return parsed as UserPreferences;
    } catch (error) {
      console.warn('StorageManager.loadPreferences: corrupted JSON — discarding.', error);
      try {
        localStorage.removeItem(PREFS_KEY);
      } catch {
        // Ignore secondary errors during cleanup
      }
      return null;
    }
  },
};
