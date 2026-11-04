import type { ReactNode } from 'react'

export const cardBase =
  'rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900'

export const inputBase =
  'h-9 min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none '
  + 'transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 '
  + 'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500'

export function Card({
  titulo,
  acao,
  children,
  className = '',
}: {
  titulo?: ReactNode
  acao?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`${cardBase} ${className}`}>
      {(titulo || acao) && (
        <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3.5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{titulo}</h2>
          {acao}
        </header>
      )}
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
  )
}

export function CampoFiltro({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-1">{children}</div>
}

export function RotuloFiltro({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{children}</span>
}
