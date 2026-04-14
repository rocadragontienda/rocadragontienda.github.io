interface Props {
  title: string
  value: string | number
  icon: string
  sub?: string
}

export default function StatsCard({ title, value, icon, sub }: Props) {
  return (
    <div className="stats-card">
      <span className="stats-icon">{icon}</span>
      <div className="stats-body">
        <p className="stats-title">{title}</p>
        <p className="stats-value">{value}</p>
        {sub && <p className="stats-sub">{sub}</p>}
      </div>
    </div>
  )
}
