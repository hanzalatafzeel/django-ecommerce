import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function Cart() {
  const { cart, refresh, updateItem, removeItem } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !cart) refresh()
  }, [user]) // eslint-disable-line

  if (!cart) return <div className="spinner" />

  if (cart.count === 0) {
    return (
      <div className="empty">
        <span className="empty-emoji">🛒</span>
        <h2 style={{ margin: '0 0 4px' }}>Your cart is empty</h2>
        <p className="muted">Looks like you haven't added anything yet.</p>
        <Link to="/products"><button className="primary">Start shopping</button></Link>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ letterSpacing: '-0.3px' }}>Your cart ({cart.count} items)</h2>
      <div className="panel" style={{ padding: 6 }}>
        {cart.items.map((i) => (
          <div key={i.id} className="row" style={{ margin: 0, padding: '12px 12px', alignItems: 'center', borderRadius: 10 }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '')}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Link to={`/products/${i.product}`} style={{ color: 'inherit' }}><b>{i.product_detail.title}</b></Link>
              <div className="muted small">{i.product_detail.brand} · ₹{Number(i.product_detail.price).toLocaleString('en-IN')} each</div>
            </div>
            <input type="number" min="1" value={i.quantity} style={{ width: 68 }}
              onChange={(e) => updateItem(i.id, Math.max(1, Number(e.target.value) || 1))} />
            <b style={{ minWidth: 90, textAlign: 'right' }}>₹{Number(i.subtotal).toLocaleString('en-IN')}</b>
            <button className="danger ghost" onClick={() => removeItem(i.id)}>✕</button>
          </div>
        ))}
      </div>
      <div className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div>
          <div className="muted small">Subtotal</div>
          <b style={{ fontSize: 24 }}>₹{Number(cart.subtotal).toLocaleString('en-IN')}</b>
        </div>
        <button className="primary" style={{ padding: '12px 26px' }} onClick={() => navigate(user ? '/checkout' : '/login')}>Checkout →</button>
      </div>
    </div>
  )
}