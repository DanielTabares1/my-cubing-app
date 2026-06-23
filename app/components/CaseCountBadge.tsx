'use client'

interface CaseCountBadgeProps {
  count: number
}

export default function CaseCountBadge({ count }: CaseCountBadgeProps) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 text-sm font-medium text-stone-200">
      <span
        className="size-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.7)]"
        aria-hidden="true"
      />
      {count} casos cargados
    </span>
  )
}
