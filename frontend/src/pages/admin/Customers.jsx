import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Pager, inr } from './AdminLayout.jsx'

const PAGE = 20

export default function Customers() {
  const [list, setList] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    const q = new URLSearchParams()
    q.set('page', page)
    q.set('page_size', PAGE)
    if (search) q.set('search', search)
    api(`/inventory/admin/customers/?${q}`)
      .then((d) => { setList(d.results || []); setCount(d.count || 0) })
      .catch((e) => setErr(e.message || 'load failed'))
  }, [page, search])

  const pages = Math.max(1, Math.ceil(count / PAGE))

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Customers</h2>
          <span className="sub">{count} registered</span>
        </div>
      </div>
      {err && <div className="alert error">{err}</div>}

      <div className="toolbar">
        <input type="search" placeholder="Search name / email / username…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Customer</th><th>Email</th><th>Joined</th><th>Orders</th><th>Total spent</th><th>Last order</th><th>Status</th></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="row-click" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                <td>
                  <span className="tap">
                    <span className="avatar">{(c.first_name?.[0] || c.username[0] || '?').toUpperCase()}</span>
                    <b>{c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.username}</b>
                  </span>
                </td>
                <td className="muted small">{c.email || '—'}</td>
                <td className="muted small">{new Date(c.date_joined).toLocaleDateString('en-IN')}</td>
                <td>{c.order_count}</td>
                <td>{inr(c.total_spent)}</td>
                <td className="muted small">{c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  {c.is_active
                    ? <span className="badge badge-green">active</span>
                    : <span className="badge badge-red">disabled</span>}
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7} className="empty-note">No customers match.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pager page={page} pages={pages} count={count} onPage={setPage} />

      {openId && (() => {
        const c = list.find((x) => x.id === openId)
        if (!c) return null
        return (
          <div className="drawer-scrim" onClick={() => setOpenId(null)}>
            <aside className="drawer" onClick={(e) => e.stopPropagation()}>
              <div className="tap" style={{ marginBottom: 16 }}>
                <span className="avatar" style={{ width: 52, height: 52, fontSize: 20 }}>
                  {(c.first_name?.[0] || c.username[0] || '?').toUpperCase()}
                </span>
                <div>
                  <h3 style={{ margin: 0 }}>{c.first_name ? `${c.first_name} ${c.last_name || ''}`.trim() : c.username}</h3>
                  <span className="muted small">@{c.username}</span>
                </div>
              </div>
              <div className="row-line"><span>Email</span><b>{c.email || '—'}</b></div>
              <div className="row-line"><span>Joined</span><b>{new Date(c.date_joined).toLocaleDateString('en-IN')}</b></div>
              <div className="row-line"><span>Orders placed</span><b>{c.order_count}</b></div>
              <div className="row-line"><span>Total spent</span><b>{inr(c.total_spent)}</b></div>
              <div className="row-line"><span>Last order</span><b>{c.last_order_at ? new Date(c.last_order_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}</b></div>
              <div className="row-line"><span>Account status</span><b>{c.is_active ? 'Active' : 'Disabled'}</b></div>
            </aside>
          </div>
        )
      })()}
    </>
  )
}