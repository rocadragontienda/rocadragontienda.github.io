import type { SucursalStat, BestSeller, VentasStats, AlertaProducto } from './types'

const BASE = '/api'

let _token: string | null = null

export function setToken(t: string | null) { _token = t }
export function getToken() { return _token }

class AuthError extends Error {
  readonly status = 401
  constructor() { super('Sesión expirada, vuelve a ingresar') }
}

async function get<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {}
  if (_token) headers['Authorization'] = `Bearer ${_token}`
  const res = await fetch(`${BASE}${path}`, { headers })
  if (res.status === 401) throw new AuthError()
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `Error HTTP ${res.status}`)
  }
  const json = await res.json() as { data: T }
  return json.data
}

export const fetchStats = (desde: string, hasta: string) =>
  get<VentasStats>(`/ventas/stats?desde=${desde}&hasta=${hasta}`)

export const fetchSucursalStats = (desde: string, hasta: string) =>
  get<SucursalStat[]>(`/ventas/sucursal?desde=${desde}&hasta=${hasta}`)

export const fetchBestSellers = (desde: string, hasta: string) =>
  get<BestSeller[]>(`/ventas/bestsellers?desde=${desde}&hasta=${hasta}`)

export const fetchAlertas = () =>
  get<AlertaProducto[]>('/inventario/alertas')
