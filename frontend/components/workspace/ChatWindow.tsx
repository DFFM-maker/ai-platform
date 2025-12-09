'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Code2, RefreshCw, Terminal } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Preset {
  id: string;
  name: string;
  model: string;
}

// Preset presi dal tuo DB (hardcoded per ora per test rapido)
const PRESETS: Preset[] = [
  { id: 'dev_iot_automation', name: 'IoT Automation Dev (Qwen)', model: 'qwen2.5-coder:7b' },
  { id: 'chat_ita_default', name: 'Chat Italiano (Fara)', model: 'fara7b:latest' },
  { id: 'rag_analyst', name: 'Analista Documenti (RAG)', model: 'llama3:8b-q4_K_M' },
];

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<Preset>(PRESETS[0]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // URL API pubblico
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.244:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Placeholder per la risposta assistente
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${API_URL}/api/v1/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedPreset.model, 
          messages: [...messages, userMsg],
          temperature: 0.2 
        }),
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let assistantResponse = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value);
        
        // Parsing SSE manuale
        const lines = chunkValue.split('\n\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') break;
            assistantResponse += data;
            
            // Aggiorna ultimo messaggio in tempo reale
            setMessages(prev => {
              const newMsgs = [...prev];
              newMsgs[newMsgs.length - 1].content = assistantResponse;
              return newMsgs;
            });
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Errore di connessione col backend.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-40px)] w-full max-w-6xl mx-auto bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
      
      {/* Header Chat */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="text-sky-500 w-5 h-5" />
          <span className="font-semibold text-slate-200">AI Workspace</span>
        </div>
        
        {/* Model Selector */}
        <select 
          className="bg-slate-800 text-slate-300 text-sm rounded-md px-3 py-1 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          value={selectedPreset.id}
          onChange={(e) => {
            const preset = PRESETS.find(p => p.id === e.target.value);
            if (preset) setSelectedPreset(preset);
          }}
        >
          {PRESETS.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Area Messaggi */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-950">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4">
            <Code2 className="w-16 h-16 opacity-20" />
            <p>Seleziona un preset e inizia a programmare.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-sky-900/50 flex items-center justify-center border border-sky-800 shrink-0">
                <Bot className="w-5 h-5 text-sky-400" />
              </div>
            )}
            
            <div className={`
              max-w-[85%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm
              ${msg.role === 'user' 
                ? 'bg-sky-600 text-white rounded-br-none' 
                : 'bg-slate-900 text-slate-300 border border-slate-800 rounded-bl-none font-mono'}
            `}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-slate-300" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            className="flex-1 bg-slate-950 text-slate-200 rounded-lg px-4 py-3 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-600"
            placeholder="Scrivi qui il tuo prompt..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-sky-600 hover:bg-sky-500 text-white rounded-lg px-5 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
        <div className="text-center mt-2">
           <span className="text-[10px] text-slate-600">
             Running on {selectedPreset.model} • Local Inference (LAN)
           </span>
        </div>
      </div>

    </div>
  );
}
