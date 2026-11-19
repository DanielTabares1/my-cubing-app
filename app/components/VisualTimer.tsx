'use client'

import { useEffect, useState } from 'react'
import { formatTime } from '@/app/lib/format-time'

interface VisualTimerProps {
  isVisible: boolean
  isRunning: boolean
  onToggleVisibility: () => void
  shouldReset: boolean
}

export default function VisualTimer({ isVisible, isRunning, onToggleVisibility, shouldReset }: VisualTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!isRunning) return
    let startTime: number | null = null
    let frameId: number
    function tick(ts: number) {
      if (startTime === null) startTime = ts
      setElapsedMs(ts - startTime)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [isRunning, shouldReset])

  const displayedMs = isRunning ? elapsedMs : 0

  return (
    <div className="inline-flex h-9 items-center overflow-hidden rounded-xl border border-[var(--border-muted)] bg-[var(--bg-surface)]">
      {isVisible && (
        <span className="min-w-[96px] px-3 font-mono text-sm font-semibold tabular-nums text-[var(--accent)]">
          {formatTime(displayedMs)}
        </span>
      )}
      <button
        type="button"
        onClick={onToggleVisibility}
        className={[
          'h-full border-l border-[var(--border-subtle)] px-3 text-xs font-semibold uppercase tracking-[0.12em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]',
          isVisible
            ? 'text-[var(--text-muted)] hover:text-[var(--accent)]'
            : 'text-[var(--accent)]',
        ].join(' ')}
        aria-label={isVisible ? 'Ocultar cronómetro' : 'Mostrar cronómetro'}
      >
        {isVisible ? 'Ocultar' : 'Timer'}
      </button>
    </div>
  )
}
