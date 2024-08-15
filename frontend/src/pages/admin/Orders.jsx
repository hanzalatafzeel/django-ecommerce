import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Pager, StatusBadge, inr } from './AdminLayout.jsx'

const PAGE = 20
const STATUSES = [
  ['pending', 'Pending'],
  ['payment_confirmed', 'Payment confirmed'],
  ['packed', 'Packed'],
  ['shipped', 'Shipped'],
  ['in_transit', 'In transit'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
  ['refunded', 'Refunded'],
]
const FLOW = ['pending', 'payment_confirmed', 'packed', 'shipped', 'in_transit', 'delivered']

export default function Orders() {
  const [list, setList] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    const q = new URLSearchParams()
    q.set('page', page)
    q.set('page_size', PAGE)
    if (status) q.set('status', status)
    if (search) q.set('search', search)
    api(`/inventory/admin/orders/?${q}`)
      .then((d) => { setList(d.results || []); setCount(d.count || 0) })
      .catch((e) => setErr(e.message || 'load failed'))
  }
  useEffect(load, [page, status, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = (o) => {
    if (openId === o.id) { setOpenId(null); setDetail(null); return }
    setOpenId(o.id); setDetail(null); setErr(''); setOk('')
    api(`/inventory/admin/orders/${o.id}/`).then(setDetail).catch((e) => setErr(e.message || 'load failed'))
  }

  const setStatusNow = async (id, target) => {
    setBusy(true); setErr(''); setOk('')
    try {
      const d = await api(`/inventory/admin/orders/${id}/status/`, { method: 'POST', body: { status: target } })
      setOk(`Order ${d.order_number} → ${target.replace(/_/g, ' ')}`)
      setDetail(d); load()
    } catch (e) { setErr(e.message || 'status update failed') }
    finally { setBusy(false) }
  }

  const pages = Math.max(1, Math.ceil(count / PAGE))
  const cur = detail?.status

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Orders</h2>
          <span className="sub">{count} total</span>
        </div>
      </div>

      {err && <div className="alert error">{err}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="chips">
        <button className={!status ? 'active' : ''} onClick={() => { setStatus(''); setPage(1) }}>All</button>
        {STATUSES.map(([v, l]) => (
          <button key={v} className={status === v ? 'active' : ''} onClick={() => { setStatus(v); setPage(1) }}>{l}</button>
        ))}
      </div>

      <div className="toolbar">
        <input type="search" placeholder="Search order #, customer, city…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Placed</th><th>Status</th></tr>
          </thead>
          <tbody>
            {list.map((o) => (
              <tr key={o.id} className="row-click" onClick={() => open(o)}>
                <td className="mono">{o.order_number}</td>
                <td>
                  <span className="tap">
                    <span className="avatar">{(o.user?.username || '?')[0].toUpperCase()}</span>
                    <span><b>{o.user?.username}</b><span className="muted small" style={{ display: 'block' }}>{o.user?.email}</span></span>
                  </span>
                </td>
                <td>{o.items_count}</td>
                <td>{inr(o.total)}</td>
                <td className="muted small">{new Date(o.placed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                <td><StatusBadge status={o.status} /></td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="empty-note">No orders match.</td></tr>}
          </tbody>
        </table>
      </div>

      <Pager page={page} pages={pages} count={count} onPage={setPage} />

      {openId && (
        <div className="drawer-scrim" onClick={() => { setOpenId(null); setDetail(null) }}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            {!detail && <div className="spinner" />}
            {detail && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="mono">{detail.order_number}</h3>
                  <StatusBadge status={detail.status} />
                </div>

                <div className="row-line"><span>Customer</span><b>{detail.user?.username} · {detail.user?.email}</b></div>
                <div className="row-line"><span>Placed</span><b>{new Date(detail.placed_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</b></div>
                <div className="row-line"><span>Payment</span><b>{detail.payment_status ? `${detail.payment_status.status} · ${detail.payment_status.gateway || 'mock'}` : '—'}</b></div>

                <h4 style={{ margin: '16px 0 8px' }}>Ship to</h4>
                <p className="muted small" style={{ marginTop: 0 }}>
                  {detail.address?.label && <b>{detail.address.label} </b>}
                  {detail.address?.line1}{detail.address?.line2 ? `, ${detail.address.line2}` : ''}, {detail.address?.city}, {detail.address?.state} {detail.address?.pincode}
                </p>

                <h4 style={{ margin: '16px 0 8px' }}>Items</h4>
                <div className="table-wrap" style={{ border: 'none' }}>
                  <table style={{ minWidth: 0 }}>
                    <tbody>
                      {detail.items.map((it) => (
                        <tr key={it.id}>
                          <td>
                            {it.product_title || it.title || it.product?.title}
                            <span className="muted small" style={{ display: 'block' }}>₹{Number(it.unit_price).toLocaleString('en-IN')} × {it.quantity}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>{inr(it.line_total || Number(it.unit_price) * it.quantity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="row-line"><span>Subtotal</span><b>{inr(detail.subtotal)}</b></div>
                <div className="row-line"><span>Discount {detail.coupon_code ? `(${detail.coupon_code})` : ''}</span><b>−{inr(detail.discount)}</b></div>
                <div className="row-line"><span>Shipping</span><b>{inr(detail.shipping)}</b></div>
                <div className="row-line"><span>Tax</span><b>{inr(detail.tax)}</b></div>
                <div className="row-line"><span>Total</span><b style={{ fontSize: 16 }}>{inr(detail.total)}</b></div>

                <h4 style={{ margin: '16px 0 8px' }}>Status timeline</h4>
                {[...(detail.status_history || [])].reverse().map((h) => (
                  <div className="row-line" key={h.id}>
                    <span className="muted small">{new Date(h.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <b>{(h.new_status || h.status).replace(/_/g, ' ')}{h.note ? ` · ${h.note}` : ''}</b>
                  </div>
                ))}
                {(detail.status_history || []).length === 0 && <p className="muted small">No history.</p>}

                <div className="action-row" style={{ marginTop: 18 }}>
                  {FLOW.indexOf(cur) > -1 && FLOW.indexOf(cur) < FLOW.length - 1 && (
                    <button className="primary" disabled={busy} onClick={() => setStatusNow(detail.id, FLOW[FLOW.indexOf(cur) + 1])}>
                      Advance → {FLOW[FLOW.indexOf(cur) + 1].replace(/_/g, ' ')}
                    </button>
                  )}
                  {cur && !['cancelled', 'delivered'].includes(cur) && (
                    <select
                      disabled={busy}
                      value=""
                      onChange={(e) => e.target.value && setStatusNow(detail.id, e.target.value)}
                      style={{ width: 'auto' }}
                    >
                      <option value="">Jump to…</option>
                      {FLOW.map((s) => (FLOW.indexOf(s) > FLOW.indexOf(cur)
                        ? <option key={s} value={s}>{s.replace(/_/g, ' ')}</option> : null))}
                    </select>
                  )}
                  {cur && !['cancelled', 'delivered'].includes(cur) && (
                    <button className="danger" disabled={busy} onClick={() => setStatusNow(detail.id, 'cancelled')}>Cancel order</button>
                  )}
                  {['delivered', 'cancelled'].includes(cur) && <span className="muted small">Order is terminal ({cur}).</span>}
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </>
  )
}