'use client'

import Link from 'next/link'
import { useTheme } from '@/app/hooks/useTheme'

const tools = [
  {
    name: '3Style Trainer',
    href: '/trainer',
    status: 'Disponible',
    description:
      'Practica pares de aristas BLD con memo, algoritmo y cronómetro visual.',
    tag: 'CSV local',
    active: true,
    icon: '3S',
  },
  {
    name: 'Biblioteca de casos',
    href: '#',
    status: 'Próximamente',
    description:
      'Organiza subsets, etiquetas y notas personales para tus algoritmos.',
    tag: 'Planificado',
    active: false,
    icon: '📚',
  },
  {
    name: 'Análisis de sesiones',
    href: '#',
    status: 'Próximamente',
    description:
      'Revisa errores frecuentes, tiempos y progreso por letra o categoría.',
    tag: 'Planificado',
    active: false,
    icon: '📊',
  },
]

export default function Home() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-xs font-black text-white shadow-[0_4px_14px_rgba(62,54,176,0.35)]">
              M
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              My Cubing Tool
            </span>
          </div>
          <span className="rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
            MVP activo
          </span>

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            className="grid size-9 place-items-center rounded-xl border border-[var(--border-muted)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-6 sm:px-8">
        {/* Hero */}
        <div className="pb-12 pt-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.20em] text-[var(--accent-mid)]">
            Workspace de cubing
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight text-[var(--text-primary)] sm:text-5xl">
            Entrenamiento BLD{' '}
            <span className="text-[var(--accent)]">listo para uso diario.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-[var(--text-secondary)]">
            Herramientas locales para 3Style. Sin cuenta, sin servidor, sin distracciones.
          </p>

          {/* Stats strip */}
          <div className="mt-8 inline-flex items-center gap-6 rounded-2xl bg-[var(--bg-surface)] px-7 py-5" style={{ boxShadow: 'var(--shadow-card)' }}>
            <StatStrip value="3" label="herramientas" />
            <div className="h-8 w-px bg-[var(--border-subtle)]" />
            <StatStrip value="1" label="disponible" />
            <div className="h-8 w-px bg-[var(--border-subtle)]" />
            <StatStrip value="100%" label="offline" />
          </div>
        </div>

        {/* Tools grid */}
        <div className="grid gap-5 pb-16 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) =>
            tool.active ? (
              <Link
                key={tool.name}
                href={tool.href}
                className="group relative overflow-hidden rounded-2xl bg-[var(--bg-surface)] p-6 transition duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                {/* accent stripe top */}
                <span
                  className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-sky)]"
                  aria-hidden="true"
                />
                <ToolContent tool={tool} />
              </Link>
            ) : (
              <article
                key={tool.name}
                className="relative overflow-hidden rounded-2xl bg-[var(--bg-surface)] p-6 opacity-55"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <ToolContent tool={tool} />
              </article>
            ),
          )}
        </div>
      </div>
    </main>
  )
}

function StatStrip({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-[var(--accent)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function ToolContent({ tool }: { tool: (typeof tools)[number] }) {
  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-3">
        <span
          className={[
            'grid size-12 shrink-0 place-items-center rounded-xl text-lg font-black',
            tool.active
              ? 'bg-[var(--accent-lavender)] text-[var(--accent)]'
              : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
          ].join(' ')}
          aria-hidden="true"
        >
          {tool.icon}
        </span>
        <span
          className={[
            'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
            tool.active
              ? 'bg-[var(--accent-lavender)] text-[var(--accent)]'
              : 'bg-[var(--bg-overlay)] text-[var(--text-muted)]',
          ].join(' ')}
        >
          {tool.tag}
        </span>
      </div>

      <h2 className="text-base font-semibold text-[var(--text-primary)]">{tool.name}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{tool.description}</p>

      {tool.active && (
        <div className="mt-5 flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
          <span className="text-sm font-semibold text-[var(--accent)]">Abrir →</span>
          <span className="text-xs font-medium text-[var(--success)]">{tool.status}</span>
        </div>
      )}
    </>
  )
}

function IconMoon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M13.5 10A6 6 0 0 1 6 2.5a.5.5 0 0 0-.6-.6A6.5 6.5 0 1 0 14.1 10.6a.5.5 0 0 0-.6-.6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.9 11.9l1.05 1.05M12.95 3.05l-1.06 1.06M4.1 11.9l-1.05 1.05" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
