import Link from 'next/link'

const tools = [
  {
    name: '3Style Trainer',
    href: '/trainer',
    status: 'Disponible',
    description:
      'Practica pares de aristas BLD con memo, algoritmo y cronometro visual.',
    metric: 'CSV local',
    active: true,
  },
  {
    name: 'Biblioteca de casos',
    href: '#',
    status: 'Proximamente',
    description:
      'Organiza subsets, etiquetas y notas personales para tus algoritmos.',
    metric: 'Planificado',
    active: false,
  },
  {
    name: 'Analisis de sesiones',
    href: '#',
    status: 'Proximamente',
    description:
      'Revisa errores frecuentes, tiempos y progreso por letra o categoria.',
    metric: 'Planificado',
    active: false,
  },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-950 text-stone-100">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
            aria-label="My Cubing Tool"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-cyan-300 text-sm font-black text-stone-950 shadow-[0_0_28px_rgba(103,232,249,0.25)]">
              M
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide text-white">
                My Cubing Tool
              </span>
              <span className="block text-xs text-stone-400">Cubing workspace</span>
            </span>
          </Link>

          <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200">
            MVP operativo
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="max-w-xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Elige una herramienta
            </p>
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Entrenamiento BLD listo para uso diario.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-stone-300">
              Una entrada limpia para tus utilidades de cubing. Por ahora el
              foco esta en 3Style, con una base visual pensada para crecer sin
              sentirse como demo.
            </p>

            <div className="mt-8 grid grid-cols-3 gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
              <div>
                <p className="text-2xl font-semibold text-white">3</p>
                <p className="text-xs text-stone-400">herramientas</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">1</p>
                <p className="text-xs text-stone-400">activa</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-white">100%</p>
                <p className="text-xs text-stone-400">local</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {tools.map((tool) =>
              tool.active ? (
                <Link
                  key={tool.name}
                  href={tool.href}
                  className="group rounded-lg border border-cyan-300/30 bg-cyan-300/[0.07] p-5 shadow-2xl shadow-cyan-950/30 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/60 hover:bg-cyan-300/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  <ToolCardContent tool={tool} />
                </Link>
              ) : (
                <article
                  key={tool.name}
                  className="rounded-lg border border-white/10 bg-white/[0.025] p-5 opacity-75"
                  data-disabled="true"
                >
                  <ToolCardContent tool={tool} />
                </article>
              ),
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function ToolCardContent({ tool }: { tool: (typeof tools)[number] }) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span
              className={[
                'grid size-11 shrink-0 place-items-center rounded-md border font-semibold',
                tool.active
                  ? 'border-cyan-200/40 bg-cyan-200/15 text-cyan-100'
                  : 'border-white/10 bg-white/[0.04] text-stone-300',
              ].join(' ')}
              aria-hidden="true"
            >
              {tool.active ? '3S' : '--'}
            </span>
            <div>
              <h2 className="text-lg font-semibold text-white">{tool.name}</h2>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-400">
                {tool.status}
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-stone-300">
            {tool.description}
          </p>
        </div>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-stone-300">
          {tool.metric}
        </span>
      </div>

      {tool.active && (
        <div className="mt-5 flex items-center justify-between border-t border-cyan-200/10 pt-4 text-sm">
          <span className="font-medium text-cyan-100">Abrir herramienta</span>
          <span
            className="grid size-8 place-items-center rounded-full bg-cyan-200 text-stone-950 transition group-hover:translate-x-1"
            aria-hidden="true"
          >
            -&gt;
          </span>
        </div>
      )}
    </>
  )
}
