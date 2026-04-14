import { useEffect, useMemo, useState } from 'react'
import type { Categoria } from '../types'

interface OfertaActiva {
  nombre: string
  sku: string | null
  categoria: string | null
  precio_normal: number
  precio_oferta: number
  descuento_pct: number
  inicio: string | null
  fin: string | null
}

interface Props {
  categorias: Categoria[]
  ofertas: OfertaActiva[]
  loadingOfertas: boolean
  onFetchCategorias: () => void
  onFetchOfertas: (sucursal?: number) => void
  onDescuentoProducto: (data: Record<string, unknown>) => Promise<void>
  onCampaniaCategoria: (data: Record<string, unknown>) => Promise<void>
}

const fmt = (n: number | null | undefined) =>
  n != null ? '$' + Math.round(n).toLocaleString('es-CL') : '—'

const nowLocal = () => {
  const d = new Date()
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const plusDaysLocal = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function TabPromociones({
  categorias,
  ofertas,
  loadingOfertas,
  onFetchCategorias,
  onFetchOfertas,
  onDescuentoProducto,
  onCampaniaCategoria,
}: Props) {
  const [busquedaProducto, setBusquedaProducto] = useState('')
  const [descuentoProducto, setDescuentoProducto] = useState('15')
  const [sucursalProducto, setSucursalProducto] = useState('0')

  const [sucursalCampania, setSucursalCampania] = useState('1')
  const [categoriaCampania, setCategoriaCampania] = useState('0')
  const [descuentoCampania, setDescuentoCampania] = useState('15')
  const [inicioCampania, setInicioCampania] = useState(nowLocal())
  const [finCampania, setFinCampania] = useState(plusDaysLocal(30))

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [savingProd, setSavingProd] = useState(false)
  const [savingCamp, setSavingCamp] = useState(false)

  useEffect(() => {
    onFetchCategorias()
    onFetchOfertas(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [categorias],
  )

  async function aplicarProducto() {
    const pct = parseInt(descuentoProducto)
    if (!busquedaProducto.trim()) { setErr('Debes indicar el nombre del producto'); return }
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) { setErr('El descuento debe estar entre 1 y 95'); return }
    setSavingProd(true); setErr(''); setMsg('')
    try {
      await onDescuentoProducto({
        nombre: busquedaProducto.trim(),
        descuento: pct,
        sucursal: parseInt(sucursalProducto),
        inicio: inicioCampania,
        fin: finCampania,
      })
      setMsg('Descuento por producto aplicado correctamente')
      onFetchOfertas(parseInt(sucursalProducto) || 0)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al aplicar descuento por producto')
    } finally { setSavingProd(false) }
  }

  async function aplicarCampania() {
    const pct = parseInt(descuentoCampania)
    const suc = parseInt(sucursalCampania)
    if (![1, 2].includes(suc)) { setErr('Sucursal inválida'); return }
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) { setErr('El descuento debe estar entre 1 y 95'); return }
    setSavingCamp(true); setErr(''); setMsg('')
    try {
      await onCampaniaCategoria({
        sucursal: suc,
        categoria_id: parseInt(categoriaCampania),
        descuento: pct,
        inicio: inicioCampania,
        fin: finCampania,
      })
      setMsg('Campaña por categoría aplicada correctamente')
      onFetchOfertas(suc)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al aplicar campaña')
    } finally { setSavingCamp(false) }
  }

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2>Promociones</h2>
          <p className="adm-section-desc">Modo mixto: descuentos por producto individual y campañas por categoría.</p>
        </div>
      </div>

      <div className="adm-form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="adm-form-box">
          <h3>Aplicar Descuento por Producto</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group adm-form-group--wide">
              <label>Producto (nombre exacto)</label>
              <input className="adm-input" placeholder="Buscar producto por nombre..." value={busquedaProducto} onChange={e => setBusquedaProducto(e.target.value)} />
            </div>
            <div className="adm-form-group">
              <label>Sucursal</label>
              <select className="adm-input" value={sucursalProducto} onChange={e => setSucursalProducto(e.target.value)}>
                <option value="0">Todas</option>
                <option value="1">Centro (1)</option>
                <option value="2">Oriente (2)</option>
              </select>
            </div>
            <div className="adm-form-group">
              <label>Descuento (%)</label>
              <input className="adm-input" type="number" min="1" max="95" value={descuentoProducto} onChange={e => setDescuentoProducto(e.target.value)} />
            </div>
          </div>
          <div className="adm-form-footer">
            <button className="adm-btn adm-btn-primary" onClick={aplicarProducto} disabled={savingProd}>
              {savingProd ? 'Aplicando…' : 'Aplicar por producto'}
            </button>
          </div>
        </div>

        <div className="adm-form-box">
          <h3>Ofertas Activas ({ofertas.length})</h3>
          <div className="adm-form-footer" style={{ marginTop: 0, justifyContent: 'flex-start' }}>
            <button className="adm-btn adm-btn-ghost" onClick={() => onFetchOfertas(0)} disabled={loadingOfertas}>
              {loadingOfertas ? 'Refrescando…' : '↻ Refrescar'}
            </button>
          </div>
          <div className="adm-table-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Normal</th>
                  <th>Oferta</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.length === 0 && !loadingOfertas && (
                  <tr><td colSpan={4} className="adm-table-empty">No hay productos en oferta actualmente.</td></tr>
                )}
                {ofertas.slice(0, 8).map(o => (
                  <tr key={o.nombre}>
                    <td className="adm-td-nombre" title={o.nombre}>{o.nombre}</td>
                    <td>{fmt(o.precio_normal)}</td>
                    <td>{fmt(o.precio_oferta)}</td>
                    <td>{o.descuento_pct ?? '—'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="adm-section-desc" style={{ marginTop: '0.6rem' }}>
            Los precios de oferta se sincronizan a ambas sucursales en la próxima actualización.
          </p>
        </div>
      </div>

      <div className="adm-form-box">
        <h3>Gestor de Campañas — Descuento por Categoría</h3>
        <div className="adm-form-grid">
          <div className="adm-form-group">
            <label>Sucursal</label>
            <select className="adm-input" value={sucursalCampania} onChange={e => setSucursalCampania(e.target.value)}>
              <option value="1">Centro (1)</option>
              <option value="2">Oriente (2)</option>
            </select>
          </div>
          <div className="adm-form-group">
            <label>Categoría (vacío = todas)</label>
            <select className="adm-input" value={categoriaCampania} onChange={e => setCategoriaCampania(e.target.value)}>
              <option value="0">Todas</option>
              {categoriasOrdenadas.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="adm-form-group">
            <label>Descuento (%)</label>
            <input className="adm-input" type="number" min="1" max="95" value={descuentoCampania} onChange={e => setDescuentoCampania(e.target.value)} placeholder="Ej: 15" />
          </div>
          <div className="adm-form-group">
            <label>Inicio campaña</label>
            <input className="adm-input" type="datetime-local" value={inicioCampania} onChange={e => setInicioCampania(e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label>Fin campaña</label>
            <input className="adm-input" type="datetime-local" value={finCampania} onChange={e => setFinCampania(e.target.value)} />
          </div>
        </div>
        <div className="adm-form-footer">
          <button className="adm-btn adm-btn-primary" onClick={aplicarCampania} disabled={savingCamp}>
            {savingCamp ? 'Aplicando…' : 'Aplicar campaña'}
          </button>
        </div>
        <p className="adm-section-desc adm-mt">
          Aplica descuento masivo por categoría en la sucursal seleccionada. Si eliges una categoría padre, se incluyen subcategorías.
        </p>
      </div>

      {err && <p className="adm-error">{err}</p>}
      {msg && <p className="adm-success">✓ {msg}</p>}
    </div>
  )
}
