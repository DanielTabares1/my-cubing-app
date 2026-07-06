import type { RoundStats } from '@/app/lib/round-stats'

export default function RoundProgress({ roundStats }: { roundStats: RoundStats }) {
  const progressPercent =
    roundStats.roundSize > 0
      ? Math.round((roundStats.completed / roundStats.roundSize) * 100)
      : 0

  return (
    <div
      className="flex min-w-0 flex-col gap-2.5"
      aria-label={`Ronda ${roundStats.completed} de ${roundStats.roundSize}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-200">
          <span
            className="size-2 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.55)]"
            aria-hidden="true"
          />
          Ronda{' '}
          <span className="tabular-nums text-cyan-100">
            {roundStats.completed}/{roundStats.roundSize}
          </span>
        </span>

        <StatPill label="Nuevos" value={roundStats.unlearnedInRound} tone="stone" />
        <StatPill label="Repaso" value={roundStats.reviewInRound} tone="emerald" />

        <span className="ml-auto text-xs tabular-nums text-stone-500">{progressPercent}%</span>
      </div>

      <div
        className="h-1 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={roundStats.completed}
        aria-valuemin={0}
        aria-valuemax={roundStats.roundSize}
        aria-label="Progreso de la ronda"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'stone' | 'emerald'
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'border-emerald-200/20 bg-emerald-200/[0.07] text-emerald-100'
      : 'border-white/10 bg-white/[0.04] text-stone-300'

  return (
    <span
      className={[
        'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium uppercase tracking-[0.1em]',
        toneClasses,
      ].join(' ')}
    >
      {label}
      <span className="tabular-nums text-white">{value}</span>
    </span>
  )
}
