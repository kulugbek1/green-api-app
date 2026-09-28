"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FormEvent, useEffect, useRef, useState } from "react"
import { useChats } from "@/lib/chats-context"

function Avatar({ name }: { name: string }) {
  const letter = name.trim().charAt(0).toUpperCase() || "#"
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#5b8def] text-sm font-semibold text-white">
      {letter}
    </div>
  )
}

export function ChatSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { chats, createChat, ready } = useChats()
  const [phone, setPhone] = useState("")
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showPopup) {
      inputRef.current?.focus()
    }
  }, [showPopup])

  const closePopup = () => {
    setShowPopup(false)
    setError("")
    setPhone("")
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError("")
    setCreating(true)

    try {
      const chatId = await createChat(phone)
      closePopup()
      router.push(`/chats/${encodeURIComponent(chatId)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create chat")
    } finally {
      setCreating(false)
    }
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-[#d7dde5] bg-[#f4f6f8] md:w-[340px]">
      <header className="flex items-center justify-between gap-3 border-b border-[#d7dde5] px-4 py-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-[#1b2430]">
            Telegram
          </p>
          <p className="text-xs text-[#6b7785]">GREEN-API</p>
        </div>
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          aria-label="New chat"
          className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#2a6df4] text-lg leading-none text-white transition hover:bg-[#1f5ad1]"
        >
          +
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!ready ? (
          <p className="px-4 py-6 text-sm text-[#6b7785]">Loading...</p>
        ) : chats.length === 0 ? (
          <p className="px-4 py-6 text-sm leading-relaxed text-[#6b7785]">
            No chats yet. Press + to start messaging.
          </p>
        ) : (
          chats.map((chat) => {
            const href = `/chats/${encodeURIComponent(chat.id)}`
            const active = pathname === href

            return (
              <Link
                key={chat.id}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 transition ${
                  active ? "bg-white" : "hover:bg-[#e9eef3]"
                }`}
              >
                <Avatar name={chat.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-[#1b2430]">
                      {chat.name}
                    </p>
                    {chat.updatedAt > 0 && (
                      <span className="shrink-0 text-[11px] text-[#8a95a3]">
                        {new Date(chat.updatedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[#6b7785]">
                    {chat.lastMessage || "No messages yet"}
                  </p>
                </div>
              </Link>
            )
          })
        )}
      </div>

      {showPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1b2430]/35 p-4"
          onClick={closePopup}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_16px_40px_rgba(27,36,48,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#1b2430]">New chat</h2>
            <p className="mt-1 text-sm text-[#6b7785]">
              Enter a phone number or Telegram @username.
            </p>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <input
                ref={inputRef}
                type="text"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="79991234567 or @username"
                className="w-full rounded-xl border border-[#c9d2dc] bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-[#9aa5b1] focus:border-[#2a6df4] focus:ring-2 focus:ring-[#2a6df4]/20"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closePopup}
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-[#5b6573] transition hover:bg-[#e7ebf0]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !phone.trim()}
                  className="flex-1 rounded-xl bg-[#2a6df4] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#1f5ad1] disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Start"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}
