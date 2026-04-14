import { useState, type FormEvent } from 'react'

interface Props {
  onLogin: (token: string, user: { username: string; nombre: string; apellido: string; tipo: number }) => void
}

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: username.trim(), password }),
      })
      const json = await res.json() as {
        ok: boolean
        token?: string
        user?:  { username: string; nombre: string; apellido: string; tipo: number }
        error?: string
      }

      if (!res.ok || !json.ok || !json.token || !json.user) {
        setError(json.error ?? 'Error al iniciar sesión')
        return
      }

      onLogin(json.token, json.user)
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-overlay">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-logo">
          <svg width="36" height="36" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L26 22H2L14 2Z" fill="#6366f1" opacity="0.85" />
            <path d="M14 8L22 22H6L14 8Z" fill="#22d3ee" opacity="0.7" />
          </svg>
          <h1>Rocadragón</h1>
        </div>
        <p className="login-subtitle">Dashboard Administrativo</p>

        {error && (
          <div className="login-error" role="alert">
            {error}
          </div>
        )}

        <div className="login-field">
          <label htmlFor="username">Usuario</label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tu usuario"
            required
            autoFocus
          />
        </div>

        <div className="login-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" className="login-btn" disabled={loading}>
          {loading ? <span className="spinner" aria-label="Cargando" /> : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  )
}
