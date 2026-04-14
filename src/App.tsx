import { useState, useEffect, useCallback } from 'react'
import StatsCard from './components/StatsCard'
import SalesBarChart from './components/SalesBarChart'
import BestSellersTable from './components/BestSellersTable'
import AlertasInventario from './components/AlertasInventario'
import Login from './components/Login'
import { fetchStats, fetchSucursalStats, fetchBestSellers, fetchAlertas, setToken } from './api'
import type { SucursalStat, BestSeller, VentasStats, AlertaProducto } from './types'

type Tab = 'ventas' | 'alertas'

const SESSION_KEY = 'roca_dash_token'
const USER_KEY    = 'roca_dash_user'

type AuthUser = { username: string; nombre: string; apellido: string; tipo: number }

const chiToday = () => {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

const chiDaysAgo = (n: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
}

const chiFirstOfMonth = () => {
  const now      = new Date()
  const chiStr   = now.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }) // YYYY-MM-DD
  return chiStr.slice(0, 7) + '-01'
}

const today = chiToday
const daysAgo = chiDaysAgo
const firstOfMonth = chiFirstOfMonth

const formatCLP = (v: number) =>
  '$' + Math.round(v).toLocaleString('es-CL')

// ── Componente principal ──────────────────────────────────────────────────────

export default function App() {
  // ── Auth state (persiste en sessionStorage) ───────────────────────────────
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(USER_KEY)
      const token = sessionStorage.getItem(SESSION_KEY)
      if (saved && token) {
        setToken(token)
        return JSON.parse(saved) as AuthUser
      }
    } catch { /* ignorar */ }
    return null
  })

  const handleLogin = useCallback((token: string, u: AuthUser) => {
    sessionStorage.setItem(SESSION_KEY, token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(token)
    setUser(u)
  }, [])

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  if (!user) return <Login onLogin={handleLogin} />

  return <Dashboard user={user} onLogout={handleLogout} />
}

// ── Dashboard (solo si autenticado) ──────────────────────────────────────────

function Dashboard({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [tab, setTab]       = useState<Tab>('ventas')
  const [desde, setDesde]   = useState(daysAgo(29))
  const [hasta, setHasta]   = useState(today())

  const [stats,        setStats]        = useState<VentasStats  | null>(null)
  const [sucursalData, setSucursalData] = useState<SucursalStat[]>([])
  const [bestSellers,  setBestSellers]  = useState<BestSeller[]>([])
  const [alertas,      setAlertas]      = useState<AlertaProducto[]>([])

  const [loading,        setLoading]        = useState(false)
  const [loadingAlertas, setLoadingAlertas] = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, sc, bs] = await Promise.all([
        fetchStats(desde, hasta),
        fetchSucursalStats(desde, hasta),
        fetchBestSellers(desde, hasta),
      ])
      setStats(s)
      setSucursalData(sc)
      setBestSellers(bs)
    } catch (e: unknown) {
      if (e instanceof Error && (e as { status?: number }).status === 401) {
        onLogout()
        return
      }
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [desde, hasta, onLogout])

  useEffect(() => { void load() }, [load])

  const loadAlertasData = useCallback(async () => {
    setLoadingAlertas(true)
    try {
      const data = await fetchAlertas()
      setAlertas(data)
    } catch (e: unknown) {
      if (e instanceof Error && (e as { status?: number }).status === 401) {
        onLogout()
      }
    } finally {
      setLoadingAlertas(false)
    }
  }, [onLogout])

  useEffect(() => { void loadAlertasData() }, [loadAlertasData])

  const setRange = (d: string, h: string) => {
    setDesde(d)
    setHasta(h)
  }

  const quickBtns = [
    { label: 'Hoy',       d: today(),          h: today()      },
    { label: 'Ayer',      d: daysAgo(1),       h: daysAgo(1)   },
    { label: '7 días',    d: daysAgo(6),       h: today()      },
    { label: '30 días',   d: daysAgo(29),      h: today()      },
    { label: 'Este mes',  d: firstOfMonth(),   h: today()      },
  ]

  const isActive = (d: string, h: string) => desde === d && hasta === h

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L26 22H2L14 2Z" fill="#6366f1" opacity="0.85" />
              <path d="M14 8L22 22H6L14 8Z" fill="#22d3ee" opacity="0.7" />
            </svg>
            <h1>Rocadragón</h1>
          </div>
          <span className="header-sub">Dashboard Administrativo</span>
          {(loading || loadingAlertas) && <span className="spinner" aria-label="Cargando" />}
          <div className="header-user">
            <span className="header-username">{user.nombre}</span>
            <button className="logout-btn" onClick={onLogout} title="Cerrar sesión">
              Salir
            </button>
          </div>
        </div>
        {/* Nav Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab${tab === 'ventas' ? ' active' : ''}`}
            onClick={() => setTab('ventas')}
          >
            Ventas
          </button>
          <button
            className={`nav-tab${tab === 'alertas' ? ' active' : ''}`}
            onClick={() => setTab('alertas')}
          >
            Alertas de Inventario
            {alertas.length > 0 && (
              <span className="badge">
                {alertas.reduce((n, p) => {
                  if (p.stock_s1 !== null && p.minimo_s1 !== null && p.stock_s1 <= p.minimo_s1) n++
                  if (p.stock_s2 !== null && p.minimo_s2 !== null && p.stock_s2 <= p.minimo_s2) n++
                  return n
                }, 0)}
              </span>
            )}
          </button>
        </nav>
      </header>

      <main className="main">
        {tab === 'ventas' && (
          <>
            {/* Barra de filtros */}
            <div className="filter-bar">
              <div className="quick-btns">
                {quickBtns.map((b) => (
                  <button
                    key={b.label}
                    className={isActive(b.d, b.h) ? 'active' : ''}
                    onClick={() => setRange(b.d, b.h)}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="date-inputs">
                <label>
                  Desde
                  <input
                    type="date"
                    value={desde}
                    max={hasta}
                    onChange={(e) => setDesde(e.target.value)}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="date"
                    value={hasta}
                    min={desde}
                    max={today()}
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </label>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="error-banner" role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* KPIs */}
            <div className="stats-row">
              <StatsCard
                icon="🛒"
                title="Transacciones"
                value={stats ? stats.total_ventas.toLocaleString('es-CL') : '—'}
              />
              <StatsCard
                icon="💰"
                title="Total Ventas"
                value={stats ? formatCLP(stats.total_monto) : '—'}
              />
              <StatsCard
                icon="📊"
                title="Ticket Promedio"
                value={stats ? formatCLP(stats.ticket_promedio) : '—'}
              />
            </div>

            {/* Gráfico de barras */}
            <section className="card">
              <h2>Ventas por Sucursal</h2>
              <p className="card-desc">
                Comparativo de monto total y número de transacciones entre sucursales.
              </p>
              {loading
                ? <div className="loading">Cargando datos…</div>
                : <SalesBarChart data={sucursalData} />
              }
            </section>

            {/* Tabla Best Sellers */}
            <section className="card">
              <h2>Top 10 Best Sellers</h2>
              <p className="card-desc">
                Productos más vendidos (por unidades) en el período{' '}
                <strong>{desde}</strong> → <strong>{hasta}</strong>.
              </p>
              {loading
                ? <div className="loading">Cargando datos…</div>
                : <BestSellersTable data={bestSellers} />
              }
            </section>
          </>
        )}

        {tab === 'alertas' && (
          <section className="card">
            <h2>Alertas de Inventario</h2>
            <p className="card-desc">
              Productos con stock igual o por debajo del mínimo configurado.
            </p>
            <AlertasInventario alertas={alertas} loading={loadingAlertas} />
          </section>
        )}
      </main>
    </div>
  )
}
