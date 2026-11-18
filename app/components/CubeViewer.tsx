'use client'

import { useEffect, useRef } from 'react'
import { normalizeAlgForCubing } from '@/app/lib/alg-normalize'

export interface CubeViewerProps {
  /** Algorithm in standard notation (e.g., "R U R' U'"). */
  alg: string
  /**
   * Whole-cube rotation applied as setup (e.g., "x2" for yellow-up).
   * Passed as `experimentalSetupAlg`. With `experimentalSetupAnchor: 'end'`,
   * this defines the "solved" reference orientation.
   */
  orientationAlg?: string
}

/**
 * Mounts a cubing.js TwistyPlayer imperatively.
 *
 * The cube is shown in the pre-solved state: using `experimentalSetupAnchor:
 * 'end'`, the alg ends at the solved pattern, so the starting frame is the
 * scrambled position the algorithm solves. We call `jumpToStart()` after
 * setting props so the viewer shows the scrambled state, not the solved one.
 *
 * TwistyPlayer is a web component. We avoid SSR by only creating the instance
 * inside useEffect (browser-only). The player is reused across prop changes.
 */
export default function CubeViewer({ alg, orientationAlg }: CubeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // The player is a TwistyPlayer (HTMLElement subclass); stored as HTMLElement
  // so appendChild works, with methods accessed via casts.
  const playerRef = useRef<HTMLElement | null>(null)
  const algRef = useRef(alg)
  const orientationRef = useRef(orientationAlg)

  useEffect(() => {
    algRef.current = alg
    orientationRef.current = orientationAlg
  }, [alg, orientationAlg])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false

    import('cubing/twisty').then(({ TwistyPlayer }) => {
      if (cancelled || containerRef.current === null) return

      if (playerRef.current === null) {
        const player = new TwistyPlayer({
          puzzle: '3x3x3',
          hintFacelets: 'none',
          background: 'none',
          controlPanel: 'none',
          experimentalSetupAnchor: 'end',
        })
        player.style.width = '100%'
        player.style.height = '100%'
        player.alg = normalizeAlgForCubing(algRef.current)
        player.experimentalSetupAlg = orientationRef.current || ''
        container.appendChild(player)
        playerRef.current = player
        // Show the pre-solved (scrambled) state, not the solved end frame.
        player.jumpToStart()
      }
    })

    return () => {
      cancelled = true
      if (playerRef.current !== null && container) {
        container.innerHTML = ''
        playerRef.current = null
      }
    }
  }, [])

  // Update alg / orientation whenever they change (after the player exists).
  useEffect(() => {
    const player = playerRef.current as
      | (HTMLElement & {
          alg: string
          experimentalSetupAlg: string
          jumpToStart: () => void
        })
      | null
    if (!player) return

    player.alg = normalizeAlgForCubing(alg)
    player.experimentalSetupAlg = orientationAlg || ''
    // Re-show the start frame (pre-solved state) after updating.
    player.jumpToStart()
  }, [alg, orientationAlg])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ minHeight: '160px' }}
      aria-label="Visualizacion 3D del algoritmo"
      role="img"
    />
  )
}
