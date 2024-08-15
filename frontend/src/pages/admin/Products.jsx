import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Num, Pager } from './AdminLayout.jsx'

const PAGE = 25

export default function Products() {
  const [list, setList] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stock, setStock] = useState('')
  const [catId, setCatId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [low, setLow] = useState([])
  const [modal, setModal] = useState(null)
  const [manage, setManage] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const load = () => {
    const q = new URLSearchParams()
    q.set('page', page)
    q.set('page_size', PAGE)
    if (search) q.set('search', search)
    if (stock) q.set('stock', stock)
    if (catId) q.set('category', catId)
    if (brandId) q.set('brand', brandId)
    api(`/inventory/products/?${q}`)
      .then((d) => { setList(d.results || []); setCount(d.count || 0) })
      .catch((e) => setErr(e.message || 'load failed'))
  }
  const loadMeta = () => {
    Promise.all([
      api('/catalog/categories/'),
      api('/catalog/brands/'),
      api('/inventory/low-stock/'),
    ]).then(([c, b, l]) => {
      setCats(Array.isArray(c) ? c : (c.results || []))
      setBrands(Array.isArray(b) ? b : (b.results || []))
      setLow(Array.isArray(l) ? l : (l.results || []))
    }).catch(() => {})
  }

  useEffect(load, [page, search, stock, catId, brandId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(loadMeta, [])

  const patch = async (id, body) => {
    setOk('')
    try { await api(`/inventory/products/${id}/`, { method: 'PATCH', body }); load() }
    catch (e) { setErr(e.message || 'update failed') }
  }
  const restock = async (id, qty) => {
    try {
      const r = await api('/inventory/restock/', { method: 'POST', body: { product_id: id, quantity: qty } })
      setOk(`Restocked +${qty} → stock ${r.stock}`); load(); loadMeta()
    } catch (e) { setErr(e.message || 'restock failed') }
  }
  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return
    try { await api(`/inventory/products/${p.id}/`, { method: 'DELETE' }); setOk('Product deleted'); load(); loadMeta() }
    catch (e) { setErr(e.message || 'delete failed') }
  }
  const save = async (form) => {
    setBusy(true); setErr('')
    try {
      if (form.id) {
        await api(`/inventory/products/${form.id}/`, { method: 'PATCH', body: form })
        setOk(`Saved "${form.title}"`)
      } else {
        await api('/inventory/products/', { method: 'POST', body: form })
        setOk(`Added "${form.title}"`)
      }
      setModal(null); load(); loadMeta()
    } catch (e) { setErr(e.message || 'save failed') }
    finally { setBusy(false) }
  }

  const pages = Math.max(1, Math.ceil(count / PAGE))

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Products</h2>
          <span className="sub">{count} in catalog</span>
        </div>
        <button className="primary" onClick={() => setModal({})}>+ Add product</button>
      </div>

      {err && <div className="alert error">{err}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="toolbar">
        <input type="search" placeholder="Search title / brand / category…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <select value={stock} onChange={(e) => { setStock(e.target.value); setPage(1) }}>
          <option value="">All stock</option>
          <option value="low">Low stock (≤10)</option>
          <option value="out">Out of stock</option>
        </select>
        <select value={catId} onChange={(e) => { setCatId(e.target.value); setPage(1) }}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.product_count ?? 0}</option>)}
        </select>
        <select value={brandId} onChange={(e) => { setBrandId(e.target.value); setPage(1) }}>
          <option value="">All brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button className="ghost" onClick={() => setManage((m) => (m === 'catalog' ? '' : 'catalog'))}>
          {manage === 'catalog' ? 'Hide' : 'Manage categories & brands'}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Product</th><th>Category</th><th>Price (₹)</th><th>MRP</th><th>Stock</th><th>Sold</th><th>Rating</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="tap">
                    {p.image ? <img className="pthumb" src={p.image} alt="" /> : <span className="pthumb" />}
                    <span>
                      <b>{p.title}</b>
                      {p.brand_name && <span className="muted small" style={{ display: 'block' }}>{p.brand_name}</span>}
                    </span>
                  </span>
                </td>
                <td className="muted small">{p.category_name || '—'}</td>
                <td><Num value={Number(p.price)} onCommit={(v) => patch(p.id, { price: v })} /></td>
                <td><Num value={p.mrp ? Number(p.mrp) : 0} small onCommit={(v) => patch(p.id, { mrp: v || null })} /></td>
                <td><Num value={p.stock} onCommit={(v) => patch(p.id, { stock: v })} /></td>
                <td>{p.sold_count}</td>
                <td>{Number(p.rating).toFixed(1)} <span className="muted small">({p.rating_count})</span></td>
                <td>
                  <div className="chips" style={{ gap: 4, marginBottom: 0 }}>
                    <input type="checkbox" checked={p.active} title="Active" aria-label="Active"
                      onChange={(e) => patch(p.id, { active: e.target.checked })} style={{ width: 'auto' }} />
                    <input type="checkbox" checked={p.featured} title="Featured" aria-label="Featured"
                      onChange={(e) => patch(p.id, { featured: e.target.checked })} style={{ width: 'auto' }} />
                    {!p.in_stock && <span className="badge badge-red">out</span>}
                  </div>
                </td>
                <td>
                  <div className="action-row">
                    <button className="ghost" onClick={() => setModal(p)}>Edit</button>
                    <button className="ghost" onClick={() => restock(p.id, 10)}>+10</button>
                    <button className="danger" onClick={() => remove(p)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={9} className="empty-note">No products match.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pager page={page} pages={pages} count={count} onPage={setPage} />

      <div className="card">
        <h3>Needs restock ({low.length})</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>Stock</th><th>Price</th><th></th></tr></thead>
            <tbody>
              {low.map((p) => (
                <tr key={p.id}>
                  <td>{p.title}</td>
                  <td><span className="badge badge-amber">{p.stock}</span></td>
                  <td>{Number(p.price).toLocaleString('en-IN')}</td>
                  <td>
                    <div className="action-row">
                      <button className="ghost" onClick={() => restock(p.id, 10)}>+10</button>
                      <button className="ghost" onClick={() => restock(p.id, 50)}>+50</button>
                    </div>
                  </td>
                </tr>
              ))}
              {low.length === 0 && <tr><td colSpan={4} className="empty-note">All stocked up.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {manage === 'catalog' && <CatalogManager cats={cats} brands={brands} onChanged={loadMeta} onErr={setErr} onOk={setOk} />}

      {modal && (
        <ProductForm cats={cats} brands={brands} initial={modal} busy={busy}
          onCancel={() => setModal(null)} onSave={save} />
      )}
    </>
  )
}

function CatalogManager({ cats, brands, onChanged, onErr, onOk }) {
  const [catName, setCatName] = useState('')
  const [brandName, setBrandName] = useState('')

  const add = async (kind) => {
    try {
      if (kind === 'cat') {
        if (!catName.trim()) return
        await api('/inventory/admin/categories/', { method: 'POST', body: { name: catName.trim(), description: '' } })
        setCatName(''); onOk('Category added')
      } else {
        if (!brandName.trim()) return
        await api('/inventory/admin/brands/', { method: 'POST', body: { name: brandName.trim() } })
        setBrandName(''); onOk('Brand added')
      }
      onChanged()
    } catch (e) { onErr(e.message || 'add failed') }
  }
  const del = async (kind, id, name) => {
    if (!window.confirm(`Delete ${kind} "${name}"?`)) return
    try {
      await api(`/inventory/admin/${kind}s/${id}/`, { method: 'DELETE' })
      onOk(`${kind === 'cat' ? 'Category' : 'Brand'} deleted`); onChanged()
    } catch (e) { onErr(e.message || 'delete failed') }
  }

  return (
    <div className="grid-2">
      <div className="card">
        <h3>Categories</h3>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <input placeholder="New category name" value={catName} onChange={(e) => setCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add('cat') }} />
          <button className="primary" onClick={() => add('cat')}>+ Add</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Products</th><th></th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.product_count ?? 0}</td>
                  <td><button className="danger" onClick={() => del('cat', c.id, c.name)}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h3>Brands</h3>
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <input placeholder="New brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') add('brand') }} />
          <button className="primary" onClick={() => add('brand')}>+ Add</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Products</th><th></th></tr></thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.product_count ?? 0}</td>
                  <td><button className="danger" onClick={() => del('brand', b.id, b.name)}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ProductForm({ cats, brands, initial, busy, onCancel, onSave }) {
  const [f, setF] = useState({
    id: initial.id || null,
    title: initial.title || '',
    description: initial.description || '',
    price: initial.price ?? '',
    mrp: initial.mrp ?? '',
    stock: initial.stock ?? '',
    image: initial.image || '',
    brand: initial.brand || (brands[0]?.id ?? ''),
    category: initial.category || (cats[0]?.id ?? ''),
    active: initial.active ?? true,
    featured: initial.featured ?? false,
  })
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const submit = () => {
    if (!f.title.trim()) return
    onSave({
      ...f,
      price: Number(f.price), mrp: f.mrp === '' || f.mrp === 0 ? null : Number(f.mrp),
      stock: Number(f.stock) || 0,
      brand: f.brand || null, category: f.category || null,
      active: !!f.active, featured: !!f.featured,
    })
  }
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{initial.id ? `Edit · #${initial.id}` : 'Add product'}</h3>
        {f.image && (
          <img src={f.image} alt="preview" style={{ height: 90, width: '100%', objectFit: 'cover', borderRadius: 10, marginBottom: 12 }} />
        )}
        <div className="form-row"><label>Title</label>
          <input value={f.title} onChange={(e) => set('title', e.target.value)} /></div>
        <div className="form-row"><label>Description</label>
          <textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div><label>Price (₹)</label>
            <input type="number" min="0" required value={f.price} onChange={(e) => set('price', e.target.value)} /></div>
          <div><label>MRP (₹)</label>
            <input type="number" min="0" value={f.mrp} onChange={(e) => set('mrp', e.target.value)} /></div>
          <div><label>Stock</label>
            <input type="number" min="0" value={f.stock} onChange={(e) => set('stock', e.target.value)} /></div>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label>Brand</label>
            <select value={f.brand} onChange={(e) => set('brand', Number(e.target.value) || null)}>
              <option value="">— None —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <div><label>Category</label>
            <select value={f.category} onChange={(e) => set('category', Number(e.target.value) || null)}>
              <option value="">— None —</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></div>
        </div>
        <div className="form-row"><label>Image URL</label>
          <input value={f.image} onChange={(e) => set('image', e.target.value)} /></div>
        <div className="form-row" style={{ display: 'flex', gap: 24 }}>
          <label style={{ color: 'var(--text)' }}><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} style={{ width: 'auto', marginRight: 6 }} /> Active</label>
          <label style={{ color: 'var(--text)' }}><input type="checkbox" checked={f.featured} onChange={(e) => set('featured', e.target.checked)} style={{ width: 'auto', marginRight: 6 }} /> Featured</label>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" disabled={busy || !f.title.trim()} onClick={submit}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}