import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import ProductCard from '../components/ProductCard'

const IMAGES = ['🛍️', '👟', '⌚', '👕', '🧥', '👜', '👖', '👗']

export default function ProductDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addItem } = useCart()
  const [p, setP] = useState(null)
  const [reviews, setReviews] = useState([])
  const [related, setRelated] = useState([])
  const [fbt, setFbt] = useState([])
  const [qty, setQty] = useState(1)
  const [msg, setMsg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [detail, revs, rel, recommended] = await Promise.allSettled([
          api(`/catalog/products/${id}/`, { auth: false }),
          api(`/catalog/products/${id}/reviews/`, { auth: false }),
          api(`/recommendations/related/${id}/`, { auth: false }),
          api(`/recommendations/frequently-bought/${id}/`, { auth: false }),
        ])
        if (detail.status === 'fulfilled') setP(detail.value)
        if (revs.status === 'fulfilled') setReviews(Array.isArray(revs.value) ? revs.value : (revs.value?.results || []))
        if (rel.status === 'fulfilled') setRelated(Array.isArray(rel.value) ? rel.value : (rel.value?.results || []))
        if (recommended.status === 'fulfilled') setFbt(Array.isArray(recommended.value) ? recommended.value : (recommended.value?.results || []))
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  if (loading) return <div className="spinner" />

  const onAdd = async () => {
    try {
      await addItem(p.id, qty)
      setMsg({ type: 'success', text: `Added ${qty} × ${p.title} to cart` })
    } catch (e) {
      setMsg({ type: 'error', text: user ? e.message : 'Please login to add items to cart' })
    }
    setTimeout(() => setMsg(null), 2500)
  }

  const emoji = IMAGES[p.id % IMAGES.length]

  return (
    <div>
      {msg && <div className={`alert ${msg.type}`}>{msg.text}</div>}
      <div className="crumb">
        <Link to="/products" className="small muted">← Back to shop</Link>
      </div>
      <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="img-box" style={{ flex: '1 1 320px', maxWidth: 460, minHeight: 300 }}>
          {p.image && !imgError
            ? <img src={p.image} alt={p.title} onError={() => setImgError(true)} />
            : <span className="gal-emoji">{emoji}</span>}
        </div>
        <div style={{ flex: '2 1 380px' }}>
          <div className="muted small" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>{p.brand} · {p.category}</div>
          <h2 style={{ margin: '6px 0 8px', fontSize: 28, letterSpacing: '-0.4px' }}>{p.title}</h2>
          {p.tags?.length > 0 && (
            <div className="tag-list">
              {p.tags.map((t) => <span key={t.id} className="badge-st pending">{t.name}</span>)}
            </div>
          )}
          <div className="row" style={{ alignItems: 'baseline', gap: 12, margin: '14px 0' }}>
            <span className="price" style={{ fontSize: 30 }}>₹{Number(p.price).toLocaleString('en-IN')}</span>
            {Number(p.mrp) > Number(p.price) && <span className="old-price">₹{Number(p.mrp).toLocaleString('en-IN')}</span>}
            {p.discount_percent > 0 && <span className="badge-st completed">{p.discount_percent}% off</span>}
          </div>
          <div className="muted small" style={{ marginBottom: 12 }}>
            ★ <span className="rating" style={{ color: 'var(--amber)' }}>{Number(p.rating || 0).toFixed(1)}</span>
            {' '}({p.reviews_count || 0} reviews) · {p.in_stock ? <span style={{ color: 'var(--green)' }}>{p.stock} in stock</span> : <span style={{ color: 'var(--red)' }}>Out of stock</span>}
          </div>
          <p style={{ color: 'var(--muted)', maxWidth: 560, lineHeight: 1.6 }}>{p.description || 'No description available.'}</p>
          <div className="row" style={{ marginTop: 18, alignItems: 'center' }}>
            <div className="qty-box">
              <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
              <input type="number" min="1" max={p.stock || 10} value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
              <button onClick={() => setQty(Math.min(p.stock || 99, qty + 1))}>+</button>
            </div>
            <button className="primary" style={{ padding: '11px 26px' }} onClick={onAdd}>Add to cart</button>
          </div>
          <p className="small muted" style={{ marginTop: 10 }}>🚚 Free shipping over ₹500 · Returns within 7 days</p>
        </div>
      </div>

      {(related.length > 0 || fbt.length > 0) && (
        <>
          <div className="section-title">You might also like</div>
          <div className="grid related">
            {related.map((rp) => <ProductCard key={`r${rp.id}`} p={rp} compact />)}
            {fbt.filter((fp) => !related.some((r) => r.id === fp.id)).map((fp) => <ProductCard key={`f${fp.id}`} p={fp} compact />)}
          </div>
        </>
      )}

      <div className="section-title">Reviews ({reviews.length})</div>
      {reviews.map((r) => (
        <div key={r.id} className="panel" style={{ padding: '12px 16px' }}>
          <div><span className="rating" style={{ color: 'var(--amber)', fontWeight: 700 }}>★ {r.rating}</span> <b>{r.user}</b> <span className="muted small">· {new Date(r.created_at).toLocaleDateString()}</span></div>
          <div className="muted" style={{ marginTop: 4 }}>{r.comment}</div>
        </div>
      ))}
      {reviews.length === 0 && <div className="empty" style={{ padding: '30px 20px' }}><span className="empty-emoji">💬</span>No reviews yet.</div>}
      {user && (
        <MadeReview product={p.id} onDone={(revs) => setReviews([{ id: revs.id, user: user.username, rating: revs.rating, comment: revs.comment, created_at: new Date().toISOString() }, ...reviews])} />
      )}
    </div>
  )
}

function MadeReview({ product, onDone }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    const rev = await api(`/catalog/products/${product}/reviews/`, { method: 'POST', body: { rating, comment } })
    onDone(rev)
    setComment('')
  }

  return (
    <div className="panel">
      <form onSubmit={submit} className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <select value={rating} onChange={(e) => setRating(Number(e.target.value))} style={{ width: 110 }}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
        </select>
        <input placeholder="Write a review…" value={comment} onChange={(e) => setComment(e.target.value)} required style={{ flex: 1 }} />
        <button type="submit" className="primary">Post</button>
      </form>
    </div>
  )
}