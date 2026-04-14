'use strict'
/**
 * Rocadragón — Dashboard API + Static Server
 * ───────────────────────────────────────────
 * Sirve la SPA de React y expone la API REST.
 * Variables de entorno (en .env):
 *   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DASHBOARD_PORT, JWT_SECRET
 */
require('dotenv').config()

const express = require('express')
const cors    = require('cors')
const mysql   = require('mysql2/promise')
const path    = require('path')
const crypto  = require('crypto')
const jwt     = require('jsonwebtoken')

const JWT_SECRET  = process.env.JWT_SECRET ?? 'rocadragon_dashboard_secret_2026'
const JWT_EXPIRES = '8h'

const PORT = parseInt(process.env.DASHBOARD_PORT ?? '3001', 10)

const DB_CONFIG = {
  host:               process.env.DB_HOST     ?? '127.0.0.1',
  port:               parseInt(process.env.DB_PORT ?? '3306', 10),
  user:               process.env.DB_USER     ?? 'rocadrag_app',
  password:           process.env.DB_PASSWORD ?? '',
  database:           process.env.DB_NAME     ?? 'rocadrag_inventario',
  charset:            'utf8mb4',
  waitForConnections: true,
  connectionLimit:    3,
}

// Nombres de las sucursales (editar según corresponda)
const SUCURSAL_NOMBRES = {
  1: 'Centro',
  2: 'Oriente',
}

// ── Pool MySQL ───────────────────────────────────────────────────────────────
let pool
function getPool() {
  if (!pool) pool = mysql.createPool(DB_CONFIG)
  return pool
}

// ── Cache en memoria (TTL 60 s) ──────────────────────────────────────────────
const _cache = new Map()
const CACHE_TTL = 60_000

function getCached(key) {
  const e = _cache.get(key)
  if (!e) return null
  const ttl = e.ttl ?? CACHE_TTL
  if (Date.now() - e.ts > ttl) { _cache.delete(key); return null }
  return e.data
}
function setCache(key, data) {
  _cache.set(key, { ts: Date.now(), data })
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidDate(s) { return DATE_RE.test(s) }

/**
 * Devuelve cuántos ms está Chile (America/Santiago) por detrás de UTC
 * en la fecha indicada (maneja DST automáticamente vía Intl).
 * Ejemplo: Chile UTC-4 → 14_400_000 ms
 */
function getChileOffsetMs(dateStr) {
  const ref    = new Date(`${dateStr}T12:00:00Z`)
  const chiStr = ref.toLocaleString('sv-SE', { timeZone: 'America/Santiago' })
  // chiStr es tipo "2026-04-12 08:00:00" cuando Chile es UTC-4
  const chiDate = new Date(chiStr.replace(' ', 'T') + 'Z')
  return ref.getTime() - chiDate.getTime()
}

/**
 * Convierte un día en horario Chile (YYYY-MM-DD) a los límites
 * equivalentes en UTC para usar en consultas MySQL.
 */
function chileDayToUTC(dateStr) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const offsetMs   = getChileOffsetMs(dateStr)
  const start = new Date(Date.UTC(y, mo - 1, d,  0,  0,  0) + offsetMs)
  const end   = new Date(Date.UTC(y, mo - 1, d, 23, 59, 59) + offsetMs)
  const fmt = (dt) => dt.toISOString().slice(0, 19).replace('T', ' ')
  return { start: fmt(start), end: fmt(end) }
}

function defaultDates() {
  // "hoy" en horario Chile desde el servidor UTC
  const now      = new Date()
  const chiStr   = now.toLocaleString('sv-SE', { timeZone: 'America/Santiago' })
  const chiToday = chiStr.slice(0, 10) // "YYYY-MM-DD"
  const chiDesde = new Date(chiStr.replace(' ', 'T'))
  chiDesde.setDate(chiDesde.getDate() - 29)
  const fmt = (d) => d.toISOString().slice(0, 10)
  return { desde: fmt(chiDesde), hasta: chiToday }
}

function parseDates(query) {
  const def   = defaultDates()
  const desde = isValidDate(query.desde) ? query.desde : def.desde
  const hasta = isValidDate(query.hasta) ? query.hasta : def.hasta
  // Convertir límites Chile → UTC para SQL
  const desdeSql = chileDayToUTC(desde).start
  const hastaSql = chileDayToUTC(hasta).end
  return { desde, hasta, desdeSql, hastaSql }
}

// ── Express app ──────────────────────────────────────────────────────────────
const app = express()
app.use(cors())
app.disable('x-powered-by')
app.use(express.json())

// ── Middleware de autenticación JWT ─────────────────────────────────────────
function requireAuth(req, res, next) {
  const auth = req.headers['authorization'] ?? ''
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ ok: false, error: 'No autenticado' })
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' })
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ ok: false, error: 'Usuario y contraseña requeridos' })
  }
  // Sanitizar: solo alfanumérico y guiones/puntos para prevenir inyección SQL
  if (!/^[\w.@-]{1,100}$/.test(username)) {
    return res.status(400).json({ ok: false, error: 'Usuario inválido' })
  }

  try {
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    const [rows] = await getPool().query(
      'SELECT username, nombre, apellido, tipo, sucursal FROM usuarios WHERE username = ? AND password_hash = ? AND activo = 1 LIMIT 1',
      [username, hash],
    )
    if (!rows.length) {
      return res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' })
    }
    const u = rows[0]
    const token = jwt.sign(
      { username: u.username, nombre: u.nombre, tipo: u.tipo, sucursal: u.sucursal },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES },
    )
    res.json({ ok: true, token, user: { username: u.username, nombre: u.nombre, apellido: u.apellido, tipo: u.tipo } })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await getPool().query('SELECT 1')
    res.json({ ok: true, db: 'connected', ts: new Date().toISOString() })
  } catch (e) {
    res.status(503).json({ ok: false, db: 'disconnected', error: e.message })
  }
})

// ── GET /api/public/puntos/:rut ─ sin autenticación ─────────────────────────
function maskEmail(email) {
  if (!email || !email.includes('@')) return '***'
  const [local, domain] = email.split('@')
  const visible = local.slice(0, Math.min(3, local.length))
  return `${visible}***@${domain}`
}

app.get('/api/public/puntos/:rut', async (req, res) => {
  // Normalizar: quitar puntos y guión para comparar
  const rutRaw = (req.params.rut ?? '').trim().toUpperCase()
  const rutNorm = rutRaw.replace(/[.\-\s]/g, '')

  if (!rutNorm || rutNorm.length < 7 || rutNorm.length > 10) {
    return res.status(400).json({ ok: false, error: 'RUT inválido' })
  }

  try {
    const [rows] = await getPool().query(
      `SELECT nombre, correo, telefono, puntos
       FROM clientes
       WHERE REPLACE(REPLACE(rut, '.', ''), '-', '') = ?
         AND activo = 1
       LIMIT 1`,
      [rutNorm],
    )

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: 'not_found' })
    }

    const r = rows[0]
    res.json({
      ok: true,
      data: {
        nombre:   r.nombre,
        correo:   maskEmail(r.correo),
        telefono: r.telefono ? r.telefono.slice(-4).padStart(r.telefono.length, '*') : null,
        puntos:   Number(r.puntos),
      },
    })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── GET /api/ventas/stats ────────────────────────────────────────────────────
app.get('/api/ventas/stats', requireAuth, async (req, res) => {
  const { desde, hasta, desdeSql, hastaSql } = parseDates(req.query)
  const key = `stats:${desde}:${hasta}`
  const cached = getCached(key)
  if (cached) return res.json({ ok: true, data: cached })

  try {
    const [rows] = await getPool().query(
      `SELECT
         COUNT(*)                             AS total_ventas,
         COALESCE(SUM(total), 0)             AS total_monto,
         COALESCE(ROUND(AVG(total)), 0)      AS ticket_promedio
       FROM ventas
       WHERE estado = 'completada'
         AND creado_en >= ?
         AND creado_en <= ?`,
      [desdeSql, hastaSql],
    )
    const data = rows[0] ?? { total_ventas: 0, total_monto: 0, ticket_promedio: 0 }
    setCache(key, data)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── GET /api/ventas/sucursal ─────────────────────────────────────────────────
app.get('/api/ventas/sucursal', requireAuth, async (req, res) => {
  const { desde, hasta, desdeSql, hastaSql } = parseDates(req.query)
  const key = `sucursal:${desde}:${hasta}`
  const cached = getCached(key)
  if (cached) return res.json({ ok: true, data: cached })

  try {
    const [rows] = await getPool().query(
      `SELECT
         sucursal,
         COUNT(*)              AS ventas,
         COALESCE(SUM(total), 0) AS total
       FROM ventas
       WHERE estado = 'completada'
         AND creado_en >= ?
         AND creado_en <= ?
       GROUP BY sucursal
       ORDER BY sucursal`,
      [desdeSql, hastaSql],
    )

    const byId = {}
    for (const r of rows) byId[r.sucursal] = r

    const knownIds = Object.keys(SUCURSAL_NOMBRES).map(Number)
    const ids      = [...new Set([...knownIds, ...rows.map((r) => r.sucursal)])].sort()

    const data = ids.map((id) => ({
      sucursal: id,
      nombre:   SUCURSAL_NOMBRES[id] ?? `Sucursal ${id}`,
      ventas:   Number(byId[id]?.ventas  ?? 0),
      total:    Number(byId[id]?.total   ?? 0),
    }))

    setCache(key, data)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── GET /api/ventas/bestsellers ──────────────────────────────────────────────
app.get('/api/ventas/bestsellers', requireAuth, async (req, res) => {
  const { desde, hasta, desdeSql, hastaSql } = parseDates(req.query)
  const key = `bestsellers:${desde}:${hasta}`
  const cached = getCached(key)
  if (cached) return res.json({ ok: true, data: cached })

  try {
    const [rows] = await getPool().query(
      `SELECT
         ji.nombre,
         SUM(ji.cantidad) AS total_vendido,
         SUM(ji.subtotal) AS total_monto
       FROM ventas v,
       JSON_TABLE(
         v.items_json,
         '$[*]' COLUMNS (
           nombre   VARCHAR(255) PATH '$.nombre',
           cantidad INT          PATH '$.cantidad',
           subtotal BIGINT       PATH '$.subtotal'
         )
       ) AS ji
       WHERE v.estado = 'completada'
         AND v.creado_en >= ?
         AND v.creado_en <= ?
       GROUP BY ji.nombre
       ORDER BY total_vendido DESC, total_monto DESC`,
      [desdeSql, hastaSql],
    )

    const data = rows.map((r) => ({
      nombre:        r.nombre,
      total_vendido: Number(r.total_vendido),
      total_monto:   Number(r.total_monto),
    }))

    setCache(key, data)
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// ── Archivos estáticos (SPA) ─────────────────────────────────────────────────
const PUBLIC = path.join(__dirname, 'public')

// Activos con hash (JS/CSS) → cache 1 año
app.use('/assets', express.static(path.join(PUBLIC, 'assets'), { maxAge: '1y', immutable: true }))

// index.html → nunca cachear (el browser siempre debe pedir la última versión)
app.use(express.static(PUBLIC, { maxAge: 0, etag: false }))

// ── GET /api/inventario/alertas ───────────────────────────────────────────────
app.get('/api/inventario/alertas', requireAuth, async (req, res) => {
  const cached = getCached('alertas')
  if (cached) return res.json({ ok: true, data: cached })

  try {
    const [rows] = await getPool().query(
      `SELECT
         p.nombre,
         MAX(CASE WHEN p.sucursal = 1 THEN p.sku END) AS sku,
         MAX(p.categoria_id)                          AS categoria_id,
         MAX(c.nombre)                                AS cat_nombre,
         MAX(IF(cp.id IS NULL, c.id,     cp.id))      AS padre_id,
         MAX(IF(cp.id IS NULL, c.nombre, cp.nombre))  AS padre_nombre,
         MAX(CASE WHEN p.sucursal = 1 THEN p.stock        END) AS stock_s1,
         MAX(CASE WHEN p.sucursal = 1 THEN p.stock_minimo END) AS minimo_s1,
         MAX(CASE WHEN p.sucursal = 2 THEN p.stock        END) AS stock_s2,
         MAX(CASE WHEN p.sucursal = 2 THEN p.stock_minimo END) AS minimo_s2
       FROM productos p
       LEFT JOIN categorias c  ON c.id  = p.categoria_id
       LEFT JOIN categorias cp ON cp.id = c.id_padre
       WHERE p.activo = 1
         AND p.nombre IN (
           SELECT nombre FROM productos
           WHERE activo = 1 AND stock <= stock_minimo
         )
       GROUP BY p.nombre
       ORDER BY
         LEAST(
           IFNULL(MAX(CASE WHEN p.sucursal = 1 THEN p.stock END), 9999),
           IFNULL(MAX(CASE WHEN p.sucursal = 2 THEN p.stock END), 9999)
         ) ASC,
         p.nombre ASC`,
    )

    const data = rows.map((r) => ({
      nombre:       r.nombre,
      sku:          r.sku          ?? '',
      cat_nombre:   r.cat_nombre   ?? '',
      categoria_id: r.categoria_id != null ? Number(r.categoria_id) : 0,
      padre_id:     r.padre_id     != null ? Number(r.padre_id)     : 0,
      padre_nombre: r.padre_nombre ?? '',
      stock_s1:  r.stock_s1  != null ? Number(r.stock_s1)  : null,
      minimo_s1: r.minimo_s1 != null ? Number(r.minimo_s1) : null,
      stock_s2:  r.stock_s2  != null ? Number(r.stock_s2)  : null,
      minimo_s2: r.minimo_s2 != null ? Number(r.minimo_s2) : null,
    }))

    // TTL más corto para alertas (30 s)
    _cache.set('alertas', { ts: Date.now(), data, ttl: 30_000 })
    res.json({ ok: true, data })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})
// Rutas administrativas /api/admin/*
require('./admin')(app, getPool)
// Catch-all: cualquier ruta que no sea /api/* se sirve como SPA
app.get(/^(?!\/api).*$/, (_req, res) => {
  res.setHeader('Cache-Control', 'no-store')
  res.sendFile(path.join(PUBLIC, 'index.html'))
})

// ── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Dashboard] http://0.0.0.0:${PORT}`)
  getPool()
    .query('SELECT 1')
    .then(() => console.log('[Dashboard] DB conectada ✅'))
    .catch((e) => console.error('[Dashboard] DB sin conexión:', e.message))
})
