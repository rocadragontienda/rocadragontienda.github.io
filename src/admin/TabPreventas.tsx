import { useState, useEffect } from 'react'
import type { Preventa, Categoria } from '../types'

interface CreateInput {
  nombre: string
  sku: string
  precio: number
  precio_preventa?: number
  precio_costo?: number
  stock_s1: number
  stock_s2: number
  stock_minimo: number
  categoria_id?: number
}

interface Props {
  preventas: Preventa[]
  loading: boolean
  categorias: Categoria[]
  onFetch: () => void
  onFetchCat: () => void
  onCreate: (data: Record<string, unknown>) => Promise<void>
  onDelete: (id: number) => Promise<void>
  onUpdate: (nombre: string, data: Record<string, unknown>) => Promise<void>
}

const emptyForm = {
  nombre: '', sku: '', precio: '', precio_preventa: '', precio_costo: '',
  stock_s1: '0', stock_s2: '0', stock_minimo: '0', categoria_id: '',
}
const fmt = (v: number | null | undefined) =>
  v != null ? '$' + Math.round(v).toLocaleString('es-CL') : '—'

// ── Modal edición de precios ────────────────────────────────────────────────
interface EditModalProps {
  nombre: string
  s1?: Preventa
  onSave: (nombre: string, data: Record<string, unknown>) => Promise<void>
  onClose: () => void
}

function EditModal({ nombre, s1, onSave, onClose }: EditModalProps) {
  const [precio,         setPrecio]        = useState(String(s1?.precio ?? ''))
  const [precioPreventa, setPrecioPreventa] = useState(String(s1?.precio_preventa ?? ''))
  const [precioCosto,    setPrecioCosto]    = useState(String(s1?.precio_costo ?? ''))
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')

  async function handleSave() {
    if (!precio) { setErr('El precio normal es requerido'); return }
    setSaving(true); setErr('')
    try {
      await onSave(nombre, {
        precio:          parseFloat(precio),
        precio_preventa: precioPreventa ? parseFloat(precioPreventa) : null,
        precio_costo:    precioCosto    ? parseFloat(precioCosto)    : null,
      })
      onClose()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <h3>Editar precios</h3>
        <p className="adm-modal-meta"><strong>{nombre}</strong> — se aplica a todas las sucursales.</p>
        <div className="adm-form-grid">
          <div className="adm-form-group">
            <label>Precio Normal *</label>
            <input className="adm-input" type="number" min="0" step="1" value={precio}
              onChange={e => setPrecio(e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label>Precio Preventa</label>
            <input className="adm-input" type="number" min="0" step="1"
              placeholder="Precio especial preventa" value={precioPreventa}
              onChange={e => setPrecioPreventa(e.target.value)} />
          </div>
          <div className="adm-form-group">
            <label>Precio Costo</label>
            <input className="adm-input" type="number" min="0" step="1"
              placeholder="Costo de adquisición" value={precioCosto}
              onChange={e => setPrecioCosto(e.target.value)} />
          </div>
        </div>
        {err && <p className="adm-error">{err}</p>}
        <div className="adm-modal-footer">
          <button className="adm-btn adm-btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar precios'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TabPreventas({ preventas, loading, categorias, onFetch, onFetchCat, onCreate, onDelete, onUpdate }: Props) {
  const [form, setForm]           = useState(emptyForm)
  const [err, setErr]             = useState('')
  const [saving, setSaving]       = useState(false)
  const [showForm, setShowForm]     = useState(false)
  const [editNombre, setEditNombre] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFetch(); onFetchCat() }, [])

  // Agrupar por nombre: 1 fila por producto con stock de ambas sucursales
  const grouped = preventas.reduce<Record<string, { s1?: Preventa; s2?: Preventa }>>((acc, p) => {
    if (!acc[p.nombre]) acc[p.nombre] = {}
    if (p.sucursal === 1) acc[p.nombre].s1 = p
    else                  acc[p.nombre].s2 = p
    return acc
  }, {})

  async function handleCreate() {
    if (!form.nombre.trim() || !form.precio) { setErr('Nombre y precio normal son requeridos'); return }
    setSaving(true); setErr('')
    try {
      const data: CreateInput = {
        nombre:      form.nombre.trim(),
        sku:         form.sku.trim(),
        precio:      parseFloat(form.precio),
        stock_s1:    parseInt(form.stock_s1)     || 0,
        stock_s2:    parseInt(form.stock_s2)     || 0,
        stock_minimo:parseInt(form.stock_minimo) || 0,
        ...(form.precio_preventa ? { precio_preventa: parseFloat(form.precio_preventa) } : {}),
        ...(form.precio_costo    ? { precio_costo:    parseFloat(form.precio_costo) }    : {}),
        ...(form.categoria_id    ? { categoria_id:    parseInt(form.categoria_id) }      : {}),
      }
      await onCreate(data as unknown as Record<string, unknown>)
      setForm(emptyForm)
      setShowForm(false)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al crear')
    } finally { setSaving(false) }
  }

  async function handleDesactivar(nombre: string, s1?: Preventa, s2?: Preventa) {
    if (!confirm(`¿Desactivar la preventa "${nombre}"?`)) return
    const ids = [s1?.id, s2?.id].filter((id): id is number => id !== undefined)
    await Promise.all(ids.map(id => onDelete(id))).catch(e => alert(e instanceof Error ? e.message : 'Error'))
  }

  const padres = categorias.filter(c => !c.id_padre)
  const hijos  = categorias.filter(c =>  c.id_padre)

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2>Preventas</h2>
          <p className="adm-section-desc">Productos con precio especial de preventa, precio costo y exclusión del programa Rocapuntos.</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => { setShowForm(v => !v); setErr('') }}>
          {showForm ? 'Cancelar' : '+ Nueva preventa'}
        </button>
      </div>

      {/* Formulario creación */}
      {showForm && (
        <div className="adm-form-box">
          <h3>Nuevo producto preventa</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label>Nombre *</label>
              <input className="adm-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del producto" />
            </div>
            <div className="adm-form-group">
              <label>SKU</label>
              <input className="adm-input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="Código SKU" />
            </div>
            <div className="adm-form-group">
              <label>Precio Normal *</label>
              <input className="adm-input" type="number" min="0" value={form.precio} onChange={e => setForm(f => ({ ...f, precio: e.target.value }))} placeholder="0" />
            </div>
            <div className="adm-form-group">
              <label>Precio Preventa</label>
              <input className="adm-input" type="number" min="0" value={form.precio_preventa} onChange={e => setForm(f => ({ ...f, precio_preventa: e.target.value }))} placeholder="Precio especial" />
            </div>
            <div className="adm-form-group">
              <label>Precio Costo</label>
              <input className="adm-input" type="number" min="0" value={form.precio_costo} onChange={e => setForm(f => ({ ...f, precio_costo: e.target.value }))} placeholder="Costo de adquisición" />
            </div>
            <div className="adm-form-group">
              <label>Categoría</label>
              <select className="adm-input" value={form.categoria_id} onChange={e => setForm(f => ({ ...f, categoria_id: e.target.value }))}>
                <option value="">Sin categoría</option>
                {padres.map(p => (
                  <optgroup key={p.id} label={p.nombre}>
                    {hijos.filter(h => h.id_padre === p.id).map(h => (
                      <option key={h.id} value={h.id}>{h.nombre}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="adm-form-group">
              <label>Stock Centro (S1)</label>
              <input className="adm-input" type="number" min="0" value={form.stock_s1} onChange={e => setForm(f => ({ ...f, stock_s1: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Stock Oriente (S2)</label>
              <input className="adm-input" type="number" min="0" value={form.stock_s2} onChange={e => setForm(f => ({ ...f, stock_s2: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Stock Mínimo</label>
              <input className="adm-input" type="number" min="0" value={form.stock_minimo} onChange={e => setForm(f => ({ ...f, stock_minimo: e.target.value }))} />
            </div>
          </div>
          {err && <p className="adm-error">{err}</p>}
          <div className="adm-form-footer">
            <button className="adm-btn adm-btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Creando…' : 'Crear preventa'}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="loading">Cargando…</div>}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Precio Normal</th>
              <th>P. Preventa</th>
              <th>P. Costo</th>
              <th>Categoría</th>
              <th>Stk Centro</th>
              <th>Stk Oriente</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 && !loading && (
              <tr><td colSpan={9} className="adm-table-empty">No hay preventas creadas</td></tr>
            )}
            {Object.entries(grouped).map(([nombre, { s1, s2 }]) => (
              <tr key={nombre}>
                <td className="adm-td-nombre" title={nombre}>{nombre}</td>
                <td className="adm-text-muted">{s1?.sku || '—'}</td>
                <td>{fmt(s1?.precio)}</td>
                <td>
                  {s1?.precio_preventa != null
                    ? <strong style={{ color: 'var(--accent)' }}>{fmt(s1.precio_preventa)}</strong>
                    : <span className="adm-text-muted">—</span>}
                </td>
                <td className="adm-text-muted">{fmt(s1?.precio_costo)}</td>
                <td className="adm-text-muted">{s1?.cat_nombre || '—'}</td>
                <td>{s1?.stock ?? '—'}</td>
                <td>{s2?.stock ?? '—'}</td>
                <td style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="adm-btn adm-btn-sm" onClick={() => setEditNombre(nombre)}>Precios</button>
                  <button className="adm-btn adm-btn-sm adm-btn-danger"
                    onClick={() => handleDesactivar(nombre, s1, s2)}>Desactivar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editNombre && grouped[editNombre] && (
        <EditModal
          nombre={editNombre}
          s1={grouped[editNombre].s1}
          onSave={onUpdate}
          onClose={() => setEditNombre(null)}
        />
      )}
    </div>
  )
}
