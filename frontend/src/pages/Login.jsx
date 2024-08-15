import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <span className="auth-hero-emoji">⚡</span>
        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to continue shopping.</p>
        {error && <div className="alert error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="muted small" style={{ marginTop: 16, marginBottom: 4 }}>
          Demo accounts: <b>user1/demo12345</b> · admin <b>admin/admin12345</b>.
        </p>
        <p className="small" style={{ margin: 0 }}>
          <Link to="/register">Create an account →</Link>
        </p>
      </div>
    </div>
  )
}