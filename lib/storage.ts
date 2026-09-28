import type { Chat, Credentials, Message } from "./types"
import { buildApiUrl } from "./green-api"

const CREDENTIALS_KEY = "green-api-credentials"
const CHATS_KEY = "green-api-chats"
const MESSAGES_KEY = "green-api-messages"

export function getCredentials(): Credentials | null {
  if (typeof window === "undefined") return null

  const raw = localStorage.getItem(CREDENTIALS_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as Credentials
    } catch {
      // fall through to legacy keys
    }
  }

  const idInstance = localStorage.getItem("idInstance")
  const apiTokenInstance = localStorage.getItem("apiTokenInstance")
  if (!idInstance || !apiTokenInstance) return null

  const credentials: Credentials = {
    idInstance,
    apiTokenInstance,
    apiUrl: buildApiUrl(idInstance),
  }
  saveCredentials(credentials)
  return credentials
}

export function saveCredentials(credentials: Credentials) {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials))
  localStorage.setItem("idInstance", credentials.idInstance)
  localStorage.setItem("apiTokenInstance", credentials.apiTokenInstance)
}

export function clearCredentials() {
  localStorage.removeItem(CREDENTIALS_KEY)
  localStorage.removeItem("idInstance")
  localStorage.removeItem("apiTokenInstance")
}

export function getChats(): Chat[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(CHATS_KEY)
    return raw ? (JSON.parse(raw) as Chat[]) : []
  } catch {
    return []
  }
}

export function saveChats(chats: Chat[]) {
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
}

export function getMessages(): Message[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(MESSAGES_KEY)
    return raw ? (JSON.parse(raw) as Message[]) : []
  } catch {
    return []
  }
}

export function saveMessages(messages: Message[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages))
}

export function clearSessionData() {
  clearCredentials()
  localStorage.removeItem(CHATS_KEY)
  localStorage.removeItem(MESSAGES_KEY)
}
