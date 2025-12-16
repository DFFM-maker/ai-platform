/**
 * MODIFICATO: 2025-12-14
 * - Aggiunta gestione responsive (Mobile Sidebar)
 * - Sidebar chiusa di default su mobile, fissa su desktop
 * - Aggiunto pulsante Toggle e Overlay
 */

"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { 
  MessageSquare, 
  FileText, 
  Code, 
  Layout, 
  Settings, 
  Plus,
  Bot,
  LogOut,
  Trash2,
  Menu,
  X
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"

const menuItems = [
  { icon: MessageSquare, label: "Chat", href: "/chat" },
  { icon: FileText, label: "Documenti", href: "/documents" },
  { icon: Code, label: "Editor", href: "/editor" },
  { icon: Layout, label: "Canvas", href: "/canvas" },
]

interface ChatSession {
  id: string
  title: string
  created_at: string
  message_count: number
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  
  // Stato per gestire l'apertura su mobile
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-platform.dffm.it/api/v1"

  useEffect(() => {
    if (user) {
      fetchSessions()
    }
  }, [user])

  // Chiude la sidebar automaticamente quando cambi pagina (su mobile)
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  const fetchSessions = async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/chat/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e)
    }
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const token = localStorage.getItem('auth_token')
    if (!token) return

    try {
      const res = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
      }
    } catch (e) {
      console.error('Failed to delete session:', e)
    }
  }

  return (
    <>
      {/* --- MOBILE TOGGLE BUTTON --- */}
      {/* Visibile solo su mobile (md:hidden), fisso in alto a sinistra */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 bg-[#1E1F20] text-gray-200 rounded-md border border-white/10 shadow-lg hover:bg-white/5 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* --- MOBILE OVERLAY --- */}
      {/* Oscura lo sfondo quando la sidebar è aperta su mobile */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* --- SIDEBAR CONTAINER --- */}
      <div className={cn(
        "w-[260px] bg-[#1E1F20] h-screen flex flex-col border-r border-white/5 font-sans text-gray-200",
        // Mobile Styles: Fixed, Full Height, Slide Transition
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        // Desktop Styles: Relative (nel flusso), Always Visible
        "md:relative md:translate-x-0",
        // Logic: Se mobile open -> translate 0, altrimenti nascosta a sinistra
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Header / New Chat */}
        <div className="p-4 pt-6">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="flex items-center gap-2 text-gray-100">
                <Bot className="w-6 h-6 text-blue-400" />
                <span className="font-semibold text-lg tracking-tight">AI Platform</span>
            </div>
            {/* Tasto chiusura solo mobile */}
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Link href="/chat" onClick={(e) => {
            if (window.location.pathname === '/chat') {
              e.preventDefault()
              window.history.pushState({}, '', '/chat')
              window.dispatchEvent(new Event('popstate'))
            }
          }}>
              <Button 
                  variant="secondary" 
                  className="w-full justify-start gap-3 bg-[#282A2C] hover:bg-[#37393B] text-gray-200 rounded-xl h-12 border-none shadow-none"
              >
                  <Plus className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Nuova chat</span>
              </Button>
          </Link>
        </div>

        {/* Chat History */}
        {user && sessions.length > 0 && (
          <div className="px-3 py-2 flex-1 overflow-y-auto">
            <div className="px-3 mb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Cronologia
            </div>
            <div className="space-y-1">
              {sessions.map((session) => (
                <Link key={session.id} href={`/chat?session=${session.id}`}>
                  <div className="group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm hover:bg-white/5 cursor-pointer transition-colors">
                    <div className="flex-1 truncate text-gray-300">
                      {session.title}
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Menu Voci */}
        <div className="px-3 py-2 space-y-1">
          <div className="px-3 mb-2 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            Strumenti
          </div>
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-[#004A77]/50 text-blue-100" 
                      : "text-gray-400 hover:bg-white/5 hover:text-gray-100"
                  )}
                >
                  <item.icon className={cn("w-4 h-4", isActive ? "text-blue-300" : "text-gray-500")} />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </div>

        {/* Footer User */}
        <div className="p-4 mt-auto border-t border-white/5">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-xs font-bold text-purple-200 border border-purple-500/20">
                  {user.email[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{user.email}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.role}</p>
                </div>
                {user.role === 'admin' && (
                  <button
                    onClick={() => router.push('/settings')}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                    title="Impostazioni"
                  >
                    <Settings className="w-4 h-4 text-gray-400 hover:text-gray-200" />
                  </button>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={logout}
                className="w-full justify-start gap-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="w-full">
                Accedi
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  )
}