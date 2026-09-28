"use client"

import Link from "next/link"
import { use } from "react"
import { ChatWindow } from "@/components/chat-window"

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const chatId = decodeURIComponent(id)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[#d7dde5] bg-[#f7f9fb] px-3 py-2 md:hidden">
        <Link
          href="/chats"
          className="text-sm font-medium text-[#2a6df4] transition hover:text-[#1f5ad1]"
        >
          ← Chats
        </Link>
      </div>
      <div className="min-h-0 flex-1">
        <ChatWindow chatId={chatId} />
      </div>
    </div>
  )
}
