import { useState, useEffect, useCallback } from 'react'
import StatsCard from '../components/StatsCard'
import SalesBarChart from '../components/SalesBarChart'
import BestSellersTable from '../components/BestSellersTable'
import { fetchStats, fetchSucursalStats, fetchBestSellers } from '../api'
import type { SucursalStat, BestSeller, VentasStats } from '../types'

const fmt     = (v: number) => '$' + Math.round(v).toLocaleString('es-CL')
const toStr   = (d: Date)   => d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' })
const today   = ()          => toStr(new Date())
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return toStr(d) }
const firstOfMonth = () => today().slice(0, 7) + '-01'

const QUICK = [
  { label: 'Hoy',      d: today(),        h: today()      },
  { label: 'Ayer',     d: daysAgo(1),     h: daysAgo(1)   },
  { label: '7 días',   d: daysAgo(6),     h: today()      },
  { label: '30 días',  d: daysAgo(29),    h: today()      },
  { label: 'Este mes', d: firstOfMonth(), h: today()      },
]

export default function TabReportes({ onLogout }: { onLogout: () => void }) {
  const [desde, setDesde]         = useState(daysAgo(29))
  const [hasta, setHasta]         = useState(today())
  const [stats, setStats]         = useState<VentasStats | null>(null)
  const [sucData, setSucData]     = useState<SucursalStat[]>([])
  const [bestSellers, setBest]    = useState<BestSeller[]>([])
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [s, sc, bs] = await Promise.all([
        fetchStats(desde, hasta),
        fetchSucursalStats(desde, hasta),
        fetchBestSellers(desde, hasta),
      ])
      setStats(s); setSucData(sc); setBest(bs)
    } catch (e: unknown) {
      if ((e as { status?: number }).status === 401) { onLogout(); return }
      setError(e instanceof Error ? e.message : 'Error')
    } finally { setLoading(false) }
  }, [desde, hasta, onLogout])

  useEffect(() => { void load() }, [load])

  return (
    <div className="adm-tab-content">
      {/* Filter bar — same UX as Dashboard */}
      <div className="filter-bar">
        <div className="quick-btns">
          {QUICK.map(b => (
            <button
              key={b.label}
              className={desde === b.d && hasta === b.h ? 'active' : ''}
              onClick={() => { setDesde(b.d); setHasta(b.h) }}
            >{b.label}</button>
          ))}
        </div>
        <div className="date-inputs">
          <label>Desde <input type="date" value={desde} max={hasta}         onChange={e => setDesde(e.target.value)} /></label>
          <label>Hasta <input type="date" value={hasta} min={desde} max={today()} onChange={e => setHasta(e.target.value)} /></label>
        </div>
      </div>

      {error && <div className="error-banner">⚠️ {error}</div>}

      <div className="stats-row">
        <StatsCard icon="🛒" title="Transacciones"  value={stats ? stats.total_ventas.toLocaleString('es-CL') : '—'} />
        <StatsCard icon="💰" title="Total Ventas"    value={stats ? fmt(stats.total_monto)     : '—'} />
        <StatsCard icon="📊" title="Ticket Promedio" value={stats ? fmt(stats.ticket_promedio) : '—'} />
      </div>

      <section className="card">
        <h2>Ventas por Sucursal</h2>
        {loading ? <div className="loading">Cargando…</div> : <SalesBarChart data={sucData} />}
      </section>

      <section className="card">
        <h2>Best Sellers</h2>
        {loading ? <div className="loading">Cargando…</div> : <BestSellersTable data={bestSellers} />}
      </section>
    </div>
  )
}
