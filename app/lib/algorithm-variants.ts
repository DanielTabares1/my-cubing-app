/**
 * Splits a raw algorithm cell value into individual algorithm variants.
 *
 * Variants are separated by newlines. However:
 * - A newline that falls inside parentheses is treated as whitespace.
 * - A line that starts with `(` is a continuation of the previous variant,
 *   not a new one (the user writes multi-line algorithms this way in CSVs).
 *
 * Parentheses themselves are stripped from each variant — they are purely
 * visual grouping for the user to highlight "trigger" sequences.
 *
 * Example:
 *   "R U' R' (S R2 S' R') U R'\nR U' (R' U' R' U')\n(R U R U)"
 *   → ["R U' R' S R2 S' R' U R'", "R U' R' U' R' U' R U R U"]
 */
export function splitAlgorithmVariants(rawAlgorithm: string): string[] {
  // Split by newlines that are NOT inside parentheses.
  const lines: string[] = []
  let current = ''
  let parenDepth = 0

  for (let i = 0; i < rawAlgorithm.length; i++) {
    const ch = rawAlgorithm[i]
    if (ch === '(') {
      parenDepth++
      current += ' '
    } else if (ch === ')') {
      parenDepth--
      current += ' '
    } else if ((ch === '\n' || ch === '\r') && parenDepth === 0) {
      const trimmed = current.replace(/\s+/g, ' ').trim()
      if (trimmed) lines.push(trimmed)
      current = ''
    } else {
      current += ch
    }
  }
  const lastTrimmed = current.replace(/\s+/g, ' ').trim()
  if (lastTrimmed) lines.push(lastTrimmed)

  if (lines.length === 0) return [rawAlgorithm.trim()]

  // Merge any line that starts with `(` (already stripped to a move sequence
  // that was parenthesized) into the previous line. Such lines are continuations
  // of the previous variant written across multiple lines in the spreadsheet.
  // After parenthesis stripping the line no longer starts with `(`, so we
  // detect continuations by checking the original rawAlgorithm lines.
  const rawLines = rawAlgorithm.split(/\r?\n/).map((l) => l.trimStart())
  const variants: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const originalLine = rawLines[i] ?? ''
    if (originalLine.startsWith('(') && variants.length > 0) {
      // Continuation: append to previous variant.
      variants[variants.length - 1] =
        (variants[variants.length - 1] + ' ' + lines[i]).replace(/\s+/g, ' ').trim()
    } else {
      variants.push(lines[i])
    }
  }

  return variants.length > 0 ? variants : [rawAlgorithm.trim()]
}
