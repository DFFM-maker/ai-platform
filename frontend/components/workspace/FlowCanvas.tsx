/**
 * MODIFICATO: 2025-12-07
 * - Convertito da zinc a palette ChatGPT (#131314, #1E1F20, #2F2F2F)
 * - Aggiornati Controls, MiniMap e Background con tema unificato
 * - Toolbar con stile coerente
 */

"use client"

import { useState, useCallback } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Button } from '@/components/ui/button'
import { Plus, Save } from 'lucide-react'

// Definizione nodi iniziali
const initialNodes: Node[] = [
  { id: '1', position: { x: 250, y: 100 }, data: { label: 'Input Utente' }, type: 'input' },
  { id: '2', position: { x: 250, y: 250 }, data: { label: 'LLM Processing (Qwen)' } },
  { id: '3', position: { x: 250, y: 400 }, data: { label: 'Output JSON' }, type: 'output' },
]

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3' },
]

export function FlowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  )

  const addNode = () => {
    const newNode: Node = {
      id: Math.random().toString(),
      data: { label: `Nuovo Nodo` },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
    }
    setNodes((nds) => nds.concat(newNode))
  }

  return (
    <div className="h-[calc(100vh-4rem)] w-full relative bg-[#131314]">
      {/* Toolbar Semplice */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Button size="sm" onClick={addNode} className="gap-2 bg-[#1E1F20] text-gray-200 hover:bg-[#2F2F2F] border-white/10">
          <Plus className="w-4 h-4" /> Aggiungi Nodo
        </Button>
        <Button size="sm" variant="outline" className="gap-2 bg-[#1E1F20] text-gray-200 border-white/10 hover:bg-[#2F2F2F]">
          <Save className="w-4 h-4" /> Salva Workflow
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-[#131314]"
      >
        <Controls className="bg-[#1E1F20] border-white/10 fill-gray-200" />
        <MiniMap 
            className="bg-[#1E1F20] border-white/10" 
            nodeColor={() => '#3b82f6'} 
            maskColor="rgba(19, 19, 20, 0.6)"
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#2F2F2F" />
      </ReactFlow>
    </div>
  )
}
