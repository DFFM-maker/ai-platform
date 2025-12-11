"use client"

import { useState, useEffect } from "react"
import { X, Clock, RotateCcw, Check, User, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/contexts/AuthContext"

interface Version {
    id: string
    content: string
    created_at: string
    user_id: string | null
    version_number: number // Add version_number
    is_current: boolean // Add is_current flag
}

interface VersionHistoryPanelProps {
    isOpen: boolean
    onClose: () => void
    messageId: string | null
    onRestore: (content: string) => void
}

export function VersionHistoryPanel({ isOpen, onClose, messageId, onRestore }: VersionHistoryPanelProps) {
    const { token } = useAuth()
    const [versions, setVersions] = useState<Version[]>([])
    const [loading, setLoading] = useState(false)

    // Fetch versioni quando si apre il pannello
    useEffect(() => {
        if (isOpen && messageId && token) {
            fetchVersions()
        }
    }, [isOpen, messageId, token])

    const fetchVersions = async () => {
        setLoading(true)
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-platform.dffm.it/api/v1"
            const res = await fetch(`${API_URL}/chat/messages/${messageId}/versions`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data: Version[] = await res.json()
                // Ordiniamo dalla più recente alla più vecchia
                setVersions(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleRestore = async (versionId: string, content: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-platform.dffm.it/api/v1"
            const res = await fetch(`${API_URL}/chat/versions/${versionId}/restore`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                // Dopo il restore, ri-fatcha le versioni per aggiornare gli stati "is_current"
                await fetchVersions()
                // Aggiorna la chat principale
                onRestore(content)
            } else {
                console.error("Restore failed with status:", res.status)
            }
            
            // Non chiudere il pannello qui, l'utente potrebbe voler vedere la nuova versione corrente
            // onClose() 
        } catch (e) {
            console.error("Restore failed", e)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-[#1E1F20] border-l border-white/10 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#131314]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Cronologia Versioni
                </h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-gray-400 hover:text-white">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Lista Versioni */}
            <ScrollArea className="flex-1 p-4">
                {loading ? (
                    <div className="text-center text-gray-500 py-10">Caricamento...</div>
                ) : versions.length === 0 ? (
                    <div className="text-center text-gray-500 py-10">Nessuna modifica registrata.</div>
                ) : (
                    <div className="space-y-4">
                        {versions.map((ver) => ( // Removed idx from map
                            <div key={ver.id} className="bg-[#2C2D2E] rounded-lg border border-white/5 overflow-hidden group">
                                {/* Meta Info */}
                                <div className="px-3 py-2 bg-[#252627] flex items-center justify-between text-xs text-gray-400 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        {ver.user_id ? <User className="w-3 h-3 text-orange-400" /> : <Bot className="w-3 h-3 text-blue-400" />}
                                        <span>Versione {ver.version_number} • {new Date(ver.created_at).toLocaleString('it-IT')}</span>
                                    </div>
                                    {ver.is_current && <span className="text-green-400 font-medium px-1.5 py-0.5 bg-green-400/10 rounded">Attuale</span>}
                                </div>

                                {/* Anteprima Contenuto */}
                                <div className="p-3 text-sm text-gray-300 font-mono text-xs max-h-32 overflow-hidden relative">
                                    {ver.content.substring(0, 200)}...
                                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#2C2D2E] to-transparent pointer-events-none" />
                                </div>

                                {/* Azioni */}
                                {!ver.is_current && ( // Only show restore if not current
                                    <div className="p-2 border-t border-white/5 bg-[#252627] flex justify-end">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 text-xs gap-1.5 hover:bg-blue-600 hover:text-white transition-colors"
                                            onClick={() => handleRestore(ver.id, ver.content)}
                                        >
                                            <RotateCcw className="w-3 h-3" /> Ripristina
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}