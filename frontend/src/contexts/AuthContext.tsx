import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../api/client'

interface User {
  id: string
  email: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      api.setToken(token)
      api.get<{ user: User }>('/api/auth/me', {}).then(r => {
        setUser(r.user)
      }).catch(() => {
        setToken(null)
        localStorage.removeItem('token')
        api.setToken(null)
      }).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  async function signIn(email: string, password: string) {
    const res = await api.post<{ user: User; session: { access_token: string } }>('/api/auth/signin', { email, password })
    localStorage.setItem('token', res.session.access_token)
    api.setToken(res.session.access_token)
    setToken(res.session.access_token)
    setUser(res.user)
  }

  async function signUp(email: string, password: string) {
    await api.post('/api/auth/signup', { email, password })
  }

  function signOut() {
    localStorage.removeItem('token')
    api.setToken(null)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
