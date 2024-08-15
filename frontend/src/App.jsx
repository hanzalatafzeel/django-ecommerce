import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { useCart } from './context/CartContext'

export default function App() {
  const { user, logout } = useAuth()
  const { cart, refresh } = useCart()
  const location = useLocation()

  useEffect(() => {
    if (user) refresh()
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <>
      <nav className="nav">
        <Link to="/" className="brand">VOLT<em>MART</em></Link>
        <NavLink to="/products" className="link" end>Shop</NavLink>
        {user && <NavLink to="/orders" className="link">Orders</NavLink>}
        {user?.is_staff && <NavLink to="/admin" className="link">Admin</NavLink>}
        <div className="spacer" />
        <Link to="/cart" className="cart-pill">Cart{cart?.count > 0 && <span className="badge">{cart.count}</span>}</Link>
        {user ? (
          <button className="ghost" onClick={logout}>Logout ({user.username})</button>
        ) : (
          <Link to="/login"><button className="primary">Login</button></Link>
        )}
      </nav>
      <main className="page"><Outlet /></main>
      <footer className="footer">
        <div className="footer-inner">
          <div>
            <h4 style={{ marginBottom: 12 }}>VOLT<span style={{ color: 'var(--accent)' }}>MART</span></h4>
            <p>Lightning-fast commerce built on Django, Redis & React — with live order tracking and simulated payments for high-volume shopping.</p>
          </div>
          <div>
            <h4>Shop</h4>
            <Link to="/products">All products</Link>
            <Link to="/products?ordering=bestdeals">Best deals</Link>
            <Link to="/products?ordering=-sold_count">Best sellers</Link>
          </div>
          <div>
            <h4>Account</h4>
            {user ? (
              <>
                <Link to="/orders">My orders</Link>
                <Link to="/cart">Cart</Link>
                <Link to="/dashboard">Dashboard</Link>
              </>
            ) : (
              <>
                <Link to="/login">Sign in</Link>
                <Link to="/register">Create account</Link>
              </>
            )}
          </div>
          <div className="copy">© {new Date().getFullYear()} VoltMart · Demo storefront · Payments are mocked.</div>
        </div>
      </footer>
    </>
  )
}