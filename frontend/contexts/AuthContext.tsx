/**
 * CREATO: 2025-12-07
 * - Context per gestione autenticazione globale
 * - Token storage in localStorage
 * - User state management
 * - Auto-check auth al mount
 */

"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (token: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-platform.dffm.it/api/v1'

  // Check se autenticato al mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('auth_token')
      if (!storedToken) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        })

        if (res.ok) {
          const userData = await res.json()
          setUser(userData)
          setToken(storedToken)
        } else {
          // Token invalido/scaduto
          localStorage.removeItem('auth_token')
        }
      } catch (e) {
        console.error('Auth check failed:', e)
        localStorage.removeItem('auth_token')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [API_URL])

  const login = async (newToken: string) => {
    try {
      // Salva token
      localStorage.setItem('auth_token', newToken)
      setToken(newToken)

      // Fetch user info
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${newToken}` }
      })

      if (res.ok) {
        const userData = await res.json()
        setUser(userData)
        router.push('/chat')
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (e) {
      console.error('Login failed:', e)
      localStorage.removeItem('auth_token')
      throw e
    }
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    setUser(null)
    setToken(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
