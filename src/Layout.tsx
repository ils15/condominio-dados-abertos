import { createContext, useContext, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Building2, CalendarClock, Database, FolderOpen, History, LayoutDashboard,
  Menu, Moon, Search, Sun, Users, X,
} from 'lucide-react'
import { dados } from './dados'
import { dataPt } from './format'

/* ------------------------------------------------------------------ busca global */
const BuscaCtx = createContext<{ consulta: string; setConsulta: (v: string) => void }>({
  consulta: '',
  setConsulta: () => {},
})
export const useBusca = () => useContext(BuscaCtx)

/* ------------------------------------------------------------------------- nav */
const ITENS = [
  { para: '/', rotulo: 'Painel', icone: LayoutDashboard, fim: true },
  { para: '/cronograma', rotulo: 'Cronograma', icone: CalendarClock },
  { para: '/historico', rotulo: 'Histórico', icone: History },
  { para: '/prestadores', rotulo: 'Prestadores', icone: Users },
  { para: '/documentos', rotulo: 'Documentos', icone: FolderOpen },
  { para: '/dados-abertos', rotulo: 'Dados abertos', icone: Database },
]

function TemaToggle() {
  const [escuro, setEscuro] = useState(() => document.documentElement.classList.contains('dark'))
  const alternar = () => {
    const novo = !escuro
    setEscuro(novo)
    document.documentElement.classList.toggle('dark', novo)
    localStorage.setItem('tema', novo ? 'dark' : 'claro')
  }
  return (
    <button
      onClick={alternar}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
      className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
    >
      {escuro ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
        <Building2 className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {dados.condominio.nome}
        </span>
        <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">Dados abertos do condomínio</span>
      </span>
    </div>
  )
}

function NavLinks({ aoNavegar }: { aoNavegar?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {ITENS.map(({ para, rotulo, icone: Icone, fim }) => (
        <NavLink
          key={para}
          to={para}
          end={fim}
          onClick={aoNavegar}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
            }`
          }
        >
          <Icone className="h-4 w-4 shrink-0" />
          {rotulo}
        </NavLink>
      ))}
    </nav>
  )
}

/* ----------------------------------------------------------------------- layout */
export default function Layout() {
  const [consulta, setConsulta] = useState('')
  const [menuAberto, setMenuAberto] = useState(false)

  return (
    <BuscaCtx.Provider value={{ consulta, setConsulta }}>
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {/* sidebar desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex">
          <div className="flex flex-col gap-6">
            <Logo />
            <NavLinks />
          </div>
          <Rodape />
        </aside>

        {/* drawer mobile */}
        {menuAberto && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-zinc-950/40" onClick={() => setMenuAberto(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-72 flex-col justify-between border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <Logo />
                  <button
                    onClick={() => setMenuAberto(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
                <NavLinks aoNavegar={() => setMenuAberto(false)} />
              </div>
              <Rodape />
            </aside>
          </div>
        )}

        {/* conteúdo */}
        <div className="flex min-h-screen flex-col lg:pl-64">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/80 sm:px-6">
            <button
              onClick={() => setMenuAberto(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
              title="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <label className="relative hidden max-w-md flex-1 sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Buscar em todo o portal…"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/30 dark:border-zinc-700 dark:bg-zinc-800/60 dark:focus:bg-zinc-800"
              />
            </label>

            <div className="ml-auto flex items-center gap-1">
              {dados.condominio.aviso && (
                <span className="mr-1 hidden rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 md:inline">
                  Dados de demonstração
                </span>
              )}
              <TemaToggle />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
            <Outlet />
          </main>

          <footer className="border-t border-zinc-200 px-6 py-4 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            {dados.condominio.nome} · Portal de dados abertos · atualizado em {dataPt(dados.gerado_em.slice(0, 10))}
          </footer>
        </div>
      </div>
    </BuscaCtx.Provider>
  )
}

function Rodape() {
  return (
    <p className="px-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-500">
      Conforme ABNT NBR 5674 — sistema de gestão de manutenção de edificações.
    </p>
  )
}
