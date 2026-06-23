const NON_EXISTENT_CASE_MARKERS = new Set([
  'casonoexiste',
  'noexiste',
  'inexistente',
  'inexiste',
  'na',
  'n/a',
  'none',
  'null',
  'x',
  '-',
  '--',
]);

export function isNonExistentCaseCell(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (trimmed === '-' || trimmed === '--') return true;

  const normalized = trimmed
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[\s._:;|\\-]+/g, '')
    .replace(/[(){}[\]]/g, '');

  return NON_EXISTENT_CASE_MARKERS.has(normalized);
}
