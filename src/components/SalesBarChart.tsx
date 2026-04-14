import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import type { SucursalStat } from '../types'

interface Props {
  data: SucursalStat[]
}

const formatCLP = (v: number) =>
  '$' + v.toLocaleString('es-CL')

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null
  return (
    <div className="custom-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'Monto (CLP)'
            ? `${p.name}: ${formatCLP(p.value ?? 0)}`
            : `${p.name}: ${(p.value ?? 0).toLocaleString('es-CL')}`}
        </p>
      ))}
    </div>
  )
}

const yTickCLP = (v: number) => {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

export default function SalesBarChart({ data }: Props) {
  if (!data.length || data.every((d) => d.total === 0 && d.ventas === 0)) {
    return <p className="empty">Sin datos para el período seleccionado.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3f55" />
        <XAxis dataKey="nombre" tick={{ fill: '#94a3b8', fontSize: 13 }} />
        <YAxis
          yAxisId="monto"
          orientation="left"
          tickFormatter={yTickCLP}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          width={72}
        />
        <YAxis
          yAxisId="cant"
          orientation="right"
          allowDecimals={false}
          tick={{ fill: '#94a3b8', fontSize: 12 }}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 13, color: '#94a3b8' }} />
        <Bar
          yAxisId="monto"
          dataKey="total"
          name="Monto (CLP)"
          fill="#6366f1"
          radius={[5, 5, 0, 0]}
          maxBarSize={80}
        />
        <Bar
          yAxisId="cant"
          dataKey="ventas"
          name="N° Transacciones"
          fill="#22d3ee"
          radius={[5, 5, 0, 0]}
          maxBarSize={80}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
