import { useEffect, useState } from 'react'
import { api } from '../api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [low, setLow] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [s, l] = await Promise.all([api('/dashboard/stats/'), api('/inventory/low-stock/')])
        setStats(s)
        setLow(l)
      } catch (err) {
        setError(err.status === 403 ? 'Admin only — sign in as admin.' : err.message)
      }
    })()
  }, [])

  if (error) return <div className="alert error">{error}</div>
  if (!stats) return <div className="spinner" />

  const cards = [
    ['Products', stats.products],
    ['Categories', stats.categories],
    ['Orders', stats.orders],
    ['Customers', stats.customers],
    ['Revenue', `₹${Number(stats.revenue).toLocaleString('en-IN')}`],
    ['Low stock', stats.low_stock],
  ]

  return (
    <div>
      <h2>Store dashboard</h2>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {cards.map(([k, v]) => (
          <div key={k} className="panel" style={{ textAlign: 'center' }}>
            <div className="muted small">{k}</div>
            <b style={{ fontSize: 22 }}>{v}</b>
          </div>
        ))}
      </div>

      <div className="section-title">Low-stock alerts (paused restock)</div>
      <table className="tbl">
        <thead><tr><th>Product</th><th>Stock</th><th>Price</th></tr></thead>
        <tbody>
          {low.map((p) => (
            <tr key={p.id}>
              <td>{p.title}</td>
              <td><span className="badge-st pending">{p.stock}</span></td>
              <td>₹{Number(p.price).toLocaleString('en-IN')}</td>
            </tr>
          ))}
          {low.length === 0 && <tr><td colSpan="3" className="muted">All stocked up.</td></tr>}
        </tbody>
      </table>
    </div>
  )
}