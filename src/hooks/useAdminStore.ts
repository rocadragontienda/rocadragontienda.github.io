import { useState, useCallback } from 'react'
import { getToken } from '../api'
import type { Categoria, ProductoMaestro, Preventa, PuntosConfig } from '../types'

interface InvPage {
  rows: ProductoMaestro[]
  total: number
  pages: number
  page: number
}

interface AjusteResult {
  puntos_previos: number
  puntos_nuevos: number
  delta: number
}

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

async function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api/admin${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  })
  if (res.status === 401) {
    const err = Object.assign(new Error('Sesión expirada'), { status: 401 })
    throw err
  }
  if (res.status === 403) {
    throw Object.assign(new Error('Acceso denegado'), { status: 403 })
  }
  const json = (await res.json()) as { ok: boolean; data?: T; error?: string }
  if (!json.ok) throw new Error(json.error ?? `Error HTTP ${res.status}`)
  return json.data as T
}

export function useAdminStore() {
  // ── Categorías ───────────────────────────────────────────────
  const [categorias, setCategorias]   = useState<Categoria[]>([])
  const [loadingCat, setLoadingCat]   = useState(false)

  const fetchCategorias = useCallback(async () => {
    setLoadingCat(true)
    try { setCategorias(await adminFetch<Categoria[]>('/categorias')) }
    finally { setLoadingCat(false) }
  }, [])

  const saveCategoria = useCallback(
    async (data: { nombre: string; id_padre: number | null }, id?: number) => {
      if (id) await adminFetch<void>(`/categorias/${id}`, { method: 'PUT',  body: JSON.stringify(data) })
      else    await adminFetch<void>('/categorias',        { method: 'POST', body: JSON.stringify(data) })
      await fetchCategorias()
    },
    [fetchCategorias],
  )

  const deleteCategoria = useCallback(async (id: number) => {
    await adminFetch<void>(`/categorias/${id}`, { method: 'DELETE' })
    await fetchCategorias()
  }, [fetchCategorias])

  // ── Inventario ───────────────────────────────────────────────
  const [inventario, setInventario]   = useState<InvPage>({ rows: [], total: 0, pages: 1, page: 1 })
  const [loadingInv, setLoadingInv]   = useState(false)

  const fetchInventario = useCallback(async (page = 1, q = '', cat = 0) => {
    setLoadingInv(true)
    const params = new URLSearchParams({ page: String(page) })
    if (q)   params.set('q',   q)
    if (cat) params.set('cat', String(cat))
    try { setInventario(await adminFetch<InvPage>(`/inventario?${params}`)) }
    finally { setLoadingInv(false) }
  }, [])

  const syncProducto = useCallback(async (data: Record<string, unknown>) => {
    await adminFetch<void>('/inventario/sync', { method: 'PUT', body: JSON.stringify(data) })
  }, [])

  const createProducto = useCallback(async (data: Record<string, unknown>) => {
    await adminFetch<void>('/inventario', { method: 'POST', body: JSON.stringify(data) })
  }, [])

  // ── Preventas ────────────────────────────────────────────────
  const [preventas, setPreventas]     = useState<Preventa[]>([])
  const [loadingPrev, setLoadingPrev] = useState(false)

  const fetchPreventas = useCallback(async () => {
    setLoadingPrev(true)
    try { setPreventas(await adminFetch<Preventa[]>('/preventas')) }
    finally { setLoadingPrev(false) }
  }, [])

  const createPreventa = useCallback(async (data: Record<string, unknown>) => {
    await adminFetch<void>('/preventas', { method: 'POST', body: JSON.stringify(data) })
    await fetchPreventas()
  }, [fetchPreventas])

  const deletePreventa = useCallback(async (id: number) => {
    await adminFetch<void>(`/preventas/${id}`, { method: 'DELETE' })
    await fetchPreventas()
  }, [fetchPreventas])

  const updatePreventa = useCallback(async (nombre: string, data: Record<string, unknown>) => {
    await adminFetch<void>(`/preventas/${encodeURIComponent(nombre)}`, { method: 'PUT', body: JSON.stringify(data) })
    await fetchPreventas()
  }, [fetchPreventas])

  // ── Promociones ──────────────────────────────────────────────
  const [ofertas, setOfertas] = useState<OfertaActiva[]>([])
  const [loadingOfertas, setLoadingOfertas] = useState(false)

  const fetchOfertas = useCallback(async (sucursal = 0) => {
    setLoadingOfertas(true)
    const qs = sucursal ? `?sucursal=${sucursal}` : ''
    try { setOfertas(await adminFetch<OfertaActiva[]>(`/promociones/ofertas${qs}`)) }
    finally { setLoadingOfertas(false) }
  }, [])

  const aplicarDescuentoProducto = useCallback(async (data: Record<string, unknown>) => {
    await adminFetch<void>('/promociones/producto', { method: 'POST', body: JSON.stringify(data) })
  }, [])

  const aplicarCampaniaCategoria = useCallback(async (data: Record<string, unknown>) => {
    await adminFetch<void>('/promociones/campania', { method: 'POST', body: JSON.stringify(data) })
  }, [])

  // ── Puntos config ────────────────────────────────────────────
  const [puntosConfig, setPuntosConfig]    = useState<PuntosConfig>({ razon_acumulacion: 100 })
  const [loadingPuntos, setLoadingPuntos]  = useState(false)

  const fetchPuntosConfig = useCallback(async () => {
    setLoadingPuntos(true)
    try { setPuntosConfig(await adminFetch<PuntosConfig>('/puntos/config')) }
    finally { setLoadingPuntos(false) }
  }, [])

  const savePuntosConfig = useCallback(async (config: PuntosConfig) => {
    await adminFetch<void>('/puntos/config', { method: 'PUT', body: JSON.stringify(config) })
    await fetchPuntosConfig()
  }, [fetchPuntosConfig])

  const ajustarPuntos = useCallback(
    (rut: string, puntos: number, motivo: string) =>
      adminFetch<AjusteResult>('/puntos/ajuste', {
        method: 'POST',
        body: JSON.stringify({ rut, puntos, motivo }),
      }),
    [],
  )

  return {
    categorias, loadingCat, fetchCategorias, saveCategoria, deleteCategoria,
    inventario, loadingInv, fetchInventario, syncProducto, createProducto,
    preventas,  loadingPrev, fetchPreventas, createPreventa, deletePreventa, updatePreventa,
    ofertas, loadingOfertas, fetchOfertas, aplicarDescuentoProducto, aplicarCampaniaCategoria,
    puntosConfig, loadingPuntos, fetchPuntosConfig, savePuntosConfig, ajustarPuntos,
  }
}
