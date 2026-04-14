import { useState, useEffect } from 'react'
import type { Categoria } from '../types'

interface Props {
  categorias: Categoria[]
  loading: boolean
  onFetch: () => void
  onSave: (data: { nombre: string; id_padre: number | null }, id?: number) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

type ModalState = { open: boolean; id?: number; nombre: string; id_padre: number | null }

export default function TabCategorias({ categorias, loading, onFetch, onSave, onDelete }: Props) {
  const [modal, setModal]             = useState<ModalState>({ open: false, nombre: '', id_padre: null })
  const [err, setErr]                 = useState('')
  const [saving, setSaving]           = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { onFetch() }, [])

  const padres = categorias.filter(c => !c.id_padre)

  function openNew(id_padre: number | null = null) {
    setModal({ open: true, nombre: '', id_padre }); setErr('')
  }
  function openEdit(c: Categoria) {
    setModal({ open: true, id: c.id, nombre: c.nombre, id_padre: c.id_padre }); setErr('')
  }
  function closeModal() { setModal({ open: false, nombre: '', id_padre: null }) }

  async function handleSave() {
    if (!modal.nombre.trim()) { setErr('El nombre es requerido'); return }
    setSaving(true); setErr('')
    try {
      await onSave({ nombre: modal.nombre.trim(), id_padre: modal.id_padre }, modal.id)
      closeModal()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  async function handleDelete(id: number) {
    try { await onDelete(id) }
    catch (e: unknown) { alert(e instanceof Error ? e.message : 'Error al eliminar') }
    finally { setDeleteConfirm(null) }
  }

  // Árbol padre → hijos
  const tree = padres.map(p => ({ ...p, hijos: categorias.filter(c => c.id_padre === p.id) }))

  return (
    <div className="adm-tab-content">
      <div className="adm-section-header">
        <div>
          <h2>Categorías</h2>
          <p className="adm-section-desc">Organiza los productos en categorías y subcategorías.</p>
        </div>
        <button className="adm-btn adm-btn-primary" onClick={() => openNew()}>+ Nueva categoría</button>
      </div>

      {loading && <div className="loading">Cargando…</div>}

      {!loading && tree.length === 0 && (
        <p className="adm-text-muted" style={{ textAlign: 'center', padding: '2rem' }}>
          No hay categorías todavía. Crea la primera.
        </p>
      )}

      <div className="adm-cat-tree">
        {tree.map(padre => (
          <div key={padre.id} className="adm-cat-padre">
            {/* Fila padre */}
            <div className="adm-cat-row adm-cat-row--padre">
              <span className="adm-cat-nombre">{padre.nombre}</span>
              <div className="adm-cat-actions">
                <button className="adm-btn adm-btn-sm" onClick={() => openNew(padre.id)}>+ Sub</button>
                <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => openEdit(padre)}>Editar</button>
                <button className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => setDeleteConfirm(padre.id)}>Eliminar</button>
              </div>
            </div>
            {/* Filas hijo */}
            {padre.hijos.map(hijo => (
              <div key={hijo.id} className="adm-cat-row adm-cat-row--hijo">
                <span className="adm-cat-nombre adm-cat-nombre--hijo">↳ {hijo.nombre}</span>
                <div className="adm-cat-actions">
                  <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={() => openEdit(hijo)}>Editar</button>
                  <button className="adm-btn adm-btn-sm adm-btn-danger" onClick={() => setDeleteConfirm(hijo.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Modal edición / creación */}
      {modal.open && (
        <div className="adm-modal-overlay" onClick={closeModal}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <h3>
              {modal.id
                ? 'Editar categoría'
                : modal.id_padre
                ? `Nueva subcategoría de "${categorias.find(c => c.id === modal.id_padre)?.nombre ?? ''}"`
                : 'Nueva categoría'}
            </h3>
            <div className="adm-form-group">
              <label>Nombre</label>
              <input
                className="adm-input"
                value={modal.nombre}
                onChange={e => setModal(m => ({ ...m, nombre: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>
            {/* Selector de padre solo al crear categoría raíz */}
            {!modal.id && !modal.id_padre && (
              <div className="adm-form-group" style={{ marginTop: '0.75rem' }}>
                <label>Padre (opcional)</label>
                <select
                  className="adm-input"
                  value={modal.id_padre ?? ''}
                  onChange={e => setModal(m => ({ ...m, id_padre: e.target.value ? parseInt(e.target.value) : null }))}
                >
                  <option value="">Sin categoría padre</option>
                  {padres.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}
            {err && <p className="adm-error">{err}</p>}
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="adm-btn adm-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {deleteConfirm !== null && (
        <div className="adm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="adm-modal adm-modal--sm" onClick={e => e.stopPropagation()}>
            <h3>¿Eliminar categoría?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              Solo es posible eliminar categorías sin subcategorías ni productos asignados.
            </p>
            <div className="adm-modal-footer">
              <button className="adm-btn adm-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="adm-btn adm-btn-danger" onClick={() => handleDelete(deleteConfirm)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
