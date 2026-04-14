import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

interface PuntosData {
  nombre: string
  correo: string
  telefono: string | null
  puntos: number
}

// Formatea RUT mientras el usuario escribe: 12345678 → 12345678-K, puntos no
function formatRut(raw: string): string {
  const clean = raw.replace(/[^0-9kK]/g, '').toUpperCase()
  if (clean.length <= 1) return clean
  const body = clean.slice(0, -1)
  const dv   = clean.slice(-1)
  return `${body}-${dv}`
}

// Detecta si ya está instalada como PWA
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
}

export default function ConsultaPuntos() {
  const [rut,     setRut]     = useState('')
  const [data,    setData]    = useState<PuntosData | null>(null)
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'found' | 'notfound' | 'error'>('idle')
  const [errMsg,  setErrMsg]  = useState('')
  const [canInstall, setCanInstall] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deferredPrompt = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt.current) return
    deferredPrompt.current.prompt()
    await deferredPrompt.current.userChoice
    deferredPrompt.current = null
    setCanInstall(false)
  }

  function handleRutChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9kK.\-]/gi, '')
    setRut(formatRut(raw.replace(/[.\-]/g, '')))
    setStatus('idle')
    setData(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const limpio = rut.replace(/[.\-\s]/g, '')
    if (limpio.length < 7) {
      setErrMsg('Ingresa un RUT válido')
      setStatus('error')
      return
    }
    setStatus('loading')
    setErrMsg('')
    try {
      const res = await axios.get<{ ok: boolean; data: PuntosData }>(
        `/api/public/puntos/${encodeURIComponent(rut)}`,
      )
      setData(res.data.data)
      setStatus('found')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setStatus('notfound')
      } else {
        setErrMsg('Error al consultar. Intenta nuevamente.')
        setStatus('error')
      }
    }
  }

  function handleReset() {
    setRut('')
    setData(null)
    setStatus('idle')
    setErrMsg('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const standalone = isStandalone()

  return (
    <div className={`rp-page${standalone ? ' rp-page--standalone' : ''}`}>
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-inner">
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <path d="M14 2L26 22H2L14 2Z" fill="#6366f1" opacity="0.85" />
            <path d="M14 8L22 22H6L14 8Z" fill="#22d3ee" opacity="0.7" />
          </svg>
          <span className="rp-brand">Rocadragón</span>
        </div>
        {canInstall && !standalone && (
          <button className="rp-install-btn" onClick={handleInstall}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v13M7 11l5 5 5-5"/>
              <path d="M3 18v1a2 2 0 002 2h14a2 2 0 002-2v-1"/>
            </svg>
            Instalar app
          </button>
        )}
      </header>

      <main className="rp-main">
        <div className="rp-card">
          <h1 className="rp-title">Consulta tus Puntos</h1>
          <p className="rp-subtitle">Ingresa tu RUT para ver tu saldo de fidelización</p>

          {/* Formulario */}
          {status !== 'found' && (
            <form className="rp-form" onSubmit={handleSubmit} noValidate>
              <div className="rp-field">
                <label htmlFor="rut-input" className="rp-label">RUT</label>
                <input
                  id="rut-input"
                  ref={inputRef}
                  className={`rp-input${status === 'error' ? ' rp-input-error' : ''}`}
                  type="text"
                  inputMode="text"
                  placeholder="12345678-9"
                  value={rut}
                  onChange={handleRutChange}
                  maxLength={12}
                  autoComplete="off"
                  autoFocus
                />
                {status === 'error' && (
                  <span className="rp-field-error">{errMsg}</span>
                )}
              </div>
              <button
                className="rp-btn"
                type="submit"
                disabled={status === 'loading'}
              >
                {status === 'loading'
                  ? <><span className="spinner rp-spinner" />Consultando…</>
                  : 'Consultar saldo'}
              </button>
            </form>
          )}

          {/* RUT no encontrado */}
          {status === 'notfound' && (
            <div className="rp-notfound">
              <div className="rp-notfound-icon">😕</div>
              <p className="rp-notfound-title">RUT no encontrado</p>
              <p className="rp-notfound-msg">
                El RUT <strong>{rut}</strong> no está registrado en nuestro programa de puntos.
              </p>
              <p className="rp-notfound-cta">
                ¡Regístrate en tienda y comienza a acumular puntos en cada compra!
              </p>
              <button className="rp-btn rp-btn-ghost" onClick={handleReset}>
                Consultar otro RUT
              </button>
            </div>
          )}

          {/* Resultado */}
          {status === 'found' && data && (
            <div className="rp-result">
              <p className="rp-result-nombre">{data.nombre}</p>
              <p className="rp-result-correo">{data.correo}</p>

              {/* Saldo destacado */}
              <div className="rp-puntos-box">
                <span className="rp-puntos-label">Saldo de puntos</span>
                <span className="rp-puntos-valor">
                  {data.puntos.toLocaleString('es-CL')}
                </span>
                <span className="rp-puntos-pts">pts</span>
              </div>

              {/* Equivalencia */}
              <div className="rp-equivalencia">
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>1 punto = $1 CLP de descuento en tu próxima compra</span>
              </div>

              {/* Valor en pesos */}
              <div className="rp-valor-clp">
                Tienes <strong>${data.puntos.toLocaleString('es-CL')}</strong> disponibles para canjear
              </div>

              <button className="rp-btn rp-btn-ghost rp-mt" onClick={handleReset}>
                Consultar otro RUT
              </button>
            </div>
          )}
        </div>

        <p className="rp-footer-note">
          ¿Problemas con tu cuenta? Visítanos en tienda o escríbenos.
        </p>
      </main>
    </div>
  )
}
