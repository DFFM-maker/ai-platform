"use client"

import { useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import InvitesTab from "@/components/settings/InvitesTab"

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
      return
    }
    if (user.role !== "admin") {
      router.push("/chat")
      return
    }
  }, [user, router])

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Impostazioni</h1>
          <p className="mt-2 text-gray-600">
            Gestisci inviti, utenti e configurazioni del sistema
          </p>
        </div>

        <Tabs defaultValue="invites" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="invites">Inviti</TabsTrigger>
            <TabsTrigger value="users">Utenti Pending</TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="mt-6">
            <InvitesTab />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Utenti in attesa di autorizzazione</h3>
              <p className="text-gray-500">Funzionalità in arrivo...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
