import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const LINKS = [
  { to: '/admin', label: 'Overview', end: true, icon: '📊' },
  { to: '/admin/products', label: 'Products', end: false, icon: '📦' },
  { to: '/admin/orders', label: 'Orders', end: false, icon: '🧾' },
  { to: '/admin/customers', label: 'Customers', end: false, icon: '👥' },
  { to: '/admin/coupons', label: 'Coupons', end: false, icon: '🎟️' },
]

export function AdminLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  const current = LINKS.find((l) => (l.end ? location.pathname === l.to : location.pathname.startsWith(l.to)))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  if (!user) {
    return (
      <div className="panel" style={{ maxWidth: 460, margin: '60px auto', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Admin area</h2>
        <p className="muted">Sign in with a staff account to manage the store.</p>
        <Link className="primary btn" to="/login" style={{ color: '#fff' }}>Go to login</Link>
      </div>
    )
  }
  if (!user.is_staff) {
    return (
      <div className="panel" style={{ maxWidth: 460, margin: '60px auto', padding: 24 }}>
        <h2 style={{ marginTop: 0 }}>Admin only</h2>
        <p className="muted">This area is restricted to staff accounts. You are signed in as <b>{user.username}</b>.</p>
        <Link className="btn" to="/">Back to store</Link>
      </div>
    )
  }

  return (
    <div className={`admin-shell${open ? ' nav-open' : ''}`}>
      {open && <div className="admin-scrim" onClick={() => setOpen(false)} />}
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link to="/admin" className="admin-logo">VOLT<em>MART</em></Link>
          <span className="admin-sub">Commerce admin</span>
        </div>
        <div className="admin-nav-group">Manage</div>
        <nav className="admin-nav">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} data-ico={l.icon}
              onClick={() => setOpen(false)}
              className={({ isActive }) => (isActive ? 'active' : '')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-side-foot">
          <div className="admin-user">
            <span className="avatar">{user.username[0]?.toUpperCase()}</span>
            <div className="admin-user-meta">
              <b>{user.username}</b>
              <span>Administrator</span>
            </div>
          </div>
          <Link className="admin-store" to="/">← View storefront</Link>
          <button className="ghost" onClick={logout}>Sign out</button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <button className="admin-hamburger" aria-label="Toggle menu" onClick={() => setOpen((o) => !o)}>☰</button>
          <div className="admin-crumb">
            <Link to="/admin">Admin</Link>
            <span>/</span>
            <b>{current?.label || 'Overview'}</b>
          </div>
          <div className="spacer" />
          <a className="admin-shop-link" href="/" onClick={(e) => { e.preventDefault(); window.location.href = '/' }}>View shop ↗</a>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function Num({ value, onCommit, small }) {
  const [v, setV] = useState(value)
  const [busy, setBusy] = useState(false)
  useEffect(() => setV(value), [value])
  const commit = () => {
    const n = Number(v)
    if (Number.isNaN(n) || n < 0 || n === Number(value)) { setV(value); return }
    setBusy(true)
    onCommit(n).finally(() => setBusy(false))
  }
  return (
    <input
      type="number"
      min="0"
      value={v}
      disabled={busy}
      onChange={(e) => setV(e.target.valueAsNumber)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
      style={{ width: small ? 76 : 96, padding: '6px 8px' }}
    />
  )
}

function Pager({ page, pages, count, onPage }) {
  if (pages <= 1) return null
  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="muted small">Page {page} / {pages} · {count} total</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

const STATUS_BADGE = {
  pending: 'badge-muted',
  payment_confirmed: 'badge-blue',
  packed: 'badge-violet',
  shipped: 'badge-amber',
  in_transit: 'badge-amber',
  delivered: 'badge-green',
  cancelled: 'badge-red',
  refunded: 'badge-red',
}

function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_BADGE[status] || 'badge-muted'}`}>{status.replace(/_/g, ' ')}</span>
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

export { Num, Pager, StatusBadge, inr }