import { createContext, useState, useContext, useEffect } from 'react'

const AuthContext = createContext(null)

// ✅ FIXED - removed trailing space
const API_URL = 'http://127.0.0.1:5000/api/auth'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = localStorage.getItem('token')

    // ✅ NO TOKEN = STOP LOADING
    if (!token) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      // ❌ if backend is OFF → this fails
      if (!res.ok) throw new Error('Auth failed')

      const data = await res.json()

      if (data.status === 'success') {
        setUser(data.data.user)
        setIsAuthenticated(true)
      } else {
        throw new Error('Invalid token')
      }

    } catch (err) {
      console.log("Auth error:", err)

      localStorage.removeItem('token')
      setUser(null)
      setIsAuthenticated(false)
    }

    // ✅ ALWAYS STOP LOADING
    setLoading(false)
  }

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (data.status === 'success') {
        localStorage.setItem('token', data.data.token)

        setUser(data.data.user)
        setIsAuthenticated(true)

        return { success: true }
      }

      return { success: false, error: data.message }

    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  const register = async (userData) => {
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })

      const data = await res.json()

      if (data.status === 'success') {
        localStorage.setItem('token', data.data.token)

        setUser(data.data.user)
        setIsAuthenticated(true)

        return { success: true }
      }

      return { success: false, error: data.message }

    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  const logout = async () => {
    const token = localStorage.getItem('token')

    try {
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
      }
    } catch {}

    localStorage.removeItem('token')
    setUser(null)
    setIsAuthenticated(false)
  }

  // ✅ HELPER: Get token from localStorage
  const getToken = () => localStorage.getItem('token')

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      getToken  // ✅ EXPOSE THIS
    }}>
      {children}
    </AuthContext.Provider>
  )
}