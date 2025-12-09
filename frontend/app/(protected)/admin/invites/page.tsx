"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Copy, Trash2, Plus, Check, X } from "lucide-react"

interface Invite {
  id: string
  token: string
  email: string | null
  created_at: string
  expires_at: string
  used_at: string | null
  invite_url: string
}

export default function AdminInvitesPage() {
  const { user, token } = useAuth()
  const router = useRouter()
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState("")
  const [expiresInDays, setExpiresInDays] = useState(7)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ai-platform.dffm.it/api/v1'

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (user.role !== "admin") {
      router.push("/chat")
      return
    }
    fetchInvites()
  }, [user, router])

  const fetchInvites = async () => {
    try {
      const response = await fetch(`${API_URL}/invites`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setInvites(data)
      }
    } catch (error) {
      console.error("Error fetching invites:", error)
    } finally {
      setLoading(false)
    }
  }

  const createInvite = async () => {
    setCreating(true)
    try {
      const response = await fetch(`${API_URL}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: email || null,
          expires_in_days: expiresInDays,
        }),
      })

      if (response.ok) {
        setEmail("")
        setExpiresInDays(7)
        await fetchInvites()
      }
    } catch (error) {
      console.error("Error creating invite:", error)
    } finally {
      setCreating(false)
    }
  }

  const revokeInvite = async (token: string) => {
    if (!confirm("Sei sicuro di voler revocare questo invito?")) return

    try {
      const response = await fetch(`${API_URL}/invites/${token}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        await fetchInvites()
      }
    } catch (error) {
      console.error("Error revoking invite:", error)
    }
  }

  const copyToClipboard = (url: string, token: string) => {
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestione Inviti</h1>
          <p className="text-gray-600 mt-2">Crea e gestisci gli inviti per nuovi utenti</p>
        </div>

        {/* Create Invite Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Crea nuovo invito</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (opzionale)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scadenza (giorni)
              </label>
              <input
                type="number"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                min="1"
                max="365"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={createInvite}
                disabled={creating}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crea Invito
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Invites List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Inviti esistenti ({invites.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scadenza
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Link
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invites.map((invite) => {
                  const isExpired = new Date(invite.expires_at) < new Date()
                  const isUsed = !!invite.used_at
                  const isValid = !isExpired && !isUsed

                  return (
                    <tr key={invite.id} className={isValid ? "" : "bg-gray-50 opacity-60"}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invite.email || <span className="text-gray-400 italic">Nessuna email</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isUsed ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-3 h-3 mr-1" />
                            Utilizzato
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <X className="w-3 h-3 mr-1" />
                            Scaduto
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Valido
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invite.expires_at).toLocaleDateString("it-IT", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => copyToClipboard(invite.invite_url, invite.token)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
                        >
                          {copiedToken === invite.token ? (
                            <>
                              <Check className="w-4 h-4" />
                              Copiato!
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              Copia link
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {!isUsed && (
                          <button
                            onClick={() => revokeInvite(invite.token)}
                            className="text-red-600 hover:text-red-800 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {invites.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Nessun invito creato ancora</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
