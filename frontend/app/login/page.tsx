/**
 * CREATO: 2025-12-07
 * - Pagina login con Google OAuth
 * - Design minimal stile ChatGPT
 * - Redirect automatico se già autenticato
 */

"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { Bot, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { user, login, isLoading } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-platform.dffm.it/api/v1'
  const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

  // Redirect se già autenticato
  useEffect(() => {
    if (!isLoading && user) {
      router.push('/chat')
    }
  }, [user, isLoading, router])

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setIsSubmitting(true)
    setLoginError(null)

    try {
      // Recupera il token di invito se presente
      const inviteToken = localStorage.getItem("invite_token")
      
      const res = await fetch(`${API_URL}/auth/google/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          credential: credentialResponse.credential,
          invite_token: inviteToken || undefined
        })
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || 'Login fallito')
      }

      const data = await res.json()
      
      // Rimuovi il token di invito dopo l'uso
      if (inviteToken) {
        localStorage.removeItem("invite_token")
      }
      
      await login(data.access_token)
    } catch (e: any) {
      setLoginError(e.message)
      setIsSubmitting(false)
    }
  }

  const handleGoogleError = () => {
    setLoginError('Login Google fallito. Riprova.')
    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#131314] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen bg-[#131314] flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          {/* Logo & Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-[#1E1F20] rounded-2xl flex items-center justify-center ring-1 ring-white/10">
              <Bot className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Benvenuto</h1>
              <p className="text-gray-400 mt-2">Accedi alla tua AI Platform</p>
            </div>
          </div>

          {/* Login Card */}
          <div className="bg-[#1E1F20] rounded-2xl p-8 border border-white/10 space-y-6">
            {/* Error Message */}
            {loginError && (
              <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-sm text-red-300">
                {loginError}
              </div>
            )}

            {/* Google Login Button */}
            <div className="flex justify-center">
              {isSubmitting ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Accesso in corso...</span>
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                />
              )}
            </div>

            {/* Info */}
            <div className="text-center text-xs text-gray-500 pt-4 border-t border-white/5">
              Solo account Google autorizzati possono accedere
            </div>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-600">
            AI Enterprise Platform © 2025
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}
