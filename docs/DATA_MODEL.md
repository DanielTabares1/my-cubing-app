# Data Model

Last updated: 2026-06-23

## Domain Type

The central type is `TrainingCase`.

```ts
interface TrainingCase {
  par: string
  memo: string
  algoritmo: string
}
```

Field meaning:

- `par`: two-letter case pair, row header + column header.
- `memo`: memo word/image for the pair.
- `algoritmo`: 3Style algorithm notation.

## CSV Matrix Format

The app expects two separate CSV files:

- Algorithm matrix.
- Memo matrix.

Each file must contain a matrix with 22 row headers and 22 column headers.

Raw shape:

```text
      A   B   C   ... V
A   ...
B   ...
C   ...
...
V   ...
```

In spreadsheet coordinates:

- `A1`: ignored.
- `B1:W1`: column headers.
- `A2:A23`: row headers.
- `B2:W23`: data cells.

Headers must be exactly:

```text
A B C D E F G H I J K L M N O P Q R S T U V
```

## Parsing

File:

```text
app/lib/csv-parser.ts
```

Public functions:

- `parseCSVFile(file: File): Promise<ParsedMatrix>`
- `validateMatrixStructure(matrix: ParsedMatrix): ValidationResult`

Parser:

- Uses PapaParse.
- Does not treat the first row as named headers.
- Trims cell values.
- Does not skip empty lines automatically.

Validation checks:

- At least 23 raw rows.
- At least 23 raw columns in the header row.
- 22 row headers.
- 22 column headers.
- Headers match `A` through `V`, in order.
- Data grid is exactly 22x22.

## Transformation

File:

```text
app/lib/matrix-transformer.ts
```

Public function:

```ts
transformMatrices(algoMatrix, memoMatrix): TrainingCase[]
```

Rules:

- Iterate every coordinate in the algorithm matrix.
- Skip empty algorithm cells.
- Skip algorithm cells equal to `Caso no existe`, case-insensitive.
- Pair is `rowHeader + columnHeader`.
- Memo is the memo matrix value at the same coordinate.
- Empty memo becomes `Sin palabra`.

Example:

```ts
{
  par: "GA",
  memo: "Gaara",
  algoritmo: "U R U' R'"
}
```

## Persistence

The app stores data in browser `localStorage`.

Keys:

```text
bld-trainer-cases
bld-trainer-prefs
```

`bld-trainer-cases`:

```ts
TrainingCase[]
```

`bld-trainer-prefs`:

```ts
interface UserPreferences {
  timerVisible: boolean
  selectionMode: 'random' | 'sequential'
  algorithmStep: boolean
  theme: 'light' | 'dark' | 'system'
}
```

Important:

- `theme` exists in the type but the app currently renders a fixed dark theme.
- `algorithmStep=false` means the trainer skips the algorithm reveal step.
- Existing stored preferences may not include newer fields; callers should use
  fallback defaults with nullish coalescing.

## Storage Helpers

There are two storage layers:

- `app/hooks/useLocalStorage.ts`: React hook for persisted state.
- `app/lib/storage-manager.ts`: imperative helpers for cases and preferences.

The trainer page currently uses `useLocalStorage` for reactive persistence and
`StorageManager` for explicit case save/clear operations.

## Hydration Rule

Do not read `localStorage` during the first client render in a way that changes
the rendered HTML compared with the server output. This already caused a timer
visibility hydration mismatch.

Use the existing `useLocalStorage` hook when possible.

