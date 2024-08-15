import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    api('/orders/')
      .then((d) => setOrders(Array.isArray(d) ? d : d.results))
      .catch((e) => setError(e.status === 401 ? 'Please sign in to view orders.' : e.message))
  }, [user])

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <h2>Sign in to see your orders</h2>
        <Link to="/login"><button className="primary">Login</button></Link>
      </div>
    )
  }
  if (error) return <div className="alert error">{error}</div>
  if (!orders) return <div className="spinner" />

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <h2>Your orders</h2>
      {orders.length === 0 ? (
        <p className="muted">No orders yet — <Link to="/products">start shopping</Link>.</p>
      ) : (
        <table className="tbl">
          <thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><b>{o.order_number}</b></td>
                <td className="muted small">{new Date(o.placed_at || o.created_at).toLocaleDateString()}</td>
                <td><span className={`badge-st ${o.status}`}>{o.status_label || o.status}</span></td>
                <td>₹{Number(o.total).toLocaleString('en-IN')}</td>
                <td><Link to={`/orders/${o.id}`}><button className="ghost">Track →</button></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}