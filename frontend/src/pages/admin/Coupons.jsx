import { useEffect, useState } from 'react'
import { api } from '../../api'

export default function Coupons() {
  const [list, setList] = useState([])
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const load = () => {
    api('/inventory/admin/coupons/').then((d) => setList(d.results || [])).catch((e) => setErr(e.message || 'load failed'))
  }
  useEffect(load, [])

  const save = async (f) => {
    setBusy(true); setErr('')
    try {
      const body = {
        code: String(f.code || '').trim().toUpperCase(),
        discount_percent: f.kind === 'percent' ? Number(f.value) || 0 : 0,
        discount_amount: f.kind === 'flat' ? Number(f.value) || 0 : 0,
        min_order_value: f.min_order_value ? Number(f.min_order_value) : 0,
        valid_until: f.valid_until || null,
        active: !!f.active,
        max_redemptions: f.max_redemptions ? Number(f.max_redemptions) : 0,
      }
      if (f.id) {
        await api(`/inventory/admin/coupons/${f.id}/`, { method: 'PATCH', body })
        setOk(`Coupon ${body.code} updated`)
      } else {
        await api('/inventory/admin/coupons/', { method: 'POST', body })
        setOk(`Coupon ${body.code} created`)
      }
      setModal(null); load()
    } catch (e) { setErr(e.message || 'save failed') }
    finally { setBusy(false) }
  }

  const toggle = async (c) => {
    try { await api(`/inventory/admin/coupons/${c.id}/`, { method: 'PATCH', body: { active: !c.active } }); load() }
    catch (e) { setErr(e.message || 'update failed') }
  }
  const remove = async (c) => {
    if (!window.confirm(`Delete coupon ${c.code}?`)) return
    try { await api(`/inventory/admin/coupons/${c.id}/`, { method: 'DELETE' }); setOk('Coupon deleted'); load() }
    catch (e) { setErr(e.message || 'delete failed') }
  }

  const now = new Date().toISOString().slice(0, 16)

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Coupons</h2>
          <span className="sub">{list.length} total</span>
        </div>
        <button className="primary" onClick={() => setModal({ kind: 'percent', active: true, valid_until: now, min_order_value: '', max_redemptions: '' })}>
          + New coupon
        </button>
      </div>

      {err && <div className="alert error">{err}</div>}
      {ok && <div className="alert success">{ok}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Code</th><th>Discount</th><th>Min order</th><th>Valid until</th><th>Used</th><th>Limit</th><th>Active</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} style={c.active ? {} : { opacity: 0.55 }}>
                <td><b className="mono">{c.code}</b></td>
                <td>
                  {Number(c.discount_percent) > 0
                    ? `${c.discount_percent}% off`
                    : `${Number(c.discount_amount).toLocaleString('en-IN')} flat`}
                </td>
                <td>{c.min_order_value ? `₹${Number(c.min_order_value).toLocaleString('en-IN')}` : '—'}</td>
                <td className="muted small">{c.valid_until ? new Date(c.valid_until).toLocaleDateString('en-IN') : 'Never'}</td>
                <td>{c.used_count}</td>
                <td>{c.max_redemptions ? c.max_redemptions : '∞'}</td>
                <td>
                  <input type="checkbox" checked={c.active} aria-label="Active" title="Toggle active"
                    onChange={() => toggle(c)} style={{ width: 'auto' }} />
                </td>
                <td>
                  <div className="action-row">
                    <button className="ghost" onClick={() => setModal({
                      id: c.id, code: c.code,
                      kind: Number(c.discount_percent) > 0 ? 'percent' : 'flat',
                      value: Number(c.discount_percent) > 0 ? c.discount_percent : c.discount_amount,
                      min_order_value: c.min_order_value ?? '', valid_until: c.valid_until?.slice(0, 16) || now,
                      max_redemptions: c.max_redemptions ?? '', active: c.active,
                    })}>Edit</button>
                    <button className="danger" onClick={() => remove(c)}>Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={8} className="empty-note">No coupons yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <CouponForm initial={modal} busy={busy} onCancel={() => setModal(null)} onSave={save} />
      )}
    </>
  )
}

function CouponForm({ initial, busy, onCancel, onSave }) {
  const [f, setF] = useState(initial)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{f.id ? `Edit · ${f.code}` : 'New coupon'}</h3>
        <div className="form-row"><label>Code</label>
          <input value={f.code || ''} placeholder="SUMMER50" onChange={(e) => set('code', e.target.value.toUpperCase())} /></div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div><label>Type</label>
            <select value={f.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="percent">Percent off</option>
              <option value="flat">Flat amount</option>
            </select></div>
          <div><label>{f.kind === 'percent' ? 'Percent (%)' : 'Amount (₹)'}</label>
            <input type="number" min="0" value={f.value} onChange={(e) => set('value', e.target.value)} /></div>
        </div>
        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label>Min order value (₹)</label>
            <input type="number" min="0" value={f.min_order_value} onChange={(e) => set('min_order_value', e.target.value)} /></div>
          <div><label>Max redemptions</label>
            <input type="number" min="1" value={f.max_redemptions} onChange={(e) => set('max_redemptions', e.target.value)} /></div>
        </div>
        <div className="form-row"><label>Valid until</label>
          <input type="datetime-local" value={f.valid_until} onChange={(e) => set('valid_until', e.target.value)} /></div>
        <div className="form-row">
          <label style={{ color: 'var(--text)' }}>
            <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} style={{ width: 'auto', marginRight: 6 }} />
            Active (redeemable)
          </label>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" disabled={busy || !f.code?.trim()} onClick={() => onSave(f)}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  )
}