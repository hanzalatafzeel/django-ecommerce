import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import ProductCard from '../components/ProductCard'

const CAT_EMOJI = {
  clothing: '👕',
  footwear: '👟',
  accessories: '👜',
  watches: '⌚',
  jewelry: '💍',
  sportswear: '🧥',
  bags: '👜',
  default: '🛍️',
}
const catEmoji = (slug) => CAT_EMOJI[slug] || CAT_EMOJI.default

export default function Home() {
  const [trending, setTrending] = useState([])
  const [forYou, setForYou] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [tr, fy, cat, count] = await Promise.allSettled([
          api('/recommendations/trending/', { auth: false }),
          api('/recommendations/for-you/', { auth: false }),
          api('/catalog/categories/', { auth: false }),
          api('/catalog/products/?page_size=1', { auth: false }),
        ])
        if (tr.status === 'fulfilled') setTrending(Array.isArray(tr.value) ? tr.value : (tr.value?.results || []))
        if (fy.status === 'fulfilled') setForYou(Array.isArray(fy.value) ? fy.value : (fy.value?.results || []))
        if (cat.status === 'fulfilled') setCategories(Array.isArray(cat.value) ? cat.value : (cat.value?.results || []))
        if (count.status === 'fulfilled' && count.value?.total) setTotal(count.value.total)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return (
    <div>
      <div className="hero"><div className="skeleton" style={{ height: 200, borderRadius: 12 }} /></div>
      <div className="grid">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skel-card">
            <div className="skeleton sk-thumb" />
            <div className="sk-body">
              <div className="skeleton sk-line w70" />
              <div className="skeleton sk-line w40" />
              <div className="skeleton sk-line w40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <section className="hero">
        <span className="eyebrow">Live order tracking · Instant mock payments</span>
        <h1>Shop smarter.<br />Style that <span className="grad">moves.</span></h1>
        <p>VoltMart — 520+ products across fashion, footwear, watches and accessories, backed by lightning-fast Redis search and real-time order updates.</p>
        <div className="hero-cta">
          <Link to="/products" className="button primary" style={{ padding: '12px 24px' }}>Shop now →</Link>
          <Link to="/products" className="to-deals">Best deals ↓</Link>
        </div>
        <div className="hero-stats">
          <div><b>{total || '520'}+</b><span>Products</span></div>
          <div><b>{categories.length}</b><span>Categories</span></div>
          <div><b>4.5★</b><span>Avg rating</span></div>
          <div><b>Live</b><span>Order tracking</span></div>
        </div>
      </section>

      {categories.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">Browse categories</h2>
            <Link to="/products" className="section-link">View all →</Link>
          </div>
          <div className="cat-grid">
            {categories.map((c) => (
              <Link key={c.id} to={`/products?category=${c.slug}`} className="cat-tile">
                <span className="cat-emoji">{catEmoji(c.slug)}</span>
                <div className="cat-name">{c.name}</div>
                <div className="cat-count">{c.product_count ?? '0'} products</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {trending.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">🔥 Trending now</h2>
            <Link to="/products" className="section-link">View all →</Link>
          </div>
          <div className="grid">{trending.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </>
      )}

      {forYou.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">✨ Picked for you</h2>
            <Link to="/products" className="section-link">View all →</Link>
          </div>
          <div className="grid">{forYou.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </>
      )}

      {trending.length === 0 && forYou.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">🛒</span>
          Nothing seeded yet? Get the API running and seed the catalog.
        </div>
      )}
    </div>
  )
}