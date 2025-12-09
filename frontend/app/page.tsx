"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  MessageSquare,
  Database,
  Settings,
  ArrowRight,
  ShieldCheck,
  Zap
} from "lucide-react"


// --- COMPONENTE 1: LANDING PAGE (Pubblica) ---
function LandingPage() {
  return (
    <div className="min-h-screen bg-[#131314] text-white flex flex-col items-center justify-center relative overflow-hidden">

      {/* Background Glow Effect - L'ho reso leggermente più soffuso */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/20 rounded-full blur-[150px] pointer-events-none" />

      <div className="relative z-10 text-center space-y-8 p-6 max-w-4xl">

        {/* --- INIZIO NUOVO BLOCCO LOGO ADATTATO --- */}
        {/* --- BLOCCO LOGO CON SVG --- */}
        <div className="flex justify-center mb-14">
          <div className="relative flex items-center justify-center p-10">

            {/* Glow soffuso dietro al logo */}
            <div className="absolute inset-0 bg-blue-700/20 blur-[130px] rounded-full pointer-events-none" />

            <Image
              src="/dfm-logo-badge.svg"
              alt="DFM Wood Maker Logo"
              width={420}
              height={160}
              className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.45)]"
              priority
            />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
          Enterprise AI Platform
        </h1>

        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Accesso sicuro ai modelli LLM aziendali. Generazione codice, analisi documenti e automazione intelligente in un unico posto.
        </p>

        <div className="flex gap-4 justify-center pt-8">
          {/* Tasto Login che porta alla pagina di login */}
          <Link href="/login">
            <Button size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg hover:shadow-blue-500/25 transition-all">
              Accedi alla Piattaforma <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-16 text-sm text-gray-500">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-green-400" /> Enterprise Security
          </div>
          <div className="flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" /> NVIDIA Accelerated
          </div>
          <div className="flex items-center justify-center gap-2">
            <Database className="w-4 h-4 text-blue-400" /> RAG Knowledge Base
          </div>
        </div>
      </div>
    </div>
  )
}

// --- COMPONENTE 2: DASHBOARD (Privata) ---
function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header Semplificato */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Bentornato, {user?.email?.split('@')[0] || 'Utente'} 👋
          </h1>
          <p className="text-gray-400">Seleziona un'attività per iniziare.</p>
        </div>
      </div>

      {/* Quick Actions Grid - Al posto di "Compute Unit" */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Card 1: Nuova Chat */}
        <Link href="/chat" className="group">
          <Card className="p-6 bg-[#1E1F20] border-white/5 hover:border-blue-500/50 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:bg-[#252628]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center mb-4 text-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Nuova Chat</h3>
              <p className="text-gray-400 text-sm">Avvia una conversazione con i modelli Qwen, Mistral o Llama.</p>
            </div>
            <div className="mt-4 flex items-center text-blue-400 text-sm font-medium">
              Inizia ora <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        {/* Card 2: Knowledge Base */}
        <Link href="/documents" className="group">
          <Card className="p-6 bg-[#1E1F20] border-white/5 hover:border-purple-500/50 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:bg-[#252628]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-600/10 flex items-center justify-center mb-4 text-purple-500 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Knowledge Base</h3>
              <p className="text-gray-400 text-sm">Carica PDF e documenti tecnici per il RAG.</p>
            </div>
            <div className="mt-4 flex items-center text-purple-400 text-sm font-medium">
              Gestisci file <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

        {/* Card 3: Impostazioni / Admin */}
        <Link href="/settings" className="group">
          <Card className="p-6 bg-[#1E1F20] border-white/5 hover:border-gray-500/50 transition-all cursor-pointer h-full flex flex-col justify-between group-hover:bg-[#252628]">
            <div>
              <div className="w-12 h-12 rounded-xl bg-gray-600/10 flex items-center justify-center mb-4 text-gray-500 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">System Status</h3>
              <p className="text-gray-400 text-sm">Monitora GPU, modelli caricati e statistiche.</p>
            </div>
            <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
              Vedi status <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Card>
        </Link>

      </div>
    </div>
  )
}

// --- MAIN PAGE COMPONENT (Il Semaforo) ---
export default function Home() {
  const { token, isLoading } = useAuth()
  const [mounted, setMounted] = useState(false)

  // Prevenzione Hydration Mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return <div className="min-h-screen bg-[#131314]" /> // O uno spinner di caricamento
  }

  // LOGICA SEMAFORO
  if (!token) {
    return <LandingPage />
  }

  return <Dashboard />
}