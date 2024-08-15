import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import ProductCard from '../components/ProductCard'

const PAGE_SIZE = 24

export default function Products() {
  const [params, setParams] = useSearchParams()
  const [data, setData] = useState(null)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const search = params.get('search') || ''
  const category = params.get('category') || ''
  const brand = params.get('brand') || ''
  const ordering = params.get('ordering') || '-rating'
  const priceMax = params.get('price_max') || ''
  const page = params.get('page') || '1'

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const q = new URLSearchParams({ page, page_size: PAGE_SIZE })
        if (search) q.set('search', search)
        if (category) q.set('category', category)
        if (brand) q.set('brand', brand)
        if (ordering) q.set('ordering', ordering)
        if (priceMax) q.set('price_max', priceMax)
        const [res, cats, brs] = await Promise.allSettled([
          api(`/catalog/products/?${q}`, { auth: false }),
          api('/catalog/categories/', { auth: false }),
          api('/catalog/brands/', { auth: false }),
        ])
        if (res.status === 'fulfilled') setData(res.value)
        else throw res.reason
        if (cats.status === 'fulfilled') setCategories(cats.value)
        if (brs.status === 'fulfilled') setBrands(brs.value)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [page, search, category, brand, ordering, priceMax])

  const set = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next)
  }

  return (
    <div>
      <div className="page-head">
        <h1>{search || category ? `${search || category} products` : 'All products'}</h1>
        {data && <span className="count-pill">{data.total} products</span>}
      </div>
      <div className="toolbar">
        <input
          type="search"
          placeholder="Search products, brands…"
          defaultValue={search}
          key={search || 'empty'}
          onChange={(e) => set('search', e.target.value)}
        />
        <select value={category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={brand} onChange={(e) => set('brand', e.target.value)}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.slug}>{b.name}</option>)}
        </select>
        <input type="number" placeholder="Max price" defaultValue={priceMax} key={priceMax || 'p'}
          onChange={(e) => set('price_max', e.target.value)} />
        <select value={ordering} onChange={(e) => set('ordering', e.target.value)}>
          <option value="-rating">Top rated</option>
          <option value="bestdeals">Best deals</option>
          <option value="price">Price: low → high</option>
          <option value="-price">Price: high → low</option>
          <option value="-sold_count">Best sellers</option>
        </select>
      </div>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 12 }).map((_, i) => (
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
      ) : error ? (
        <div className="alert error">Could not load products: {error}. Is the API running on :8000?</div>
      ) : data ? (
        <>
          <div className="grid">
            {data.results.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
          <div className="pagination">
            <button disabled={!data.page || data.page <= 1} onClick={() => set('page', String(data.page - 1))}>‹ Prev</button>
            <span className="muted small">Page {data.page}{data.pages ? ` of ${data.pages}` : ''}</span>
            <button disabled={!data.pages || data.page >= data.pages} onClick={() => set('page', String(data.page + 1))}>Next ›</button>
          </div>
        </>
      ) : null}
    </div>
  )
}