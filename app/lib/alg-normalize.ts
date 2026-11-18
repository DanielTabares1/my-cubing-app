/**
 * Normalizes 3-style algorithm notation so cubing.js can parse it.
 *
 * cubing.js supports commutator `[A, B]` and conjugate `[A: B]` syntax natively,
 * but the user's CSV uses a non-standard shorthand: `setup:[commutator]`
 * (without outer brackets). This module wraps such patterns into proper
 * conjugate notation: `[setup: [commutator]]`.
 *
 * Examples:
 *   "R:[U R' U', M2]"        -> "[R: [U R' U', M2]]"
 *   "S U' L:[E', L2]"        -> "[S U' L: [E', L2]]"
 *   "x':[U L' U', M2]"       -> "[x': [U L' U', M2]]"
 *   "R' U' R':[S, R2]"       -> "[R' U' R': [S, R2]]"
 *   "[U R' U', M2]"          -> "[U R' U', M2]"  (unchanged, already valid)
 *   "M2 U M2"                -> "M2 U M2"       (unchanged, no commutator)
 */

/**
 * Normalizes 3-style algorithm notation so cubing.js can parse it.
 *
 * cubing.js supports commutator `[A, B]` and conjugate `[A: B]` syntax natively,
 * but the user's CSV uses a non-standard shorthand: `setup:[commutator]`
 * (without outer brackets). This module wraps such patterns into proper
 * conjugate notation: `[setup: [commutator]]`.
 *
 * Parentheses are used purely for visual grouping (e.g. highlighting the
 * "trigger" part of an alg). cubing.js doesn't treat them as meaningful
 * notation, so we strip them — keeping the moves inside.
 *
 * Examples:
 *   "R:[U R' U', M2]"             -> "[R: [U R' U', M2]]"
 *   "S U' L:[E', L2]"             -> "[S U' L: [E', L2]]"
 *   "x':[U L' U', M2]"            -> "[x': [U L' U', M2]]"
 *   "R' U' R':[S, R2]"            -> "[R' U' R': [S, R2]]"
 *   "[U R' U', M2]"               -> "[U R' U', M2]"  (unchanged)
 *   "M2 U M2"                     -> "M2 U M2"       (unchanged)
 *   "S U' L (E' L2 E L) U S'"     -> "S U' L E' L2 E L U S'"
 *   "r U (M U2 M' U) r'"          -> "r U M U2 M' U r'"
 */

/**
 * Detects the `setup:[commutator]` pattern and wraps it in proper conjugate
 * notation. Handles nested setups, prime moves, slice moves, wide moves,
 * and whitespace.
 */
export function normalizeAlgForCubing(rawAlg: string): string {
  let trimmed = rawAlg.trim()
  if (!trimmed) return trimmed

  // Strip parentheses — they are purely visual grouping for the user and
  // cubing.js doesn't parse them as meaningful notation. Keep the content.
  trimmed = trimmed.replace(/[()]/g, ' ')

  // Collapse extra whitespace introduced by parenthesis removal.
  trimmed = trimmed.replace(/\s+/g, ' ').trim()

  if (!trimmed) return trimmed

  // If the entire string is already a valid conjugate/commutator (starts with
  // `[` and ends with `]`), leave it as-is.
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
  }

  // Find `:[` pattern — a colon followed by an opening bracket.
  // This indicates setup:commutator notation.
  const colonBracketIdx = findSetupColon(trimmed)
  if (colonBracketIdx === -1) {
    // No setup:commutator pattern — return as-is (cubing.js can handle
    // plain commutators, plain moves, wide moves, slice moves).
    return trimmed
  }

  const setupPart = trimmed.slice(0, colonBracketIdx).trim()
  const commutatorPart = trimmed.slice(colonBracketIdx + 1).trim()

  // Wrap as proper conjugate: [setup: [commutator]]
  return `[${setupPart}: ${commutatorPart}]`
}

/**
 * Finds the index of the `:` that introduces a commutator (i.e., `:[`),
 * skipping any `:` that are inside brackets.
 */
function findSetupColon(str: string): number {
  let bracketDepth = 0
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '[') bracketDepth++
    else if (ch === ']') bracketDepth--
    else if (ch === ':' && bracketDepth === 0 && str[i + 1] === '[') {
      return i
    }
  }
  return -1
}

/**
 * Expands an algorithm string using cubing.js's `Alg` class.
 * This converts commutator/conjugate notation into plain move sequences
 * that TwistyPlayer can animate step-by-step.
 *
 * Falls back to the raw string if parsing fails.
 */
export async function expandAlg(rawAlg: string): Promise<string> {
  const normalized = normalizeAlgForCubing(rawAlg)
  try {
    const { Alg } = await import('cubing/alg')
    const alg = new Alg(normalized)
    return alg.expand().toString()
  } catch {
    // If cubing.js can't parse it, return the normalized string as-is.
    // TwistyPlayer will still try its best.
    return normalized
  }
}
