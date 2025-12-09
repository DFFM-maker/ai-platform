/**
 * MODIFICATO: 2025-12-07
 * - Applicato tema ChatGPT su toolbar e sidebar Copilot
 * - Sfondo principale #131314, card #1E1F20
 * - Aggiornati colori bottoni e output area
 */

"use client"

import { useState } from "react"
import Editor, { OnMount } from "@monaco-editor/react"
import { Play, Code2, Loader2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CodeEditor() {
  const [language, setLanguage] = useState("python")
  const [code, setCode] = useState("// Scrivi qui il tuo codice...")
  const [output, setOutput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)

  const handleAIGenerate = async (instruction: string) => {
    setIsGenerating(true)
    setOutput("Generazione in corso con Qwen...")
    // Logica fittizia per demo, collegare al backend come ChatInterface
    setTimeout(() => {
        setOutput("# Codice generato da Qwen 2.5\ndef hello():\n    print('Hello World')")
        setIsGenerating(false)
    }, 1500)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[#131314]">
      <div className="flex-1 flex flex-col border-r border-white/10 bg-[#1e1e1e]">
        <div className="flex items-center justify-between p-2 border-b border-white/10 bg-[#1E1F20]">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[120px] h-8 bg-[#3c3c3c] border-none text-white text-xs">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="ghost" className="h-8 text-green-400 hover:bg-white/5">
            <Play className="w-3 h-3 mr-2" /> Run
          </Button>
        </div>
        <Editor
          height="100%"
          theme="vs-dark"
          language={language}
          value={code}
          onChange={(val) => setCode(val || "")}
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>
      <div className="w-[300px] bg-[#1E1F20] flex flex-col border-l border-white/10 p-4">
        <h3 className="font-semibold mb-4 flex gap-2 text-gray-200"><Sparkles className="w-4 h-4 text-purple-400"/> Copilot</h3>
        <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start text-gray-300 border-white/10 hover:bg-[#2F2F2F]" onClick={() => handleAIGenerate("Spiega")}>Spiega Codice</Button>
            <Button variant="outline" className="w-full justify-start text-gray-300 border-white/10 hover:bg-[#2F2F2F]" onClick={() => handleAIGenerate("Refactor")}>Refactor</Button>
        </div>
        <div className="mt-4 flex-1 bg-[#131314] border border-white/10 rounded p-2 text-xs font-mono whitespace-pre-wrap text-gray-300">
            {output}
        </div>
      </div>
    </div>
  )
}
