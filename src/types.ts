export interface SucursalStat {
  sucursal: number
  nombre: string
  total: number
  ventas: number
}

export interface BestSeller {
  nombre: string
  total_vendido: number
  total_monto: number
}

export interface VentasStats {
  total_ventas: number
  total_monto: number
  ticket_promedio: number
}

// ── Admin types ─────────────────────────────────────────────
export interface Categoria {
  id: number
  nombre: string
  id_padre: number | null
  padre_nombre?: string
}

export interface ProductoMaestro {
  id: number
  nombre: string
  sku: string
  precio: number
  precio_preventa: number | null
  precio_costo: number | null
  stock_s1: number | null
  stock_s2: number | null
  stock_minimo: number
  categoria_id: number
  cat_nombre: string
  activo: number
  permite_puntos: number
  actualizado_en: string
}

export interface Preventa {
  id: number
  nombre: string
  sku: string
  precio: number
  precio_preventa: number | null
  precio_costo: number | null
  stock: number
  stock_minimo: number
  categoria_id: number
  cat_nombre: string
  sucursal: number
  activo: number
  permite_puntos: number
}

export interface PuntosConfig {
  razon_acumulacion: number
}

export interface AlertaProducto {
  nombre: string
  sku: string
  cat_nombre: string
  categoria_id: number
  padre_id: number
  padre_nombre: string
  stock_s1: number | null
  minimo_s1: number | null
  stock_s2: number | null
  minimo_s2: number | null
}
