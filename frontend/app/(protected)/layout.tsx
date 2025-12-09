/**
 * MODIFICATO: 2025-12-07
 * - Applicato colore sfondo ChatGPT (#131314)
 * - Unificato tema su tutto il layout protetto
 */

import { AppSidebar } from "@/components/workspace/AppSidebar"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#131314] text-[#ececec]">
      {/* Sidebar Fissa a sinistra */}
      <AppSidebar />
      
      {/* Area Contenuto Principale */}
      <main className="flex-1 overflow-auto relative flex flex-col bg-[#131314]">
        {children}
      </main>
    </div>
  )
}
