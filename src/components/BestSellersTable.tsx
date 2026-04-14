import { useState } from 'react'
import type { BestSeller } from '../types'

interface Props {
  data: BestSeller[]
}

const formatCLP = (v: number) => '$' + Math.round(v).toLocaleString('es-CL')

export default function BestSellersTable({ data }: Props) {
  const [showAll, setShowAll] = useState(false)

  if (!data.length) {
    return <p className="empty">Sin datos para el período seleccionado.</p>
  }

  const rows = showAll ? data : data.slice(0, 10)
  const maxUnidades = Math.max(...rows.map((r) => r.total_vendido), 1)

  return (
    <div>
      <div className="table-wrapper">
        <table className="bs-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th style={{ textAlign: 'right' }}>Unidades</th>
              <th style={{ textAlign: 'right' }}>Monto Total</th>
              <th style={{ textAlign: 'right' }}>Precio Prom.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pct = (row.total_vendido / maxUnidades) * 100
              const prom = row.total_vendido > 0
                ? Math.round(row.total_monto / row.total_vendido)
                : 0
              return (
                <tr key={`${row.nombre}-${i}`}>
                  <td className="rank">{i + 1}</td>
                  <td className="nombre">
                    <div className="nombre-wrapper">
                      <span>{row.nombre}</span>
                      <div className="bar-bg">
                        <div className="bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="num">{row.total_vendido.toLocaleString('es-CL')}</td>
                  <td className="num">{formatCLP(row.total_monto)}</td>
                  <td className="num muted">{formatCLP(prom)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {data.length > 10 && (
        <button className="bs-toggle-btn" onClick={() => setShowAll(v => !v)}>
          {showAll
            ? `▲ Mostrar solo top 10`
            : `▼ Ver todos (${data.length} productos)`}
        </button>
      )}
    </div>
  )
}
