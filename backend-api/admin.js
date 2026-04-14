'use strict'
/**
 * admin.js — Rutas /api/admin/*
 * Requiere usuario autenticado con tipo === 2
 */
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET ?? 'rocadragon_dashboard_secret_2026'

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

function requireAdmin(req, res, next) {
  if (req.user?.tipo !== 2) {
    return res.status(403).json({ ok: false, error: 'Acceso denegado: se requiere rol Administrador' })
  }
  next()
}

const auth = [requireAuth, requireAdmin]

module.exports = function registerAdminRoutes(app, getPool) {

  // Crear tabla config si no existe
  getPool().query(`
    CREATE TABLE IF NOT EXISTS puntos_config (
      clave      VARCHAR(64)  PRIMARY KEY,
      valor      VARCHAR(255) NOT NULL,
      actualizado_en DATETIME DEFAULT NOW() ON UPDATE NOW()
    )
  `).catch(() => {})

  // ── GET /api/admin/categorias ─────────────────────────────────────────────
  app.get('/api/admin/categorias', ...auth, async (req, res) => {
    try {
      const [rows] = await getPool().query(`
        SELECT c.id, c.nombre, c.id_padre, p.nombre AS padre_nombre
        FROM   categorias c
        LEFT JOIN categorias p ON p.id = c.id_padre
        ORDER  BY COALESCE(c.id_padre, c.id), c.nombre
      `)
      res.json({ ok: true, data: rows })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── POST /api/admin/categorias ────────────────────────────────────────────
  app.post('/api/admin/categorias', ...auth, async (req, res) => {
    const { nombre, id_padre } = req.body ?? {}
    if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'Nombre requerido' })
    try {
      const [r] = await getPool().query(
        'INSERT INTO categorias (nombre, id_padre) VALUES (?, ?)',
        [nombre.trim(), id_padre ?? null],
      )
      res.json({ ok: true, data: { id: r.insertId, nombre: nombre.trim(), id_padre: id_padre ?? null } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── PUT /api/admin/categorias/:id ─────────────────────────────────────────
  app.put('/api/admin/categorias/:id', ...auth, async (req, res) => {
    const id = parseInt(req.params.id)
    const { nombre, id_padre } = req.body ?? {}
    if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'Nombre requerido' })
    if (id_padre === id)  return res.status(400).json({ ok: false, error: 'Una categoría no puede ser su propio padre' })
    try {
      await getPool().query(
        'UPDATE categorias SET nombre = ?, id_padre = ? WHERE id = ?',
        [nombre.trim(), id_padre ?? null, id],
      )
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── DELETE /api/admin/categorias/:id ─────────────────────────────────────
  app.delete('/api/admin/categorias/:id', ...auth, async (req, res) => {
    const id = parseInt(req.params.id)
    try {
      const [[{ hijos }]]  = await getPool().query('SELECT COUNT(*) AS hijos FROM categorias WHERE id_padre = ?', [id])
      if (hijos > 0) return res.status(400).json({ ok: false, error: 'No se puede eliminar: tiene subcategorías' })
      const [[{ prods }]]  = await getPool().query('SELECT COUNT(*) AS prods FROM productos WHERE categoria_id = ? AND activo = 1', [id])
      if (prods > 0) return res.status(400).json({ ok: false, error: `No se puede eliminar: tiene ${prods} producto(s) asignados` })
      await getPool().query('DELETE FROM categorias WHERE id = ?', [id])
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── GET /api/admin/inventario ─────────────────────────────────────────────
  app.get('/api/admin/inventario', ...auth, async (req, res) => {
    const page   = Math.max(1, parseInt(req.query.page) || 1)
    const limit  = 50
    const offset = (page - 1) * limit
    const q      = req.query.q?.trim()   || ''
    const cat    = parseInt(req.query.cat) || 0

    const conds  = ['p.activo = 1']
    const params = []
    if (q)   { conds.push('p.nombre LIKE ?');       params.push(`%${q}%`) }
    if (cat) { conds.push('p.categoria_id = ?');    params.push(cat) }
    const where = conds.join(' AND ')

    try {
      const [[{ total }]] = await getPool().query(
        `SELECT COUNT(DISTINCT p.nombre) AS total FROM productos p WHERE ${where}`,
        params,
      )
      const [rows] = await getPool().query(
        `SELECT
           MIN(p.id)   AS id,
           p.nombre,
           MAX(CASE WHEN p.sucursal = 1 THEN p.sku   END) AS sku,
           MAX(CASE WHEN p.sucursal = 1 THEN p.precio_venta_clp END) AS precio,
           MAX(CASE WHEN p.sucursal = 1 THEN p.precio_oferta_clp END) AS precio_preventa,
           MAX(CASE WHEN p.sucursal = 1 THEN p.costo_clp END) AS precio_costo,
           MAX(CASE WHEN p.sucursal = 1 THEN p.stock  END) AS stock_s1,
           MAX(CASE WHEN p.sucursal = 2 THEN p.stock  END) AS stock_s2,
           MAX(p.stock_minimo)   AS stock_minimo,
           MAX(p.categoria_id)   AS categoria_id,
           MAX(c.nombre)         AS cat_nombre,
           MAX(p.activo)         AS activo,
           MAX(p.permite_puntos) AS permite_puntos,
           MAX(p.actualizado_en) AS actualizado_en
         FROM productos p
         LEFT JOIN categorias c ON c.id = p.categoria_id
         WHERE ${where}
         GROUP BY p.nombre
         ORDER BY p.nombre
         LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      )
      res.json({ ok: true, data: { rows, total, page, pages: Math.ceil(total / limit) } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── POST /api/admin/inventario ───────────────────────────────────────────
  // Crea un producto en ambas sucursales completando campos base requeridos
  app.post('/api/admin/inventario', ...auth, async (req, res) => {
    const {
      nombre,
      sku = '',
      precio,
      stock_s1 = 0,
      stock_s2 = 0,
      stock_minimo = 0,
      categoria_id,
      permite_puntos = 1,
      precio_preventa,
      precio_costo,
    } = req.body ?? {}

    if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'Nombre requerido' })
    if (precio === undefined || Number.isNaN(Number(precio))) {
      return res.status(400).json({ ok: false, error: 'Precio requerido' })
    }

    const conn = await getPool().getConnection()
    try {
      await conn.beginTransaction()

      const [[dup]] = await conn.query(
        'SELECT COUNT(*) AS total FROM productos WHERE nombre = ? AND activo = 1',
        [nombre.trim()],
      )
      if (dup.total > 0) {
        await conn.rollback()
        return res.status(400).json({ ok: false, error: 'Ya existe un producto activo con ese nombre' })
      }

      let categoriaNombre = 'General'
      if (categoria_id) {
        const [[catRow]] = await conn.query('SELECT nombre FROM categorias WHERE id = ? LIMIT 1', [categoria_id])
        categoriaNombre = catRow?.nombre ?? 'General'
      }

      const [[nextLocal]] = await conn.query('SELECT COALESCE(MAX(local_id), 0) + 1 AS local_id FROM productos')
      const localId = nextLocal.local_id

      await conn.query(
        `INSERT INTO productos
          (nombre, ean, sku, descripcion, precio_venta_clp, costo_clp, precio_oferta_clp, stock, stock_minimo,
           categoria, categoria_id, tipo, activo, permite_puntos, sucursal, local_id, actualizado_en)
         VALUES
          (?, '', ?, '', ?, ?, ?, ?, ?, ?, ?, 'producto', 1, ?, 1, ?, NOW()),
          (?, '', ?, '', ?, ?, ?, ?, ?, ?, ?, 'producto', 1, ?, 2, ?, NOW())`,
        [
          nombre.trim(), sku, precio, precio_costo ?? 0, precio_preventa ?? 0, stock_s1, stock_minimo, categoriaNombre, categoria_id ?? null, permite_puntos, localId,
          nombre.trim(), sku, precio, precio_costo ?? 0, precio_preventa ?? 0, stock_s2, stock_minimo, categoriaNombre, categoria_id ?? null, permite_puntos, localId,
        ],
      )

      await conn.commit()
      res.json({ ok: true })
    } catch (e) {
      await conn.rollback()
      res.status(500).json({ ok: false, error: e.message })
    } finally {
      conn.release()
    }
  })

  // ── PUT /api/admin/inventario/sync ────────────────────────────────────────
  // Sincroniza cambios a TODAS las sucursales por nombre (delta sync)
  app.put('/api/admin/inventario/sync', ...auth, async (req, res) => {
    const { nombre, stock_minimo, categoria_id, permite_puntos, precio, precio_preventa, precio_costo } = req.body ?? {}
    if (!nombre) return res.status(400).json({ ok: false, error: 'Nombre requerido' })

    const sets   = ['actualizado_en = NOW()']
    const params = []
    if (stock_minimo   !== undefined) { sets.push('stock_minimo = ?');   params.push(stock_minimo) }
    if (categoria_id   !== undefined) { sets.push('categoria_id = ?');   params.push(categoria_id) }
    if (permite_puntos !== undefined) { sets.push('permite_puntos = ?'); params.push(permite_puntos) }
    if (precio         !== undefined) { sets.push('precio_venta_clp = ?'); params.push(precio) }
    if (precio_preventa !== undefined) { sets.push('precio_oferta_clp = ?'); params.push(precio_preventa ?? 0) }
    if (precio_costo    !== undefined) {
      sets.push('costo_clp = ?')
      params.push(precio_costo ?? 0)
    }
    if (sets.length === 1) return res.status(400).json({ ok: false, error: 'Nada que actualizar' })

    params.push(nombre)
    try {
      const [r] = await getPool().query(
        `UPDATE productos SET ${sets.join(', ')} WHERE nombre = ? AND activo = 1`,
        params,
      )
      res.json({ ok: true, data: { affected: r.affectedRows } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── GET /api/admin/preventas ──────────────────────────────────────────────
  app.get('/api/admin/preventas', ...auth, async (req, res) => {
    try {
      const [rows] = await getPool().query(`
         SELECT p.id, p.nombre, p.sku, p.precio_venta_clp AS precio,
           p.precio_oferta_clp AS precio_preventa, p.costo_clp AS precio_costo,
               p.stock, p.stock_minimo,
               p.categoria_id, c.nombre AS cat_nombre, p.sucursal,
               p.activo, p.permite_puntos, p.actualizado_en
        FROM   productos p
        LEFT JOIN categorias c ON c.id = p.categoria_id
        WHERE  p.permite_puntos = 2 AND p.activo = 1
        ORDER  BY p.nombre, p.sucursal
      `)
      res.json({ ok: true, data: rows })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── POST /api/admin/preventas ─────────────────────────────────────────────
  // Crea en ambas sucursales con permite_puntos = 2
  app.post('/api/admin/preventas', ...auth, async (req, res) => {
    const {
      nombre, sku = '', precio, precio_preventa, precio_costo,
      stock_s1 = 0, stock_s2 = 0, stock_minimo = 0, categoria_id,
    } = req.body ?? {}
    if (!nombre?.trim() || precio === undefined) {
      return res.status(400).json({ ok: false, error: 'Nombre y precio normal son requeridos' })
    }
    const conn = await getPool().getConnection()
    try {
      await conn.beginTransaction()
      const [[nextLocal]] = await conn.query('SELECT COALESCE(MAX(local_id), 0) + 1 AS local_id FROM productos')
      const localId = nextLocal.local_id
      await conn.query(
          `INSERT INTO productos
            (nombre, sku, precio_venta_clp, precio_oferta_clp, costo_clp, stock, stock_minimo, categoria_id, sucursal, activo, permite_puntos, local_id, actualizado_en)
         VALUES
           (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 2, ?, NOW()),
           (?, ?, ?, ?, ?, ?, ?, ?, 2, 1, 2, ?, NOW())`,
        [
          nombre.trim(), sku, precio, precio_preventa ?? 0, precio_costo ?? 0, stock_s1, stock_minimo, categoria_id ?? null, localId,
          nombre.trim(), sku, precio, precio_preventa ?? 0, precio_costo ?? 0, stock_s2, stock_minimo, categoria_id ?? null, localId,
        ],
      )
      await conn.commit()
      res.json({ ok: true })
    } catch (e) {
      await conn.rollback()
      res.status(500).json({ ok: false, error: e.message })
    } finally { conn.release() }
  })

  // ── PUT /api/admin/preventas/:nombre ──────────────────────────────────────
  // Actualiza precio_preventa y precio_costo en todas las sucursales del producto
  app.put('/api/admin/preventas/:nombre', ...auth, async (req, res) => {
    const nombre = decodeURIComponent(req.params.nombre)
    const { precio, precio_preventa, precio_costo } = req.body ?? {}
    const sets = ['actualizado_en = NOW()']
    const params = []
    if (precio          !== undefined) { sets.push('precio_venta_clp = ?'); params.push(precio) }
    if (precio_preventa !== undefined) { sets.push('precio_oferta_clp = ?'); params.push(precio_preventa ?? 0) }
    if (precio_costo    !== undefined) { sets.push('costo_clp = ?');         params.push(precio_costo ?? 0) }
    if (sets.length === 1) return res.status(400).json({ ok: false, error: 'Nada que actualizar' })
    params.push(nombre)
    try {
      await getPool().query(
        `UPDATE productos SET ${sets.join(', ')} WHERE nombre = ? AND permite_puntos = 2 AND activo = 1`,
        params,
      )
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── DELETE /api/admin/preventas/:id ──────────────────────────────────────
  app.delete('/api/admin/preventas/:id', ...auth, async (req, res) => {
    const id = parseInt(req.params.id)
    try {
      // Desactiva solo si es preventa
      await getPool().query(
        'UPDATE productos SET activo = 0 WHERE id = ? AND permite_puntos = 2',
        [id],
      )
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── GET /api/admin/promociones/ofertas ───────────────────────────────────
  app.get('/api/admin/promociones/ofertas', ...auth, async (req, res) => {
    const sucursal = parseInt(req.query.sucursal) || 0
    const conds = ['p.activo = 1', 'p.en_oferta = 1', 'p.precio_oferta_clp > 0']
    const params = []
    if (sucursal) {
      conds.push('p.sucursal = ?')
      params.push(sucursal)
    }
    try {
      const [rows] = await getPool().query(
        `SELECT
           p.nombre,
           MAX(p.sku) AS sku,
           MAX(p.categoria) AS categoria,
           MAX(p.precio_venta_clp) AS precio_normal,
           MAX(p.precio_oferta_clp) AS precio_oferta,
           ROUND((1 - (MAX(p.precio_oferta_clp) / NULLIF(MAX(p.precio_venta_clp), 0))) * 100, 0) AS descuento_pct,
           MAX(p.fecha_inicio_oferta) AS inicio,
           MAX(p.fecha_fin_oferta) AS fin
         FROM productos p
         WHERE ${conds.join(' AND ')}
         GROUP BY p.nombre
         ORDER BY p.nombre`,
        params,
      )
      res.json({ ok: true, data: rows })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  // ── POST /api/admin/promociones/producto ─────────────────────────────────
  app.post('/api/admin/promociones/producto', ...auth, async (req, res) => {
    const { nombre, descuento, sucursal = 0, inicio = null, fin = null } = req.body ?? {}
    const pct = parseInt(descuento)
    if (!nombre?.trim()) return res.status(400).json({ ok: false, error: 'Nombre requerido' })
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) {
      return res.status(400).json({ ok: false, error: 'Descuento debe estar entre 1 y 95' })
    }

    const conds = ['nombre = ?', 'activo = 1']
    const params = [nombre.trim()]
    if (parseInt(sucursal) > 0) {
      conds.push('sucursal = ?')
      params.push(parseInt(sucursal))
    }

    try {
      const [r] = await getPool().query(
        `UPDATE productos
         SET en_oferta = 1,
             precio_oferta_clp = GREATEST(0, ROUND(precio_venta_clp * (100 - ?) / 100)),
             fecha_inicio_oferta = COALESCE(?, NOW()),
             fecha_fin_oferta = ?,
             actualizado_en = NOW()
         WHERE ${conds.join(' AND ')}`,
        [pct, inicio, fin, ...params],
      )
      res.json({ ok: true, data: { affected: r.affectedRows } })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  // ── POST /api/admin/promociones/campania ─────────────────────────────────
  app.post('/api/admin/promociones/campania', ...auth, async (req, res) => {
    const { sucursal, categoria_id = 0, descuento, inicio = null, fin = null } = req.body ?? {}
    const suc = parseInt(sucursal)
    const pct = parseInt(descuento)
    const catId = parseInt(categoria_id) || 0

    if (![1, 2].includes(suc)) {
      return res.status(400).json({ ok: false, error: 'Sucursal inválida (1 o 2)' })
    }
    if (!Number.isFinite(pct) || pct < 1 || pct > 95) {
      return res.status(400).json({ ok: false, error: 'Descuento debe estar entre 1 y 95' })
    }

    try {
      let categoriaIds = []
      let categoriaNombres = []

      if (catId > 0) {
        const queue = [catId]
        const visited = new Set()
        while (queue.length) {
          const current = queue.shift()
          if (visited.has(current)) continue
          visited.add(current)
          categoriaIds.push(current)
          const [children] = await getPool().query('SELECT id FROM categorias WHERE id_padre = ?', [current])
          for (const ch of children) queue.push(ch.id)
        }

        if (categoriaIds.length) {
          const [names] = await getPool().query(
            `SELECT nombre FROM categorias WHERE id IN (${categoriaIds.map(() => '?').join(',')})`,
            categoriaIds,
          )
          categoriaNombres = names.map(n => n.nombre)
        }
      }

      const conds = ['activo = 1', 'sucursal = ?']
      const params = [suc]
      if (categoriaIds.length) {
        const idPlaceholders = categoriaIds.map(() => '?').join(',')
        const namePlaceholders = categoriaNombres.map(() => '?').join(',')
        conds.push(`(categoria_id IN (${idPlaceholders})${categoriaNombres.length ? ` OR categoria IN (${namePlaceholders})` : ''})`)
        params.push(...categoriaIds)
        if (categoriaNombres.length) params.push(...categoriaNombres)
      }

      const [r] = await getPool().query(
        `UPDATE productos
         SET en_oferta = 1,
             precio_oferta_clp = GREATEST(0, ROUND(precio_venta_clp * (100 - ?) / 100)),
             fecha_inicio_oferta = COALESCE(?, NOW()),
             fecha_fin_oferta = ?,
             actualizado_en = NOW()
         WHERE ${conds.join(' AND ')}`,
        [pct, inicio, fin, ...params],
      )

      res.json({ ok: true, data: { affected: r.affectedRows } })
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message })
    }
  })

  // ── GET /api/admin/puntos/config ──────────────────────────────────────────
  app.get('/api/admin/puntos/config', ...auth, async (req, res) => {
    try {
      const [rows] = await getPool().query('SELECT clave, valor FROM puntos_config')
      const cfg = Object.fromEntries(rows.map(r => [r.clave, r.valor]))
      res.json({ ok: true, data: { razon_acumulacion: parseInt(cfg.razon_acumulacion ?? '100') } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── PUT /api/admin/puntos/config ──────────────────────────────────────────
  app.put('/api/admin/puntos/config', ...auth, async (req, res) => {
    const { razon_acumulacion } = req.body ?? {}
    if (!Number.isInteger(razon_acumulacion) || razon_acumulacion < 1) {
      return res.status(400).json({ ok: false, error: 'razon_acumulacion debe ser un entero positivo' })
    }
    try {
      await getPool().query(
        'INSERT INTO puntos_config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
        ['razon_acumulacion', String(razon_acumulacion)],
      )
      res.json({ ok: true })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })

  // ── POST /api/admin/puntos/ajuste ─────────────────────────────────────────
  app.post('/api/admin/puntos/ajuste', ...auth, async (req, res) => {
    const { rut, puntos, motivo } = req.body ?? {}
    if (!rut || puntos === undefined || !motivo?.trim()) {
      return res.status(400).json({ ok: false, error: 'RUT, puntos y motivo son requeridos' })
    }
    const delta = parseInt(puntos)
    if (isNaN(delta)) return res.status(400).json({ ok: false, error: 'puntos debe ser un número' })

    const rutNorm = String(rut).replace(/[\s.]/g, '').toUpperCase()

    try {
      const [rows] = await getPool().query(
        'SELECT id, puntos FROM clientes WHERE rut = ? LIMIT 1',
        [rutNorm],
      )
      if (!rows.length) return res.status(404).json({ ok: false, error: 'Cliente no encontrado' })

      const { id: clienteId, puntos: puntosActual } = rows[0]
      const puntosNuevo = Math.max(0, (puntosActual ?? 0) + delta)

      const conn = await getPool().getConnection()
      try {
        await conn.beginTransaction()
        await conn.query('UPDATE clientes SET puntos = ? WHERE id = ?', [puntosNuevo, clienteId])
        // Log en tabla opcional
        await conn.query(
          `INSERT IGNORE INTO puntos_ajustes
             (cliente_id, delta, motivo, admin_user, creado_en)
           VALUES (?, ?, ?, ?, NOW())`,
          [clienteId, delta, motivo.trim(), req.user.username],
        ).catch(() => {})
        await conn.commit()
      } catch (e) { await conn.rollback(); throw e }
      finally { conn.release() }

      res.json({ ok: true, data: { puntos_previos: puntosActual ?? 0, puntos_nuevos: puntosNuevo, delta } })
    } catch (e) { res.status(500).json({ ok: false, error: e.message }) }
  })
}
