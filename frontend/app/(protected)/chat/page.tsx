import { Suspense } from "react"
import { ChatInterface } from "@/components/workspace/ChatInterface"

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <ChatInterface />
    </Suspense>
  )
}
