export function splitAlgorithmVariants(rawAlgorithm: string): string[] {
  const variants = rawAlgorithm
    .split(/\r?\n+/)
    .map((variant) => variant.trim())
    .filter(Boolean)

  return variants.length > 0 ? variants : [rawAlgorithm]
}
