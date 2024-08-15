import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { api } from '../../api'
import { StatusBadge, inr } from './AdminLayout.jsx'

const STATUS_COLORS = {
  pending: '#9aa3af', payment_confirmed: '#4f7cff', packed: '#8b5cf6', shipped: '#f59e0b',
  in_transit: '#f97316', delivered: '#10b981', cancelled: '#ef4444', refunded: '#ef4444',
}

function Kpi({ label, value, delta, icon }) {
  const d = delta == null ? null : (delta >= 0 ? 'up' : 'down')
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-ico">{icon}</span>
      </div>
      <span className="kpi-value">{value}</span>
      {d
        ? <span className={`kpi-delta ${delta === 0 ? 'flat' : d}`}>{delta > 0 ? '▲ +' : delta < 0 ? '▼ ' : '• '}{delta}% vs prior period</span>
        : <span className="kpi-delta flat">—</span>}
    </div>
  )
}

const fmtDay = (iso) => iso.slice(5)

export default function Overview() {
  const [d, setD] = useState(null)
  const [low, setLow] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    api('/inventory/admin/analytics/').then(setD).catch((e) => setErr(e.message || 'load failed'))
    api('/inventory/low-stock/').then((l) => setLow(Array.isArray(l) ? l : (l.results || []))).catch(() => {})
  }, [])

  if (err) return <div className="alert error">{err}</div>
  if (!d) return <div className="spinner" />

  const k = d.kpis
  const statusPie = d.orders_by_status.map((s) => ({
    name: s.status.replace(/_/g, ' '), value: s.count, color: STATUS_COLORS[s.status] || '#9aa3af',
  }))
  const catBars = d.revenue_by_category.map((c) => ({ name: c.name || 'Uncategorized', value: Math.round(Number(c.total)) }))

  return (
    <>
      <div className="kpi-grid">
        <Kpi label="Revenue (30d)" value={inr(k.revenue.value)} delta={k.revenue.delta} icon="💰" />
        <Kpi label="Orders (30d)" value={k.orders.value} delta={k.orders.delta} icon="📦" />
        <Kpi label="New customers" value={k.customers.value} delta={k.customers.delta} icon="👥" />
        <Kpi label="Products" value={k.products.value} icon="🏷️" />
        <Kpi label="Low stock (≤10)" value={k.low_stock} icon="⚠️" />
        <Kpi label="Out of stock" value={k.out_of_stock} icon="🚫" />
      </div>

      <div className="grid-2">
        <div className="card span-2">
          <h3>Revenue · last 30 days</h3>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.series} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v)} />
                <Tooltip formatter={(v) => [inr(v), 'Revenue']} labelFormatter={(l) => l} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Orders per day</h3>
          <div className="chart-box-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.series} margin={{ top: 6, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(127,127,127,0.08)' }} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />
                <Bar dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <h3>Orders by status</h3>
          <div className="chart-box-sm">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={46} outerRadius={72} paddingAngle={3} stroke="none">
                  {statusPie.map((s) => <Cell key={s.name} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="chips" style={{ justifyContent: 'center', gap: 6, marginBottom: 0 }}>
            {statusPie.map((s) => (
              <span key={s.name} className="badge badge-muted" style={{ background: `${s.color}22`, color: s.color }}>{s.name} · {s.value}</span>
            ))}
          </div>
        </div>

        <div className="card span-2">
          <h3>Revenue by category (top 8)</h3>
          <div className="chart-box-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catBars} layout="vertical" margin={{ top: 0, right: 24, left: 40, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 1000)}k` : v)} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [inr(v), 'Revenue']} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }} />
                <Bar dataKey="value" fill="var(--accent-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Recent orders</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>
                {d.recent_orders.map((o) => (
                  <tr key={o.id} className="row-click" onClick={() => { window.location.href = '/admin/orders' }}>
                    <td className="mono">{o.order_number}</td>
                    <td>{o.user?.username}</td>
                    <td>{inr(o.total)}</td>
                    <td><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
                {d.recent_orders.length === 0 && <tr><td colSpan={4} className="empty-note">No orders yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Top customers</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Customer</th><th>Spent</th><th>Orders</th></tr></thead>
              <tbody>
                {d.top_customers.map((c) => (
                  <tr key={c.id}>
                    <td><span className="tap"><span className="avatar">{c.username[0]?.toUpperCase()}</span><b>{c.username}</b></span></td>
                    <td>{inr(c.spent)}</td>
                    <td>{c.orders}</td>
                  </tr>
                ))}
                {d.top_customers.length === 0 && <tr><td colSpan={3} className="empty-note">No customers yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Top sellers</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Sold</th><th>Stock left</th></tr></thead>
              <tbody>
                {d.top_sellers.map((p) => (
                  <tr key={p.id}>
                    <td>{p.title}</td>
                    <td>{p.sold_count}</td>
                    <td>{p.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <h3>Needs restock</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>Stock</th></tr></thead>
              <tbody>
                {low.map((p) => (
                  <tr key={p.id} className="row-click" onClick={() => { window.location.href = '/admin/products' }}>
                    <td>{p.title}</td>
                    <td><span className="badge badge-amber">{p.stock}</span></td>
                  </tr>
                ))}
                {low.length === 0 && <tr><td colSpan={2} className="empty-note">All stocked up.</td></tr>}
              </tbody>
            </table>
          </div>
          <Link className="btn ghost" to="/admin/products" style={{ marginTop: 12 }}>Manage inventory →</Link>
        </div>
      </div>
    </>
  )
}