/**
 * Core shared TypeScript interfaces and types for the 3Style BLD Edge Trainer.
 * Requirements: 12.1, 12.3, 3.8
 */

// ---------------------------------------------------------------------------
// Core domain types
// ---------------------------------------------------------------------------

export type PieceType = 'arista' | 'esquina';

/** A single flashcard training case derived from the algorithm and memo matrices. */
export interface TrainingCase {
  /** Whether this case is an edge or corner 3-style pair. */
  tipo: PieceType;
  /** Letter pair (e.g., "AB", "CK") — concatenation of row header + column header. */
  par: string;
  /** Memorization word (e.g., "Airplane"). Defaults to "Sin palabra" when empty. */
  memo: string;
  /** Algorithm notation (e.g., "U R U' R'"). */
  algoritmo: string;
  /** Algorithm variants split from multiline cells. First item mirrors the primary display variant. */
  algoritmos?: string[];
  /** Whether the user has marked this case as learned. Learned cases enter spaced-repetition rotation. */
  isLearned?: boolean;
  /** Consecutive successful recalls (0–5). Drives inclusion probability for learned cases. */
  streak?: number;
}

// ---------------------------------------------------------------------------
// Trainer state machine types
// ---------------------------------------------------------------------------

/**
 * The four states of the flashcard flow:
 *  0 → Idle
 *  1 → Recognition
 *  2 → Memorization
 *  3 → Review
 */
export type TrainerState = 0 | 1 | 2 | 3;

/** Full snapshot of the trainer state machine at any point in time. */
export interface TrainerStateData {
  currentState: TrainerState;
  currentCase: TrainingCase | null;
  allCases: TrainingCase[];
  /** Current position in the cases array — used for sequential selection mode. */
  currentIndex: number;
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  timerVisible: boolean;
  selectionMode: 'random' | 'sequential';
  algorithmStep: boolean;
  /** Which piece type to practice: edges or corners. */
  practicePiece: PieceType;
  theme: 'light' | 'dark' | 'system';
}

// ---------------------------------------------------------------------------
// CSV parsing types
// ---------------------------------------------------------------------------

/** Structured representation of a parsed N×N CSV matrix (N is 21 or 22). */
export interface ParsedMatrix {
  headers: {
    /** Row header letters, sourced from column A. */
    rows: string[];
    /** Column header letters, sourced from row 1. */
    columns: string[];
  };
  /** N×N grid of cell string values. */
  data: string[][];
}

/** Outcome of structural validation for a parsed matrix. */
export interface ValidationResult {
  isValid: boolean;
  /** Human-readable error descriptions; empty when isValid is true. */
  errors: string[];
}

// ---------------------------------------------------------------------------
// Component state types
// ---------------------------------------------------------------------------

/** Per-file upload lifecycle status used by CSVImporter. */
export interface CSVUploadStatus {
  algo: 'idle' | 'uploading' | 'success' | 'error';
  memo: 'idle' | 'uploading' | 'success' | 'error';
}

// ---------------------------------------------------------------------------
// Hook return types
// ---------------------------------------------------------------------------

/** Return type of the useTrainerState hook. */
export interface UseTrainerStateReturn {
  state: TrainerState;
  currentCase: TrainingCase | null;
  /** Advance to the next state (or select a new case from State 3 → State 1). */
  advance: () => void;
  /** Reset to State 1 keeping the same case. */
  reset: () => void;
  /** Transition from State 0 to State 1 and select the first case. */
  startPractice: () => void;
  /** Start practicing a specific case selected by the user. */
  practiceCase: (trainingCase: TrainingCase) => void;
}

/** Return type of the useCaseSelection hook. */
export interface UseCaseSelectionReturn {
  /** Select the next case using the given mode ('random' | 'sequential'). */
  selectCase: (mode: 'random' | 'sequential') => TrainingCase | null;
  /** Remove a manually chosen case from the remaining shuffled round. */
  notifyCasePracticed: (trainingCase: TrainingCase) => void;
  /** True when at least one training case is available. */
  hasMoreCases: boolean;
  /** Current sequential index into the cases array. */
  currentIndex: number;
}
