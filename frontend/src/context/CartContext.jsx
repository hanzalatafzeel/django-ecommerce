import { createContext, useContext, useCallback, useState } from 'react'
import { api } from '../api'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setCart(await api('/cart/'))
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const addItem = useCallback(async (product, quantity = 1) => {
    await api('/cart/add/', { method: 'POST', body: { product, quantity } })
    await refresh()
  }, [refresh])

  const updateItem = useCallback(async (item, quantity) => {
    await api('/cart/update/', { method: 'POST', body: { item, quantity } })
    await refresh()
  }, [refresh])

  const removeItem = useCallback(async (item) => {
    await api('/cart/remove/', { method: 'POST', body: { item } })
    await refresh()
  }, [refresh])

  return (
    <CartContext.Provider value={{ cart, loading, refresh, addItem, updateItem, removeItem }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)