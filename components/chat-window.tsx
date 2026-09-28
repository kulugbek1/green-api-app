"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { useChats } from "@/lib/chats-context"

function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "#"
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5b8def] text-sm font-semibold text-white">
      {letter}
    </div>
  )
}

export function ChatWindow({ chatId }: { chatId: string }) {
  const { chats, getChatMessages, sendMessage, ready } = useChats()
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const chat = chats.find((item) => item.id === chatId)
  const messages = getChatMessages(chatId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, chatId])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim() || sending) return

    setError("")
    setSending(true)
    const draft = text
    setText("")

    try {
      await sendMessage(chatId, draft)
    } catch {
      setText(draft)
      setError("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[#6b7785]">
        Loading...
      </div>
    )
  }

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#6b7785]">
        Chat not found. Create a new chat from the sidebar.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col bg-[#ebeff3]">
      <header className="flex items-center gap-3 border-b border-[#d7dde5] bg-[#f7f9fb] px-4 py-3">
        <Avatar name={chat.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[#1b2430]">
            {chat.name}
          </p>
          <p className="truncate text-xs text-[#6b7785]">+{chat.phone}</p>
        </div>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#6b7785]">
            Write a message to start the conversation.
          </p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm ${
                  message.fromMe
                    ? "rounded-br-md bg-[#2a6df4] text-white"
                    : "rounded-bl-md bg-white text-[#1b2430]"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    message.fromMe ? "text-white/70" : "text-[#8a95a3]"
                  }`}
                >
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[#d7dde5] bg-[#f7f9fb] p-3"
      >
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            rows={1}
            placeholder="Message"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-[#c9d2dc] bg-white px-3.5 py-3 text-sm outline-none transition placeholder:text-[#9aa5b1] focus:border-[#2a6df4] focus:ring-2 focus:ring-[#2a6df4]/20"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="h-11 shrink-0 rounded-2xl bg-[#2a6df4] px-4 text-sm font-medium text-white transition hover:bg-[#1f5ad1] disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
