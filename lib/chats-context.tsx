"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useRouter } from "next/navigation"
import {
  checkAccount,
  deleteNotification,
  extractMessageText,
  formatPhoneDisplay,
  lastIncomingMessages,
  normalizePhone,
  receiveNotification,
  sendMessage as apiSendMessage,
  type JournalMessage,
} from "@/lib/green-api"
import {
  clearSessionData,
  getChats,
  getCredentials,
  getMessages,
  saveChats,
  saveMessages,
} from "@/lib/storage"
import type { Chat, Credentials, Message, NotificationBody } from "@/lib/types"

type ChatsContextValue = {
  credentials: Credentials | null
  chats: Chat[]
  ready: boolean
  createChat: (input: string) => Promise<string>
  getChatMessages: (chatId: string) => Message[]
  sendMessage: (chatId: string, text: string) => Promise<void>
  logout: () => void
}

const ChatsContext = createContext<ChatsContextValue | null>(null)

function upsertChat(chats: Chat[], next: Chat): Chat[] {
  const without = chats.filter((chat) => chat.id !== next.id)
  return [next, ...without].sort((a, b) => b.updatedAt - a.updatedAt)
}

function appendMessage(messages: Message[], message: Message): Message[] {
  if (messages.some((item) => item.id === message.id)) {
    return messages
  }
  return [...messages, message]
}

function findRelatedChat(
  chats: Chat[],
  chatId: string,
  phone: string
): Chat | undefined {
  return (
    chats.find((chat) => chat.id === chatId) ||
    (phone
      ? chats.find(
          (chat) =>
            chat.phone === phone ||
            chat.id === `${phone}@c.us` ||
            chat.id === phone
        )
      : undefined)
  )
}

export function ChatsProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [ready, setReady] = useState(false)
  const chatsRef = useRef(chats)
  const messagesRef = useRef(messages)

  useEffect(() => {
    chatsRef.current = chats
  }, [chats])

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  useEffect(() => {
    const stored = getCredentials()
    if (!stored) {
      router.replace("/auth")
      return
    }

    setCredentials(stored)
    setChats(getChats())
    setMessages(getMessages())
    setReady(true)
  }, [router])

  const persistChats = useCallback((next: Chat[]) => {
    setChats(next)
    saveChats(next)
  }, [])

  const persistMessages = useCallback((next: Message[]) => {
    setMessages(next)
    saveMessages(next)
  }, [])

  const applyIncomingMessage = useCallback(
    (params: {
      chatId: string
      text: string
      messageId: string
      timestamp: number
      fromMe: boolean
      phone?: string
      name?: string
    }) => {
      const {
        chatId: remoteChatId,
        text,
        messageId,
        timestamp,
        fromMe,
        phone = "",
        name,
      } = params

      const related = findRelatedChat(chatsRef.current, remoteChatId, phone)
      const previousId = related?.id
      const chatId = remoteChatId

      let nextChats = chatsRef.current
      if (previousId && previousId !== chatId) {
        nextChats = nextChats.filter(
          (chat) => chat.id !== previousId && chat.id !== chatId
        )
      }

      const nextChat: Chat = {
        id: chatId,
        phone: related?.phone || phone,
        name:
          related?.name ||
          name ||
          (phone ? formatPhoneDisplay(phone) : chatId),
        lastMessage: text,
        updatedAt: timestamp,
      }

      nextChats = upsertChat(nextChats, nextChat)
      persistChats(nextChats)

      let nextMessages = messagesRef.current
      if (previousId && previousId !== chatId) {
        nextMessages = nextMessages.map((message) =>
          message.chatId === previousId ? { ...message, chatId } : message
        )
      }

      persistMessages(
        appendMessage(nextMessages, {
          id: messageId,
          chatId,
          text,
          timestamp,
          fromMe,
        })
      )

      if (
        typeof window !== "undefined" &&
        previousId &&
        previousId !== chatId
      ) {
        const currentPath = window.location.pathname
        const oldPath = `/chats/${encodeURIComponent(previousId)}`
        if (currentPath === oldPath) {
          router.replace(`/chats/${encodeURIComponent(chatId)}`)
        }
      }
    },
    [persistChats, persistMessages, router]
  )

  const handleIncoming = useCallback(
    (body: NotificationBody, fromMe: boolean) => {
      const remoteChatId = body.senderData?.chatId
      const text = extractMessageText(body)
      if (!remoteChatId || !text) return

      const timestamp = (body.timestamp ?? Math.floor(Date.now() / 1000)) * 1000
      const messageId =
        body.idMessage ?? `${remoteChatId}-${timestamp}-${fromMe ? "out" : "in"}`
      const phone =
        body.senderData?.senderPhoneNumber != null
          ? String(body.senderData.senderPhoneNumber)
          : normalizePhone(remoteChatId.replace("@c.us", ""))
      const name =
        body.senderData?.chatName ||
        body.senderData?.senderContactName ||
        body.senderData?.senderName

      applyIncomingMessage({
        chatId: remoteChatId,
        text,
        messageId,
        timestamp,
        fromMe,
        phone,
        name,
      })
    },
    [applyIncomingMessage]
  )

  const handleJournalMessage = useCallback(
    (item: JournalMessage) => {
      if (item.typeMessage !== "textMessage" || !item.chatId || !item.textMessage) {
        return
      }

      applyIncomingMessage({
        chatId: String(item.chatId),
        text: item.textMessage,
        messageId: item.idMessage ?? `${item.chatId}-${item.timestamp}-in`,
        timestamp: (item.timestamp ?? Math.floor(Date.now() / 1000)) * 1000,
        fromMe: false,
        name: item.senderContactName || item.senderName,
      })
    },
    [applyIncomingMessage]
  )

  // Telegram HTTP API: ReceiveNotification + DeleteNotification
  useEffect(() => {
    if (!credentials || !ready) return

    const controller = new AbortController()

    const poll = async () => {
      while (!controller.signal.aborted) {
        try {
          const notification = await receiveNotification(
            credentials,
            5,
            controller.signal
          )
          if (controller.signal.aborted) break

          if (!notification?.receiptId || !notification.body) {
            continue
          }

          const { receiptId, body } = notification
          const type = body.typeWebhook

          if (
            type === "incomingMessageReceived" ||
            type === "outgoingMessageReceived" ||
            type === "outgoingAPIMessageReceived"
          ) {
            handleIncoming(body, type !== "incomingMessageReceived")
          }

          try {
            await deleteNotification(credentials, receiptId)
          } catch (error) {
            console.error("Failed to delete notification", error)
          }
        } catch (error) {
          if (controller.signal.aborted) break
          if (error instanceof DOMException && error.name === "AbortError") {
            break
          }
          console.error("Notification poll error:", error)
          await new Promise((resolve) => setTimeout(resolve, 3000))
        }
      }
    }

    poll()

    return () => {
      controller.abort()
    }
  }, [credentials, ready, handleIncoming])

  // Telegram fallback: sync lastIncomingMessages journal
  useEffect(() => {
    if (!credentials || !ready) return

    const controller = new AbortController()

    const syncJournal = async () => {
      try {
        const items = await lastIncomingMessages(credentials, 1440, controller.signal)
        if (controller.signal.aborted) return
        // Journal is newest-first; apply oldest-first so order stays natural.
        ;[...items].reverse().forEach(handleJournalMessage)
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof DOMException && error.name === "AbortError") return
        console.error("Journal sync error:", error)
      }
    }

    syncJournal()
    const intervalId = window.setInterval(syncJournal, 8000)

    return () => {
      controller.abort()
      window.clearInterval(intervalId)
    }
  }, [credentials, ready, handleJournalMessage])

  const createChat = useCallback(
    async (rawInput: string) => {
      if (!credentials) {
        throw new Error("Not authenticated")
      }

      const input = rawInput.trim()
      if (!input) {
        throw new Error("Enter a phone number or @username")
      }

      const isUsername = input.startsWith("@") || /^[A-Za-z][\w\d_]{4,}$/.test(input)
      const phone = isUsername ? "" : normalizePhone(input)

      if (!isUsername && phone.length < 10) {
        throw new Error("Enter a valid phone number or Telegram @username")
      }

      // Telegram requires a real chatId from CheckAccount (not phone@c.us).
      const result = await checkAccount(
        credentials,
        isUsername
          ? { username: input.startsWith("@") ? input : `@${input}` }
          : { phoneNumber: phone }
      )

      if (!result?.exist || !result.chatId) {
        throw new Error(
          isUsername
            ? "This Telegram username was not found"
            : "This number is not registered in Telegram (or is hidden by privacy settings)"
        )
      }

      const chatId = String(result.chatId)
      const resolvedPhone =
        result.phoneNumber != null ? String(result.phoneNumber) : phone
      const displayName =
        result.username ||
        (resolvedPhone ? formatPhoneDisplay(resolvedPhone) : chatId)

      const existing = findRelatedChat(chatsRef.current, chatId, resolvedPhone)
      if (existing) {
        if (existing.id !== chatId) {
          const migrated = chatsRef.current
            .filter((chat) => chat.id !== existing.id)
            .concat({
              ...existing,
              id: chatId,
              phone: resolvedPhone || existing.phone,
              name: displayName,
            })
          persistChats(
            migrated.sort((a, b) => b.updatedAt - a.updatedAt)
          )
          persistMessages(
            messagesRef.current.map((message) =>
              message.chatId === existing.id
                ? { ...message, chatId }
                : message
            )
          )
        }
        return chatId
      }

      const nextChat: Chat = {
        id: chatId,
        phone: resolvedPhone,
        name: displayName,
        lastMessage: "",
        updatedAt: Date.now(),
      }

      persistChats(upsertChat(chatsRef.current, nextChat))
      return chatId
    },
    [credentials, persistChats, persistMessages]
  )

  const getChatMessages = useCallback(
    (chatId: string) =>
      messages
        .filter((message) => message.chatId === chatId)
        .sort((a, b) => a.timestamp - b.timestamp),
    [messages]
  )

  const sendMessage = useCallback(
    async (chatId: string, text: string) => {
      if (!credentials) {
        throw new Error("Not authenticated")
      }

      const trimmed = text.trim()
      if (!trimmed) return

      const result = await apiSendMessage(credentials, chatId, trimmed)
      const timestamp = Date.now()
      const messageId = result.idMessage ?? `${chatId}-${timestamp}-out`

      persistMessages(
        appendMessage(messagesRef.current, {
          id: messageId,
          chatId,
          text: trimmed,
          timestamp,
          fromMe: true,
        })
      )

      const chat = chatsRef.current.find((item) => item.id === chatId)
      if (chat) {
        persistChats(
          upsertChat(chatsRef.current, {
            ...chat,
            lastMessage: trimmed,
            updatedAt: timestamp,
          })
        )
      }
    },
    [credentials, persistChats, persistMessages]
  )

  const logout = useCallback(() => {
    clearSessionData()
    router.replace("/auth")
  }, [router])

  const value = useMemo(
    () => ({
      credentials,
      chats,
      ready,
      createChat,
      getChatMessages,
      sendMessage,
      logout,
    }),
    [credentials, chats, ready, createChat, getChatMessages, sendMessage, logout]
  )

  return <ChatsContext.Provider value={value}>{children}</ChatsContext.Provider>
}

export function useChats() {
  const context = useContext(ChatsContext)
  if (!context) {
    throw new Error("useChats must be used within ChatsProvider")
  }
  return context
}
