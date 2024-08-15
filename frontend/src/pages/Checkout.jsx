import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'

export default function Checkout() {
  const { cart, refresh } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [addressId, setAddressId] = useState(null)
  const [coupon, setCoupon] = useState('')
  const [step, setStep] = useState('order')
  const [order, setOrder] = useState(null)
  const [payment, setPayment] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [card, setCard] = useState('')

  useEffect(() => {
    ;(async () => {
      if (!user) return
      const res = await api('/accounts/addresses/')
      setAddresses(Array.isArray(res) ? res : (res.results || []))
    })()
  }, [user])

  const placeOrder = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api('/orders/', { method: 'POST', body: { address_id: addressId, coupon_code: coupon || null } })
      setOrder(res)
      setStep('pay')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const pay = async () => {
    setBusy(true)
    setError(null)
    try {
      await api(`/payments/orders/${order.id}/initiate/`, { method: 'POST', body: { gateway: 'mock' } })
      const res = await api(`/payments/orders/${order.id}/confirm/`, {
        method: 'POST',
        body: { gateway: 'mock', card_number: card.trim() || '4242 4242 4242 4242' },
      })
      setPayment(res)
      setStep('done')
      refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!user) return <p><Link to="/login">Login</Link> to checkout.</p>

  if (step === 'done' && payment?.payment?.status === 'succeeded') {
    return (
      <div className="panel" style={{ maxWidth: 520, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 50 }}>🎉</div>
        <h2>Payment succeeded!</h2>
        <p className="muted">Order <b>{order.order_number}</b> confirmed. Track it live.</p>
        <Link to={`/orders/${order.id}`}><button className="primary">Track order</button></Link>
      </div>
    )
  }

  if (!cart || cart.count === 0) return <p>Cart is empty — <Link to="/products">shop</Link> first.</p>

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <h2 style={{ letterSpacing: '-0.3px' }}>Checkout</h2>
      {error && <div className="alert error">{error}</div>}

      <div className="steps">
        <span className={`step-chip ${addressId ? 'done' : 'now'}`}>1 · Address</span>
        <span className={`step-chip ${step !== 'order' ? 'done' : ''}`}>2 · Coupon</span>
        <span className={`step-chip ${step !== 'order' ? 'done' : ''}`}>3 · Order</span>
        <span className={`step-chip ${step === 'done' ? 'done' : step === 'pay' ? 'now' : ''}`}>4 · Payment</span>
      </div>

      <div className="panel">
        <h3>1 · Delivery address</h3>
        {addresses.length === 0 ? (
          <p className="muted small">No saved addresses. (Addresses can be added via the profile/API.)</p>
        ) : (
          addresses.map((a) => (
            <label key={a.id} className="panel" style={{ display: 'block', padding: 12 }}>
              <input type="radio" name="addr" checked={addressId === a.id} onChange={() => setAddressId(a.id)} style={{ width: 'auto', marginRight: 8 }} />
              <b>{a.label}</b> · {a.line1}, {a.city}, {a.state} {a.pincode}
            </label>
          ))
        )}
      </div>

      <div className="panel">
        <h3>2 · Coupon (optional)</h3>
        <input placeholder="Try WELCOME10, FLAT200, MEGA50" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
        <p className="muted small">Applied at order creation.</p>
      </div>

      <div className="panel">
        <h3>3 · Place order</h3>
        <button className="primary" onClick={placeOrder} disabled={busy || !addressId}>{busy ? 'Placing…' : 'Place order'}</button>
      </div>

      {step === 'pay' && order && (
        <div className="panel">
          <h3>4 · Pay ₹{Number(order.total).toLocaleString('en-IN')} <span className="muted small">(mock gateway)</span></h3>
          <div className="form-row">
            <label>Card number (demo: <code>4242 4242 4242 4242</code>)</label>
            <input value={card} onChange={(e) => setCard(e.target.value)} placeholder="4242 4242 4242 4242" />
          </div>
          <button className="primary" onClick={pay} disabled={busy}>{busy ? 'Processing…' : 'Pay now'}</button>
        </div>
      )}
    </div>
  )
}