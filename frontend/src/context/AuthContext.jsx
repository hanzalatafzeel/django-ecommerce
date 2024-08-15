import { createContext, useContext, useEffect, useState } from 'react'
import { api, clearTokens, setTokens } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        if (localStorage.getItem('ecom_access')) {
          setUser(await api('/accounts/me/'))
        }
      } catch {
        clearTokens()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = async (username, password) => {
    const data = await api('/auth/token/', { method: 'POST', body: { username, password }, auth: false })
    setTokens(data)
    setUser(await api('/accounts/me/'))
  }

  const register = async (payload) => {
    const data = await api('/accounts/register/', { method: 'POST', body: payload, auth: false })
    setTokens(data)
    setUser(data.user || (await api('/accounts/me/')))
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)