import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, getToken } from '../api'
import OrderTimeline from '../components/OrderTimeline'

const WS_BASE = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`

export default function OrderDetail() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    api(`/orders/${id}/`).then(setOrder)
  }, [id])

  useEffect(() => {
    if (!order) return
    let ws
    const token = getToken()
    try {
      ws = new WebSocket(`${WS_BASE}/orders/${order.id}/?token=${token}`)
      ws.onopen = () => setLive(true)
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'ORDER_STATUS') {
          setLive(true)
          setOrder((o) => (o ? { ...o, status: msg.status, status_label: msg.status_label } : o))
        }
      }
      ws.onclose = () => setLive(false)
    } catch {
      setLive(false)
    }
    return () => ws && ws.close()
  }, [order?.id]) // eslint-disable-line

  if (!order) return <div className="spinner" />

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <Link to="/orders" className="small muted">← All orders</Link>
      <div className="panel" style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>{order.order_number}</h2>
          {live
            ? <span className="badge-st in_transit">● Live tracking</span>
            : <span className="badge-st pending">Reconnecting…</span>}
        </div>
        <OrderTimeline status={order.status} />
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div className="muted small">Total</div>
            <b>₹{Number(order.total).toLocaleString('en-IN')}</b>
            <div className="small muted">(subtotal ₹{Number(order.subtotal).toLocaleString('en-IN')}{order.discount > 0 ? ` · coupon −₹${Number(order.discount).toLocaleString('en-IN')}` : ''} · tax ₹{Number(order.tax).toLocaleString('en-IN')} · shipping ₹{Number(order.shipping).toLocaleString('en-IN')})</div>
          </div>
          {order.coupon_code && <div><div className="muted small">Coupon</div><b>{order.coupon_code}</b></div>}
          <div><div className="muted small">Payment</div><span className={`badge-st ${order.payment_status?.status === 'succeeded' ? 'succeeded' : 'pending'}`}>{order.payment_status?.status || 'pending'}</span></div>
        </div>
        {order.status === 'cancelled' && (
          <button className="danger" style={{ marginTop: 12 }} disabled>{order.status_label}</button>
        )}
      </div>

      <div className="section-title">Items</div>
      {order.items.map((it) => (
        <div key={it.id} className="panel" style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
          <div><b>{it.product_title}</b><div className="small muted">₹{Number(it.unit_price).toLocaleString('en-IN')} × {it.quantity}</div></div>
          <b>₹{Number(it.subtotal).toLocaleString('en-IN')}</b>
        </div>
      ))}

      {order.status_history?.length > 0 && (
        <>
          <div className="section-title">Status history</div>
          {order.status_history.map((h, i) => (
            <div key={i} className="muted small" style={{ marginBottom: 4 }}>
              {h.status} — {new Date(h.created_at).toLocaleString()}
            </div>
          ))}
        </>
      )}
    </div>
  )
}