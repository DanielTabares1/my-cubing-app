'use client'

import { useEffect, useState } from 'react'
import { formatTime } from '@/app/lib/format-time'

interface VisualTimerProps {
  isVisible: boolean
  isRunning: boolean
  onToggleVisibility: () => void
  shouldReset: boolean
}

export default function VisualTimer({
  isVisible,
  isRunning,
  onToggleVisibility,
  shouldReset,
}: VisualTimerProps) {
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!isRunning) {
      return
    }

    let startTime: number | null = null
    let frameId: number

    function tick(timestamp: number) {
      if (startTime === null) {
        startTime = timestamp
      }
      setElapsedMs(timestamp - startTime)
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [isRunning, shouldReset])

  const displayedMs = isRunning ? elapsedMs : 0

  return (
    <div className="inline-flex min-h-10 items-center rounded-lg border border-white/10 bg-white/[0.04] text-sm text-stone-200">
      {isVisible && (
        <span className="min-w-[104px] px-3 font-mono text-base tabular-nums text-white">
          {formatTime(displayedMs)}
        </span>
      )}
      <button
        type="button"
        onClick={onToggleVisibility}
        className="min-h-10 rounded-r-lg border-l border-white/10 px-3 text-xs font-semibold uppercase tracking-[0.12em] text-stone-300 transition hover:bg-white/[0.07] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
        aria-label={isVisible ? 'Ocultar cronometro' : 'Mostrar cronometro'}
      >
        {isVisible ? 'Ocultar' : 'Timer'}
      </button>
    </div>
  )
}
