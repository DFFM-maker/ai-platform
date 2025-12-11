'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';

interface CodeVersion {
  id: string;
  content: string; // Modificato da 'code' a 'content'
  timestamp: Date;
  description: string;
}

interface CodeVersionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  versions: CodeVersion[];
}

export default function CodeVersionPanel({ isOpen, onClose, versions }: CodeVersionPanelProps) {
  const [currentVersion, setCurrentVersion] = useState(versions.length - 1);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (versions[currentVersion]) {
      await navigator.clipboard.writeText(versions[currentVersion].content); // Usa 'content'
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen || versions.length === 0) return null;

  const version = versions[currentVersion];

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-[#1E1F20] border-l border-[#2F2F2F] flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#2F2F2F]">
        <h3 className="text-sm font-semibold text-white">Code Versions</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Version Navigator */}
      <div className="flex items-center justify-between p-3 bg-[#131314] border-b border-[#2F2F2F]">
        <button
          onClick={() => setCurrentVersion(Math.max(0, currentVersion - 1))}
          disabled={currentVersion === 0}
          className="p-1 rounded hover:bg-[#2F2F2F] disabled:opacity-30 disabled:cursor-not-allowed text-white"
        >
          <ChevronLeft size={18} />
        </button>
        
        <span className="text-xs text-gray-400">
          Version {currentVersion + 1} of {versions.length}
        </span>
        
        <button
          onClick={() => setCurrentVersion(Math.min(versions.length - 1, currentVersion + 1))}
          disabled={currentVersion === versions.length - 1}
          className="p-1 rounded hover:bg-[#2F2F2F] disabled:opacity-30 disabled:cursor-not-allowed text-white"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Description */}
      <div className="p-3 border-b border-[#2F2F2F]">
        <p className="text-xs text-gray-400">{version.description}</p>
        <p className="text-xs text-gray-500 mt-1">
          {version.timestamp.toLocaleTimeString()}
        </p>
      </div>

      {/* Code Display */}
      <div className="flex-1 overflow-auto p-4 bg-[#131314]">
        <div className="relative group">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-2 rounded bg-[#2F2F2F] hover:bg-[#3F3F3F] opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
          </button>
          <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
            <code style={{ whiteSpace: 'pre-wrap' }}>{version.content}</code>
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-[#2F2F2F] flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 px-4 py-2 bg-[#2F2F2F] hover:bg-[#3F3F3F] rounded text-sm text-white transition-colors"
        >
          Copy Code
        </button>
        <button
          onClick={() => {/* Apply code to editor */}}
          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm text-white transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
