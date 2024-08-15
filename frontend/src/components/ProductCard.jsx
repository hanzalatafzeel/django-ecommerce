import { useState } from 'react'
import { Link } from 'react-router-dom'

function emoji(title) {
  const c = String(title).toLowerCase()
  if (/(shoe|footwear|sneaker|boot)/.test(c)) return '👟'
  if (/(shirt|tee|top|cloth)/.test(c)) return '👕'
  if (/(watch)/.test(c)) return '⌚'
  if (/(jeans|pant|denim)/.test(c)) return '👖'
  if (/(dress|gown|kurta)/.test(c)) return '👗'
  if (/(bag|backpack|wallet)/.test(c)) return '👜'
  if (/(hat|cap)/.test(c)) return '🧢'
  if (/(jacket|coat|hoodie|sweater|sportswear|active)/.test(c)) return '🧥'
  if (/(jewel|necklace|ring|chain)/.test(c)) return '💍'
  if (/(saree|kurta)/.test(c)) return '🥻'
  return '📦'
}

export default function ProductCard({ p, compact = false }) {
  const [imgError, setImgError] = useState(false)
  const inStock = Number(p.stock) > 0
  const discount = Number(p.discount_percent)
  const showImage = p.image && !imgError

  return (
    <Link to={`/products/${p.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
      <div className="thumb">
        {showImage ? (
          <img src={p.image} alt={p.title} loading="lazy" onError={() => setImgError(true)} />
        ) : (
          <span className="thumb-emoji">{emoji(p.title)}</span>
        )}
        {discount > 0 && <span className="chip-disc">{discount}% off</span>}
        {Number(p.rating) > 0 && <span className="chip-rating">★ {Number(p.rating).toFixed(1)}</span>}
      </div>
      <div className="body">
        <div className="title">{p.title}</div>
        {!compact && <div className="brand-cat">{p.brand} · {p.category}</div>}
        <div className="price-row">
          <span className="price">₹{Number(p.price).toLocaleString('en-IN')}</span>
          {Number(p.mrp) > Number(p.price) && (
            <>
              <span className="mrp">₹{Number(p.mrp).toLocaleString('en-IN')}</span>
              <span className="off">{discount}% off</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="rating">★ {Number(p.rating || 0).toFixed(1)}</span>
          <span className={`stock-dot ${inStock ? 'in' : 'out'}`}>
            {inStock ? `● In stock (${p.stock})` : '○ Out of stock'}
          </span>
        </div>
      </div>
    </Link>
  )
}