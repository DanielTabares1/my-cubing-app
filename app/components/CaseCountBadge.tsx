'use client'

export default function CaseCountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-7 items-center gap-2 rounded-full border border-[var(--accent-border)] bg-[var(--accent-lavender)] px-3 text-xs font-semibold text-[var(--accent)]">
      <span
        className="size-1.5 rounded-full bg-[var(--accent)]"
        aria-hidden="true"
      />
      {count} casos
    </span>
  )
}
