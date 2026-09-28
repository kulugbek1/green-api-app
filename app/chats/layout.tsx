"use client"

import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatsProvider } from "@/lib/chats-context"

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ChatsProvider>
      <div className="flex h-full overflow-hidden bg-[#dfe6ee]">
        <div className="hidden h-full md:block">
          <ChatSidebar />
        </div>
        <div className="h-full min-w-0 flex-1">{children}</div>
      </div>
    </ChatsProvider>
  )
}
