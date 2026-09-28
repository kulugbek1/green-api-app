"use client"

import { ChatSidebar } from "@/components/chat-sidebar"

export default function ChatsPage() {
  return (
    <>
      <div className="h-full md:hidden">
        <ChatSidebar />
      </div>
      <div className="hidden h-full items-center justify-center bg-[#ebeff3] md:flex">
        <div className="max-w-sm px-6 text-center">
          <p className="text-xl font-semibold tracking-tight text-[#1b2430]">
            Select a chat
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#6b7785]">
            Choose a conversation on the left or start a new chat with a phone
            number.
          </p>
        </div>
      </div>
    </>
  )
}
