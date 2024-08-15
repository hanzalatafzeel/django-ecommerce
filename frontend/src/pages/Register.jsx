import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register(form)
      navigate('/')
    } catch (err) {
      setError(err.data ? JSON.stringify(err.data) : err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-hero-emoji">🛍️</span>
        <h2>Create account</h2>
        <p className="auth-sub">Join VoltMart and start shopping instantly.</p>
        {error && <div className="alert error">{error.slice(0, 300)}</div>}
        <form onSubmit={submit}>
          <div className="row">
            <div className="form-row" style={{ flex: 1 }}>
              <label>First name</label>
              <input value={form.first_name} onChange={set('first_name')} />
            </div>
            <div className="form-row" style={{ flex: 1 }}>
              <label>Last name</label>
              <input value={form.last_name} onChange={set('last_name')} />
            </div>
          </div>
          <div className="form-row">
            <label>Username</label>
            <input value={form.username} onChange={set('username')} required />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} minLength={8} required />
          </div>
          <button className="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Creating…' : 'Create account'}</button>
        </form>
        <p className="muted small" style={{ marginTop: 16 }}>Already have an account? <Link to="/login">Sign in →</Link></p>
      </div>
    </div>
  )
}