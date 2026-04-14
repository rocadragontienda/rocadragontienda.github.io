import { useState, useMemo } from 'react'
import type { AlertaProducto } from '../types'

interface Props {
  alertas: AlertaProducto[]
  loading: boolean
}

interface HijoNode { id: number; nombre: string; count: number }
interface PadreNode { id: number; nombre: string; count: number; hijos: HijoNode[] }

function buildTree(alertas: AlertaProducto[]): PadreNode[] {
  const pm = new Map<number, { nombre: string; names: Set<string>; hijos: Map<number, { nombre: string; names: Set<string> }> }>()

  for (const p of alertas) {
    if (!pm.has(p.padre_id)) {
      pm.set(p.padre_id, { nombre: p.padre_nombre, names: new Set(), hijos: new Map() })
    }
    const node = pm.get(p.padre_id)!
    node.names.add(p.nombre)

    if (p.categoria_id !== p.padre_id) {
      if (!node.hijos.has(p.categoria_id)) {
        node.hijos.set(p.categoria_id, { nombre: p.cat_nombre, names: new Set() })
      }
      node.hijos.get(p.categoria_id)!.names.add(p.nombre)
    }
  }

  return Array.from(pm.entries())
    .map(([id, n]) => ({
      id,
      nombre: n.nombre,
      count: n.names.size,
      hijos: Array.from(n.hijos.entries())
        .map(([hid, h]) => ({ id: hid, nombre: h.nombre, count: h.names.size }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count)
}

function stockClass(stock: number | null, minimo: number | null): string {
  if (stock === null) return ''
  if (stock === 0) return 'stock-cero-cell'
  if (minimo !== null && stock <= minimo) return 'stock-bajo-cell'
  return ''
}

function stockLabel(stock: number | null, minimo: number | null) {
  if (stock === null) return <span className="no-sucursal">—</span>
  if (stock === 0) return <span className="estado-pill sin-stock">0 — Sin stock</span>
  if (minimo !== null && stock <= minimo) return <span className="estado-pill critico">{stock} — Crítico</span>
  return <span>{stock}</span>
}

export default function AlertasInventario({ alertas, loading }: Props) {
  const [search,          setSearch]          = useState('')
  const [selectedPadreId, setSelectedPadreId] = useState<number | null>(null)
  const [selectedCatId,   setSelectedCatId]   = useState<number | null>(null)

  const tree = useMemo(() => buildTree(alertas), [alertas])

  const visible = useMemo(() => {
    const q = search.toLowerCase()
    return alertas.filter(p => {
      const matchesCat =
        selectedCatId   !== null ? p.categoria_id === selectedCatId :
        selectedPadreId !== null ? p.padre_id      === selectedPadreId :
        true
      const matchesSearch = !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [alertas, selectedPadreId, selectedCatId, search])

  function selectPadre(id: number) {
    if (selectedPadreId === id) {
      setSelectedPadreId(null)
      setSelectedCatId(null)
    } else {
      setSelectedPadreId(id)
      setSelectedCatId(null)
    }
  }

  function selectCat(id: number) {
    setSelectedCatId(prev => prev === id ? null : id)
  }

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /></div>
  }

  if (alertas.length === 0) {
    return (
      <div className="no-alertas">
        <p>Sin alertas de inventario. Todo el stock está en niveles normales.</p>
      </div>
    )
  }

  const expandedPadre = selectedPadreId !== null
    ? tree.find(n => n.id === selectedPadreId) ?? null
    : null

  return (
    <div className="alertas-container">
      {/* ── Filtros ── */}
      <div className="alertas-filters">

        {/* Búsqueda en caliente */}
        <div className="alertas-search-wrap">
          <svg className="search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            className="alertas-search"
            type="text"
            placeholder="Buscar por nombre o SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            spellCheck={false}
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Limpiar búsqueda">✕</button>
          )}
        </div>

        {/* Padre chips */}
        <div className="cat-tree">
          <button
            className={`cat-padre${selectedPadreId === null ? ' active' : ''}`}
            onClick={() => { setSelectedPadreId(null); setSelectedCatId(null) }}
          >
            Todos
          </button>
          {tree.map(padre => (
            <button
              key={padre.id}
              className={`cat-padre${selectedPadreId === padre.id ? ' active' : ''}`}
              onClick={() => selectPadre(padre.id)}
            >
              {padre.nombre}
              <span className="cat-count">{padre.count}</span>
              {padre.hijos.length > 0 && (
                <span className="cat-arrow">{selectedPadreId === padre.id ? '▴' : '▾'}</span>
              )}
            </button>
          ))}
        </div>

        {/* Hijo chips (solo si hay padre expandido con hijos) */}
        {expandedPadre && expandedPadre.hijos.length > 0 && (
          <div className="cat-hijos">
            {expandedPadre.hijos.map(hijo => (
              <button
                key={hijo.id}
                className={`cat-hijo${selectedCatId === hijo.id ? ' active' : ''}`}
                onClick={() => selectCat(hijo.id)}
              >
                {hijo.nombre}
                <span className="cat-count">{hijo.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resultado count */}
      {(search || selectedPadreId !== null) && (
        <p className="alertas-result-count">
          {visible.length} producto{visible.length !== 1 ? 's' : ''}
          {selectedCatId !== null
            ? ` en ${expandedPadre?.hijos.find(h => h.id === selectedCatId)?.nombre ?? ''}`
            : selectedPadreId !== null
            ? ` en ${expandedPadre?.nombre ?? ''}`
            : ''}
          {search ? ` · "${search}"` : ''}
        </p>
      )}

      {/* Tabla */}
      {visible.length === 0 ? (
        <div className="no-alertas"><p>Sin resultados para esta búsqueda.</p></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>SKU</th>
                <th>Categoría</th>
                <th className="col-num col-sucursal">Centro</th>
                <th className="col-num">Mín Cto</th>
                <th className="col-num col-sucursal">Oriente</th>
                <th className="col-num">Mín Ote</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p, i) => (
                <tr key={i}>
                  <td>{p.nombre}</td>
                  <td className="sku">{p.sku || '—'}</td>
                  <td>{p.cat_nombre || '—'}</td>
                  <td className={`col-num stock-cell ${stockClass(p.stock_s1, p.minimo_s1)}`}>
                    {stockLabel(p.stock_s1, p.minimo_s1)}
                  </td>
                  <td className="col-num text-muted">{p.minimo_s1 ?? '—'}</td>
                  <td className={`col-num stock-cell ${stockClass(p.stock_s2, p.minimo_s2)}`}>
                    {stockLabel(p.stock_s2, p.minimo_s2)}
                  </td>
                  <td className="col-num text-muted">{p.minimo_s2 ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
