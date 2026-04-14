import { useState, useCallback } from 'react'
import Login from '../components/Login'
import TabReportes   from '../admin/TabReportes'
import TabAlertas    from '../admin/TabAlertas'
import TabPreventas  from '../admin/TabPreventas'
import TabPromociones from '../admin/TabPromociones'
import TabInventario from '../admin/TabInventario'
import TabCategorias from '../admin/TabCategorias'
import { useAdminStore } from '../hooks/useAdminStore'
import { setToken } from '../api'
import '../admin/admin.css'

type AdminTab = 'reportes' | 'alertas' | 'inventario' | 'categorias' | 'preventas' | 'promociones'

interface AuthUser { username: string; nombre: string; apellido: string; tipo: number }

const SESSION_KEY = 'roca_dash_token'
const USER_KEY    = 'roca_dash_user'

const NAV: { id: AdminTab; label: string; icon: string }[] = [
  { id: 'reportes',    label: 'Reportes',          icon: '📊' },
  { id: 'alertas',     label: 'Alertas',            icon: '🔔' },
  { id: 'inventario',  label: 'Inventario Maestro', icon: '📂' },
  { id: 'categorias',  label: 'Categorías',         icon: '🗂️' },
  { id: 'preventas',   label: 'Preventas',          icon: '🚀' },
  { id: 'promociones', label: 'Promociones',        icon: '💎' },
]

export default function AdminLayout() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const token = sessionStorage.getItem(SESSION_KEY)
      const saved = sessionStorage.getItem(USER_KEY)
      if (token && saved) {
        setToken(token)
        return JSON.parse(saved) as AuthUser
      }
    } catch { /* ignore */ }
    return null
  })

  const handleLogin = useCallback((token: string, u: AuthUser) => {
    sessionStorage.setItem(SESSION_KEY, token)
    sessionStorage.setItem(USER_KEY, JSON.stringify(u))
    setToken(token)
    setUser(u)
  }, [])

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
  }, [])

  if (!user) return <Login onLogin={handleLogin} />

  if (user.tipo !== 2) {
    return (
      <div className="adm-error-full">
        <div className="adm-error-box">
          <h2>Acceso denegado</h2>
          <p>Esta sección requiere permisos de administrador.</p>
          <button className="adm-btn adm-btn-ghost" onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  return <AdminShell user={user} onLogout={handleLogout} />
}

function AdminShell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [tab,       setTab]       = useState<AdminTab>('reportes')
  const [collapsed, setCollapsed] = useState(false)

  const store = useAdminStore()
  const current = NAV.find(n => n.id === tab)!

  return (
    <div className="adm-shell">
      {/* ── Sidebar ── */}
      <aside className={`adm-sidebar${collapsed ? ' adm-sidebar--collapsed' : ''}`}>
        <div className="adm-sidebar-header">
          {!collapsed && (
            <div className="adm-sidebar-brand">
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <path d="M14 2L26 22H2L14 2Z" fill="#6366f1" opacity="0.85"/>
                <path d="M14 8L22 22H6L14 8Z" fill="#22d3ee" opacity="0.7"/>
              </svg>
              <span>Admin</span>
            </div>
          )}
          <button
            className="adm-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="adm-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`adm-nav-item${tab === item.id ? ' adm-nav-item--active' : ''}`}
              onClick={() => setTab(item.id)}
              title={collapsed ? item.label : undefined}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              {!collapsed && <span className="adm-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {!collapsed && (
          <div className="adm-sidebar-footer">
            <span className="adm-sidebar-user" title={`${user.nombre} ${user.apellido}`}>
              {user.nombre}
            </span>
            <button className="adm-btn adm-btn-sm adm-btn-ghost" onClick={onLogout}>Salir</button>
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <div className="adm-main">
        <header className="adm-topbar">
          <h1 className="adm-topbar-title">
            <span>{current.icon}</span>
            <span>{current.label}</span>
          </h1>
        </header>

        <div className="adm-content">
          {tab === 'reportes'    && <TabReportes   onLogout={onLogout} />}
          {tab === 'alertas'     && <TabAlertas    onLogout={onLogout} />}
          {tab === 'inventario'  && (
            <TabInventario
              inventario={store.inventario}
              loading={store.loadingInv}
              categorias={store.categorias}
              onFetch={store.fetchInventario}
              onFetchCat={store.fetchCategorias}
              onSync={store.syncProducto}
              onCreate={store.createProducto}
            />
          )}
          {tab === 'categorias'  && (
            <TabCategorias
              categorias={store.categorias}
              loading={store.loadingCat}
              onFetch={store.fetchCategorias}
              onSave={store.saveCategoria}
              onDelete={store.deleteCategoria}
            />
          )}
          {tab === 'preventas'   && (
            <TabPreventas
              preventas={store.preventas}
              loading={store.loadingPrev}
              categorias={store.categorias}
              onFetch={store.fetchPreventas}
              onFetchCat={store.fetchCategorias}
              onCreate={store.createPreventa}
              onDelete={store.deletePreventa}
              onUpdate={store.updatePreventa}
            />
          )}
          {tab === 'promociones' && (
            <TabPromociones
              categorias={store.categorias}
              ofertas={store.ofertas}
              loadingOfertas={store.loadingOfertas}
              onFetchCategorias={store.fetchCategorias}
              onFetchOfertas={store.fetchOfertas}
              onDescuentoProducto={store.aplicarDescuentoProducto}
              onCampaniaCategoria={store.aplicarCampaniaCategoria}
            />
          )}
        </div>
      </div>
    </div>
  )
}
