"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  Send, Bot, RefreshCw, Sparkles, Code2, Menu, Plus,
  MessageSquare, Square, Pencil, Copy, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import CodeVersionPanel from "@/components/CodeVersionPanel"
import { useAuth } from "@/contexts/AuthContext"

// --- INTERFACCE ---
interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

interface ModelPreset {
  name: string
  model_name: string
  category: string
  display_name?: string
}

interface CodeVersion {
  id: string
  code: string
  timestamp: Date
  description: string
}

interface ChatSession {
  id: string
  title: string
  created_at: string
  message_count: number
}

// --- COMPONENTE PER RENDERIZZARE IL CONTENUTO (Versione Streaming-Friendly) ---
const MessageContent = ({ content }: { content: string }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // FIX: Splittiamo semplicemente per ```
  // Gli indici DISPARI saranno sempre contenuto di codice, anche se non ancora chiusi
  const parts = content.split('```');

  return (
    <div className="space-y-2">
      {parts.map((part, index) => {
        const isCode = index % 2 !== 0; // 0=Testo, 1=Codice, 2=Testo...

        if (!isCode) {
          // Renderizza testo normale
          if (!part.trim()) return null;
          return <div key={index} className="whitespace-pre-wrap">{part}</div>
        }

        // --- Renderizza Blocco Codice ---
        // Cerchiamo di indovinare la lingua dalla prima riga
        let lang = "code";
        let code = part;

        const firstNewLine = part.indexOf('\n');
        if (firstNewLine !== -1 && firstNewLine < 20) {
          // Se la prima riga è corta (es. "python"), è la lingua
          const possibleLang = part.substring(0, firstNewLine).trim();
          if (possibleLang && !possibleLang.includes(' ')) {
            lang = possibleLang;
            code = part.substring(firstNewLine + 1); // Il resto è codice
          }
        }

        return (
          <div key={index} className="rounded-lg overflow-hidden border border-white/10 bg-[#1E1F20] my-2 group">
            <div className="flex items-center justify-between px-4 py-2 bg-[#2C2D2E] border-b border-white/5">
              <span className="text-xs font-mono text-gray-400 uppercase">{lang}</span>
              <button
                onClick={() => copyToClipboard(code, index)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                {copiedIndex === index ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400">Copiato!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copia</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-4 overflow-x-auto bg-[#131314]">
              <pre className="text-sm font-mono text-gray-200">
                <code>{code}</code>
              </pre>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- MAIN COMPONENT ---
export function ChatInterface() {
  const { token } = useAuth()
  const searchParams = useSearchParams()

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [useRAG, setUseRAG] = useState(false)
  const [presets, setPresets] = useState<ModelPreset[]>([])
  const [selectedPreset, setSelectedPreset] = useState("")
  const [codeVersions, setCodeVersions] = useState<CodeVersion[]>([])
  const [showVersionPanel, setShowVersionPanel] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null) // Ref per STOP

  // --- LOGICA AUTO-GROW TEXTAREA ---
  const adjustHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }
  useEffect(() => { adjustHeight() }, [input])

  // --- LOGICA STOP GENERATION ---
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }

  // --- LOGICA EDIT MESSAGGIO ---
  const handleEdit = (index: number) => {
    const msgToEdit = messages[index]
    if (msgToEdit.role !== 'user') return

    setInput(msgToEdit.content) // Rimette il testo nell'input
    setMessages(prev => prev.slice(0, index)) // Cancella da lì in poi
    textareaRef.current?.focus() // Focus sulla casella
  }

  // Loaders ed Effects (Sessioni, URL, Modelli)
  useEffect(() => {
    const sessionId = searchParams.get('session')
    if (sessionId && sessionId !== currentSessionId && token) {
      loadSession(sessionId)
    } else if (!sessionId && currentSessionId) {
      startNewChat()
    }
  }, [searchParams, token])

  useEffect(() => {
    const handlePopState = () => {
      const sessionId = new URLSearchParams(window.location.search).get('session')
      if (!sessionId) startNewChat()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const extractCodeBlocks = (content: string): string[] => {
    const codeBlockRegex = /```[\s\S]*?```/g
    const matches = content.match(codeBlockRegex)
    if (!matches) return []
    return matches.map(block => block.replace(/```\w*\n?|```/g, '').trim())
  }

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "[https://ai-platform.dffm.it/api/v1](https://ai-platform.dffm.it/api/v1)"
        const res = await fetch(`${apiUrl}/models`)
        if (res.ok) {
          const data = await res.json()
          setPresets(data)
          if (data.length > 0) setSelectedPreset(data[0].name)
        } else {
          setPresets([{ name: "default", model_name: "Modello Base", category: "chat" }])
          setSelectedPreset("default")
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchModels()
  }, [])

  const fetchSessions = async () => {
    if (!token) return
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "[http://192.168.1.244:8000/api/v1](http://192.168.1.244:8000/api/v1)"
      const res = await fetch(`${apiUrl}/chat/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSessions(data)
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => { fetchSessions() }, [token])

  const loadSession = async (sessionId: string) => {
    if (!token) return
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "[http://192.168.1.244:8000/api/v1](http://192.168.1.244:8000/api/v1)"
      const res = await fetch(`${apiUrl}/chat/sessions/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setCurrentSessionId(sessionId)
        setShowSidebar(false)
      }
    } catch (e) { console.error(e) }
  }

  const startNewChat = () => {
    setMessages([])
    setCurrentSessionId(null)
    setShowSidebar(false)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // --- HANDLE SEND (CON ABORT CONTROLLER) ---
  const handleSend = async () => {
    if (!input.trim() || (isLoading && !abortControllerRef.current) || !token) return

    // 1. Setup Abort Controller
    const controller = new AbortController()
    abortControllerRef.current = controller

    const userMsg: Message = { role: "user", content: input }
    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)
    setMessages((prev) => [...prev, { role: "assistant", content: "" }])

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "[http://192.168.1.244:8000/api/v1](http://192.168.1.244:8000/api/v1)"

      let sessionId = currentSessionId
      if (!sessionId) {
        const sessionRes = await fetch(`${apiUrl}/chat/sessions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            title: input.slice(0, 50) + (input.length > 50 ? "..." : "")
          })
        })
        if (sessionRes.ok) {
          const session = await sessionRes.json()
          sessionId = session.id
          setCurrentSessionId(sessionId)
          await fetchSessions()
        }
      }

      const response = await fetch(`${apiUrl}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          preset_name: selectedPreset,
          messages: [...messages, userMsg],
          use_rag: useRAG,
          temperature: 0.7,
          session_id: sessionId
        }),
        signal: controller.signal // <--- Passiamo il segnale per lo stop
      })

      if (!response.body) throw new Error("No response")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let assistantResponse = ""

      while (!done) {
        const { value, done: doneReading } = await reader.read()
        done = doneReading
        const chunkValue = decoder.decode(value)
        const lines = chunkValue.split("\n\n")

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6)
            if (data === "[DONE]") break

            try {
              const parsed = JSON.parse(data)

              // --- FIX [object Object] ---
              if (typeof parsed === 'object' && parsed !== null) {
                // Controlliamo i nomi standard usati dalle API (Ollama usa 'response')
                const textChunk = parsed.response || parsed.content || (parsed.message && parsed.message.content) || "";
                assistantResponse += textChunk
              } else {
                // Se per caso è già una stringa
                assistantResponse += parsed
              }
              // ---------------------------

            } catch {
              // Se non è JSON valido, lo aggiungiamo così com'è
              assistantResponse += data
            }

            setMessages((prev) => {
              const newMsgs = [...prev]
              newMsgs[newMsgs.length - 1].content = assistantResponse

              // Logica estrazione codice (lasciata invariata)
              if (selectedPreset.includes('coder') || selectedPreset.includes('Qwen')) {
                const codeBlocks = extractCodeBlocks(assistantResponse)
                if (codeBlocks.length > 0) {
                  const newVersions = codeBlocks.map((code, idx) => ({
                    id: `${Date.now()}-${idx}`,
                    code,
                    timestamp: new Date(),
                    description: `Code block ${idx + 1} from ${selectedPreset}`
                  }))
                  setCodeVersions(prev => [...prev, ...newVersions])
                  setShowVersionPanel(true)
                }
              }
              return newMsgs
            })
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("Generazione interrotta dall'utente")
      } else {
        setMessages((prev) => [...prev, { role: "system", content: "Errore di connessione." }])
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  return (
    <>
      <CodeVersionPanel
        isOpen={showVersionPanel}
        onClose={() => setShowVersionPanel(false)}
        versions={codeVersions}
      />

      {/* SFONDO SCURO */}
      <div className="flex h-[calc(100vh-4rem)] bg-[#131314] text-gray-200 font-sans">

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-64 bg-[#1E1F20] border-r border-white/10 flex flex-col">
            <div className="p-4 border-b border-white/10">
              <Button
                onClick={startNewChat}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nuova Chat
              </Button>
            </div>
            <ScrollArea className="flex-1 p-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => loadSession(session.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg mb-1 hover:bg-white/5 transition-colors",
                    currentSessionId === session.id && "bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium truncate">{session.title}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {session.message_count} messaggi • {new Date(session.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 flex flex-col">

          {/* Top Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowSidebar(!showSidebar)}
                className="w-8 h-8 text-gray-400 hover:text-white"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Image
                src="/logo2.png"
                alt="DFFM Logo"
                width={150}
                height={50}
                className="ml-2 object-contain"
                priority
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger className="w-[180px] h-8 bg-transparent border-none text-gray-300 font-medium focus:ring-0">
                  <SelectValue placeholder="Scegli Modello" />
                </SelectTrigger>
                <SelectContent className="bg-[#1E1F20] border-[#3C4043] text-gray-200">
                  {presets
                    .filter(m => m.model_name !== 'fara7b:latest')
                    .map(m => (
                      <SelectItem key={m.name} value={m.name}>
                        {m.display_name || m.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="rag" className="text-xs text-gray-400 font-medium cursor-pointer">RAG</Label>
                <Switch id="rag" checked={useRAG} onCheckedChange={setUseRAG} className="data-[state=checked]:bg-blue-500" />
              </div>
            </div>
          </div>

          {/* Area Messaggi */}
          <ScrollArea className="flex-1 px-4 py-6">
            <div className="max-w-3xl mx-auto space-y-8">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center mt-32 opacity-30">
                  <Sparkles className="w-16 h-16 mb-4" />
                  <p className="text-xl font-medium">Come posso aiutarti oggi?</p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-4 group", msg.role === "user" ? "justify-end" : "justify-start")}>

                  {/* EDIT BUTTON (Solo per User, appare in Hover) */}
                  {msg.role === "user" && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center mr-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-gray-500 hover:text-white hover:bg-white/10"
                        onClick={() => handleEdit(i)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  )}

                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-5 py-3 text-base leading-relaxed overflow-hidden",
                    msg.role === "user"
                      ? "bg-[#282A2C] text-white rounded-br-sm"
                      : "bg-transparent text-gray-100 pl-0"
                  )}>
                    {/* Renderizzatore Markdown Custom */}
                    <MessageContent content={msg.content} />
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 pb-6">
            <div className="max-w-3xl mx-auto bg-[#1E1F20] rounded-3xl p-2 pl-4 flex items-end gap-2 border border-white/5 focus-within:border-white/20 transition-colors">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Scrivi un messaggio... (Shift+Enter per a capo)"
                className="flex-1 bg-transparent border-none resize-none text-gray-200 placeholder:text-gray-500 focus:outline-none max-h-[200px] overflow-y-auto py-3"
                style={{
                  minHeight: '44px',
                  lineHeight: '1.5'
                }}
                rows={1}
              />
              <Button
                size="icon"
                onClick={isLoading ? stopGeneration : handleSend}
                disabled={!isLoading && !input.trim()}
                className={cn(
                  "w-10 h-10 rounded-full mb-1 transition-all",
                  isLoading
                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/50"
                    : input.trim() ? "bg-white text-black hover:bg-gray-200" : "bg-[#2C2D2E] text-gray-500"
                )}
              >
                {isLoading ? (
                  <Square className="w-4 h-4 fill-current" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-500">L'IA può commettere errori. Verifica le informazioni importanti.</p>
            </div>
          </div>

          {/* Toggle Code Panel */}
          {codeVersions.length > 0 && !showVersionPanel && (
            <button
              onClick={() => setShowVersionPanel(true)}
              className="fixed bottom-24 right-6 w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
            >
              <Code2 className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
      </div>
    </>
  )
}