/**
 * MODIFICATO: 2025-12-07
 * - Convertito da slate-950 a palette ChatGPT (#131314, #1E1F20, #2F2F2F)
 * - Aggiornati colori icone da sky a blue-400
 * - Uniformato stile card documenti e messaggi di stato
 */

'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';

export default function DocumentsPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{type: 'success'|'error', text: string} | null>(null);
  
  // URL pubblico API
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.244:8000';

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/documents/`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (e) {
      console.error("Failed to fetch docs", e);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const res = await fetch(`${API_URL}/api/v1/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Upload failed');
      }
      
      const data = await res.json();
      setMessage({ type: 'success', text: `Indicizzato: ${data.filename} (${data.chunks_processed} chunks)` });
      fetchDocuments(); // Aggiorna la lista
    } catch (error: any) {
      setMessage({ type: 'error', text: `Errore: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#131314] p-8 text-gray-200">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Database className="text-blue-400" />
          Knowledge Base (RAG)
        </h1>

        {/* Upload Area */}
        <div className="border-2 border-dashed border-white/10 bg-[#1E1F20] rounded-xl p-12 text-center hover:bg-[#2F2F2F] hover:border-blue-500/50 transition-all relative group cursor-pointer">
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          />
          <div className="flex flex-col items-center gap-4 pointer-events-none">
            {uploading ? (
              <div className="flex flex-col items-center animate-pulse">
                <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4" />
                <span className="text-blue-300">Lettura PDF & Calcolo Vettori in corso...</span>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 bg-[#2F2F2F] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-medium text-gray-200">Trascina qui i tuoi manuali PDF</p>
                  <p className="text-sm text-gray-500 mt-2">Max 100MB • Elaborazione locale su GPU</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 border ${message.type === 'success' ? 'bg-green-900/20 border-green-700/50 text-green-300' : 'bg-red-900/20 border-red-700/50 text-red-300'}`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* File List */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-gray-200">
            <FileText className="w-5 h-5 text-gray-400" />
            Documenti Indicizzati
          </h2>
          <div className="grid gap-3">
            {files.length === 0 ? (
              <div className="text-center p-8 bg-[#1E1F20] rounded-lg border border-white/10 border-dashed">
                <p className="text-gray-500 italic">Nessun documento nel Vector DB.</p>
              </div>
            ) : (
              files.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-[#1E1F20] border border-white/10 rounded-lg hover:bg-[#2F2F2F] hover:border-white/20 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#2F2F2F] rounded flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-200">{f.filename}</p>
                      <p className="text-xs text-gray-500 font-mono">ID: {f.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-700/50">
                    Active
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
