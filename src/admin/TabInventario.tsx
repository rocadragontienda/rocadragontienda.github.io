import { useState, useEffect, useCallback } from 'react'
import type { ProductoMaestro, Categoria } from '../types'

interface InvPage { rows: ProductoMaestro[]; total: number; pages: number; page: number }

interface Props {
  inventario: InvPage
  loading: boolean
  categorias: Categoria[]
  onFetch: (page?: number, q?: string, cat?: number) => void
  onFetchCat: () => void
  onSync: (data: Record<string, unknown>) => Promise<void>
  onCreate: (data: Record<string, unknown>) => Promise<void>
}

const fmt = (v: number | null | undefined) =>
  v != null ? '$' + Math.round(v).toLocaleString('es-CL') : '—'

export default function TabInventario({ inventario, loading, categorias, onFetch, onFetchCat, onSync, onCreate }: Props) {
  const [q,    setQ]    = useState('')
  const [cat,  setCat]  = useState(0)
  const [page, setPage] = useState(1)

  const [showCreate, setShowCreate] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createErr, setCreateErr] = useState('')
  const [createForm, setCreateForm] = useState({
    nombre: '',
    sku: '',
    precio: '',
    precio_preventa: '',
    precio_costo: '',
    stock_s1: '0',
    stock_s2: '0',
    stock_minimo: '1',
    categoria_id: '',
    permite_puntos: '1',
  })

  const [editRow, setEditRow]     = useState<ProductoMaestro | null>(null)
  const [editFields, setEditFields] = useState<Partial<ProductoMaestro>>({})
  const [saving, setSaving]       = useState(false)
  const [saveErr, setSaveErr]     = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFetchCat() }, [])

  // Fetch cuando cambian página / búsqueda / categoría (debounce 300ms)
  const load = useCallback(() => { onFetch(page, q, cat) }, [page, q, cat, onFetch])
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function handleQChange(v: string)   { setQ(v);   setPage(1) }
  function handleCatChange(v: number) { setCat(v); setPage(1) }

  function openEdit(p: ProductoMaestro) {
    setEditRow(p)
    setEditFields({
      precio: p.precio,
      precio_preventa: p.precio_preventa,
      precio_costo: p.precio_costo,
      stock_minimo: p.stock_minimo,
      categoria_id: p.categoria_id,
      permite_puntos: p.permite_puntos,
    })
    setSaveErr('')
  }

  async function handleSync() {
    if (!editRow) return
    setSaving(true); setSaveErr('')
    try {
      await onSync({ nombre: editRow.nombre, ...editFields })
      setEditRow(null)
      onFetch(page, q, cat)
    } catch (e: unknown) {
      setSaveErr(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally { setSaving(false) }
  }

  async function handleCreate() {
    if (!createForm.nombre.trim()) { setCreateErr('Nombre requerido'); return }
    if (!createForm.precio.trim()) { setCreateErr('Precio requerido'); return }
    setCreateSaving(true)
    setCreateErr('')
    try {
      await onCreate({
        nombre: createForm.nombre.trim(),
        sku: createForm.sku.trim(),
        precio: parseInt(createForm.precio, 10),
        precio_preventa: createForm.precio_preventa ? parseInt(createForm.precio_preventa, 10) : 0,
        precio_costo: createForm.precio_costo ? parseInt(createForm.precio_costo, 10) : 0,
        stock_s1: parseInt(createForm.stock_s1 || '0', 10),
        stock_s2: parseInt(createForm.stock_s2 || '0', 10),
        stock_minimo: parseInt(createForm.stock_minimo || '0', 10),
        permite_puntos: parseInt(createForm.permite_puntos || '1', 10),
        categoria_id: createForm.categoria_id ? parseInt(createForm.categoria_id, 10) : null,
      })
      setCreateForm({
        nombre: '',
        sku: '',
        precio: '',
        precio_preventa: '',
        precio_costo: '',
        stock_s1: '0',
        stock_s2: '0',
        stock_minimo: '1',
        categoria_id: '',
        permite_puntos: '1',
      })
      setShowCreate(false)
      setPage(1)
      onFetch(1, q, cat)
    } catch (e: unknown) {
      setCreateErr(e instanceof Error ? e.message : 'Error al crear producto')
    } finally {
      setCreateSaving(false)
    }
  }

  const padres = categorias.filter(c => !c.id_padre)
  const hijos  = categorias.filter(c =>  c.id_padre)

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2>Inventario Maestro</h2>
          <p className="adm-section-desc">Edita precio, stock mínimo, categoría y modo puntos. Los cambios se sincronizan a todas las sucursales (delta sync).</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => { setShowCreate(v => !v); setCreateErr('') }}>
          {showCreate ? 'Cancelar' : '+ Agregar ítem'}
        </button>
      </div>

      {showCreate && (
        <div className="adm-form-box">
          <h3>Nuevo ítem de inventario</h3>
          <div className="adm-form-grid">
            <div className="adm-form-group">
              <label>Nombre *</label>
              <input className="adm-input" value={createForm.nombre} onChange={e => setCreateForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>SKU</label>
              <input className="adm-input" value={createForm.sku} onChange={e => setCreateForm(f => ({ ...f, sku: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Precio *</label>
              <input className="adm-input" type="number" min="0" value={createForm.precio} onChange={e => setCreateForm(f => ({ ...f, precio: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Precio Preventa</label>
              <input className="adm-input" type="number" min="0" value={createForm.precio_preventa} onChange={e => setCreateForm(f => ({ ...f, precio_preventa: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Precio Costo</label>
              <input className="adm-input" type="number" min="0" value={createForm.precio_costo} onChange={e => setCreateForm(f => ({ ...f, precio_costo: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Categoría</label>
              <select className="adm-input" value={createForm.categoria_id} onChange={e => setCreateForm(f => ({ ...f, categoria_id: e.target.value }))}>
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
              <input className="adm-input" type="number" min="0" value={createForm.stock_s1} onChange={e => setCreateForm(f => ({ ...f, stock_s1: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Stock Oriente (S2)</label>
              <input className="adm-input" type="number" min="0" value={createForm.stock_s2} onChange={e => setCreateForm(f => ({ ...f, stock_s2: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Stock Mínimo</label>
              <input className="adm-input" type="number" min="0" value={createForm.stock_minimo} onChange={e => setCreateForm(f => ({ ...f, stock_minimo: e.target.value }))} />
            </div>
            <div className="adm-form-group">
              <label>Modo Puntos</label>
              <select className="adm-input" value={createForm.permite_puntos} onChange={e => setCreateForm(f => ({ ...f, permite_puntos: e.target.value }))}>
                <option value="1">Activo — acumula puntos</option>
                <option value="0">Excluido — no acumula</option>
                <option value="2">Preventa — excluido total</option>
              </select>
            </div>
          </div>
          {createErr && <p className="adm-error">{createErr}</p>}
          <div className="adm-form-footer">
            <button className="adm-btn adm-btn-primary" onClick={handleCreate} disabled={createSaving}>
              {createSaving ? 'Guardando…' : 'Guardar ítem'}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="filter-bar" style={{ gap: '0.75rem' }}>
        <input
          className="adm-input adm-search"
          placeholder="Buscar producto…"
          value={q}
          onChange={e => handleQChange(e.target.value)}
        />
        <select
          className="adm-input"
          style={{ width: 'auto', minWidth: '160px' }}
          value={cat}
          onChange={e => handleCatChange(parseInt(e.target.value))}
        >
          <option value={0}>Todas las categorías</option>
          {padres.map(p => (
            <optgroup key={p.id} label={p.nombre}>
              {hijos.filter(h => h.id_padre === p.id).map(h => (
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {loading && <div className="loading">Cargando…</div>}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>SKU</th>
              <th>Precio</th>
              <th>P. Preventa</th>
              <th>Costo</th>
              <th>Categoría</th>
              <th>Stk Centro</th>
              <th>Stk Oriente</th>
              <th>Mín</th>
              <th>Puntos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {inventario.rows.length === 0 && !loading && (
              <tr><td colSpan={11} className="adm-table-empty">Sin resultados</td></tr>
            )}
            {inventario.rows.map(p => (
              <tr key={p.id}>
                <td className="adm-td-nombre" title={p.nombre}>{p.nombre}</td>
                <td className="adm-text-muted">{p.sku || '—'}</td>
                <td>{fmt(p.precio)}</td>
                <td>{fmt(p.precio_preventa)}</td>
                <td>{fmt(p.precio_costo)}</td>
                <td className="adm-text-muted">{p.cat_nombre || '—'}</td>
                <td className={p.stock_s1 !== null && p.stock_s1 <= p.stock_minimo ? 'adm-stock-low' : ''}>
                  {p.stock_s1 ?? '—'}
                </td>
                <td className={p.stock_s2 !== null && p.stock_s2 <= p.stock_minimo ? 'adm-stock-low' : ''}>
                  {p.stock_s2 ?? '—'}
                </td>
                <td>{p.stock_minimo}</td>
                <td>
                  <span className={`adm-badge ${
                    p.permite_puntos === 0 ? 'adm-badge-danger'
                    : p.permite_puntos === 2 ? 'adm-badge-warn'
                    : 'adm-badge-ok'
                  }`}>
                    {p.permite_puntos === 0 ? 'Excluido' : p.permite_puntos === 2 ? 'Preventa' : 'Activo'}
                  </span>
                </td>
                <td>
                  <button className="adm-btn adm-btn-sm" onClick={() => openEdit(p)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {inventario.pages > 1 && (
        <div className="adm-pagination">
          <button
            className="adm-btn adm-btn-sm adm-btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >← Anterior</button>
          <span className="adm-page-info">
            Página {page} de {inventario.pages} ({inventario.total.toLocaleString('es-CL')} productos)
          </span>
          <button
            className="adm-btn adm-btn-sm adm-btn-ghost"
            disabled={page >= inventario.pages}
            onClick={() => setPage(p => p + 1)}
          >Siguiente →</button>
        </div>
      )}

      {/* Modal edición */}
      {editRow && (
        <div className="adm-modal-overlay" onClick={() => setEditRow(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3>Editar producto</h3>
            <p className="adm-modal-meta">
              <strong>{editRow.nombre}</strong> — Los cambios se aplicarán a <em>todas las sucursales</em>.
            </p>
            <div className="adm-form-grid">
              <div className="adm-form-group">
                <label>Precio</label>
                <input
                  className="adm-input"
                  type="number"
                  min="0"
                  value={editFields.precio ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, precio: parseFloat(e.target.value) }))}
                />
              </div>
              <div className="adm-form-group">
                <label>Precio Preventa</label>
                <input
                  className="adm-input"
                  type="number"
                  min="0"
                  value={editFields.precio_preventa ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, precio_preventa: e.target.value ? parseFloat(e.target.value) : 0 }))}
                />
              </div>
              <div className="adm-form-group">
                <label>Precio Costo</label>
                <input
                  className="adm-input"
                  type="number"
                  min="0"
                  value={editFields.precio_costo ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, precio_costo: e.target.value ? parseFloat(e.target.value) : 0 }))}
                />
              </div>
              <div className="adm-form-group">
                <label>Stock Mínimo</label>
                <input
                  className="adm-input"
                  type="number"
                  min="0"
                  value={editFields.stock_minimo ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, stock_minimo: parseInt(e.target.value) }))}
                />
              </div>
              <div className="adm-form-group">
                <label>Categoría</label>
                <select
                  className="adm-input"
                  value={editFields.categoria_id ?? ''}
                  onChange={e => setEditFields(f => ({ ...f, categoria_id: parseInt(e.target.value) }))}
                >
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
                <label>Permite Puntos</label>
                <select
                  className="adm-input"
                  value={editFields.permite_puntos ?? 1}
                  onChange={e => setEditFields(f => ({ ...f, permite_puntos: parseInt(e.target.value) }))}
                >
                  <option value={1}>Activo — acumula puntos</option>
                  <option value={0}>Excluido — no acumula</option>
                  <option value={2}>Preventa — excluido total</option>
                </select>
              </div>
            </div>
            {saveErr && <p className="adm-error">{saveErr}</p>}
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setEditRow(null)}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleSync} disabled={saving}>
                {saving ? 'Sincronizando…' : 'Sincronizar a todas las sucursales'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
