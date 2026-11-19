import type { RoundStats } from '@/app/lib/round-stats'

export default function RoundProgress({ roundStats }: { roundStats: RoundStats }) {
  const pct =
    roundStats.roundSize > 0
      ? Math.round((roundStats.completed / roundStats.roundSize) * 100)
      : 0

  return (
    <div className="flex flex-col gap-2" aria-label={`Ronda ${roundStats.completed} de ${roundStats.roundSize}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--accent-border)] bg-[var(--accent-lavender)] px-2.5 text-[11px] font-semibold text-[var(--accent)]">
          Ronda{' '}
          <span className="tabular-nums">{roundStats.completed}/{roundStats.roundSize}</span>
        </span>

        <StatPill label="Nuevos" value={roundStats.unlearnedInRound} tone="neutral" />
        <StatPill label="Repaso" value={roundStats.reviewInRound}    tone="success" />

        <span className="ml-auto text-[11px] tabular-nums text-[var(--text-muted)]">{pct}%</span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-[var(--border-subtle)]"
        role="progressbar"
        aria-valuenow={roundStats.completed}
        aria-valuemin={0}
        aria-valuemax={roundStats.roundSize}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-sky) 100%)',
          }}
        />
      </div>
    </div>
  )
}

function StatPill({ label, value, tone }: { label: string; value: number; tone: 'neutral' | 'success' }) {
  return (
    <span className={[
      'inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-[11px] font-medium',
      tone === 'success'
        ? 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success)]'
        : 'border-[var(--border-subtle)] bg-[var(--bg-overlay)] text-[var(--text-secondary)]',
    ].join(' ')}>
      {label}
      <span className="tabular-nums font-semibold">{value}</span>
    </span>
  )
}
