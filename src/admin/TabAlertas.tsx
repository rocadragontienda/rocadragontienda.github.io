import { useState, useEffect, useCallback } from 'react'
import AlertasInventario from '../components/AlertasInventario'
import { fetchAlertas } from '../api'
import type { AlertaProducto } from '../types'

export default function TabAlertas({ onLogout }: { onLogout: () => void }) {
  const [alertas, setAlertas]   = useState<AlertaProducto[]>([])
  const [loading, setLoading]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setAlertas(await fetchAlertas()) }
    catch (e: unknown) {
      if ((e as { status?: number }).status === 401) onLogout()
    }
    finally { setLoading(false) }
  }, [onLogout])

  useEffect(() => { void load() }, [load])

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2>Alertas de Inventario</h2>
          <p className="adm-section-desc">Productos con stock ≤ mínimo configurado.</p>
        </div>
        <button className="adm-btn adm-btn-ghost" onClick={load} disabled={loading}>
          {loading ? 'Actualizando…' : '↺ Actualizar'}
        </button>
      </div>
      <section className="card">
        <AlertasInventario alertas={alertas} loading={loading} />
      </section>
    </div>
  )
}
