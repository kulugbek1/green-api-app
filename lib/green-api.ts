import type {
  Credentials,
  NotificationBody,
  ReceiveNotificationResponse,
} from "./types"

export function buildApiUrl(idInstance: string): string {
  return `https://${idInstance.slice(0, 4)}.api.green-api.com`
}

function endpoint(credentials: Credentials, method: string, query = "") {
  return `${credentials.apiUrl}/waInstance${credentials.idInstance}/${method}/${credentials.apiTokenInstance}${query}`
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  if (!text) {
    return null as T
  }
  return JSON.parse(text) as T
}

export async function getStateInstance(credentials: Credentials) {
  const response = await fetch(endpoint(credentials, "getStateInstance"))
  if (!response.ok) {
    throw new Error("Failed to check instance state")
  }
  return parseJson<{ stateInstance?: string }>(response)
}

export async function setHttpApiSettings(credentials: Credentials) {
  const response = await fetch(endpoint(credentials, "setSettings"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      webhookUrl: "",
      webhookUrlToken: "",
      incomingWebhook: "yes",
      outgoingWebhook: "yes",
      outgoingMessageWebhook: "yes",
      outgoingAPIMessageWebhook: "yes",
      stateWebhook: "yes",
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to configure HTTP API settings")
  }

  return parseJson<{ saveSettings?: boolean }>(response)
}

export async function checkAccount(
  credentials: Credentials,
  input: { phoneNumber?: string; username?: string }
) {
  const payload: Record<string, string | number | boolean> = { force: true }

  if (input.username) {
    payload.username = input.username.startsWith("@")
      ? input.username
      : `@${input.username}`
  } else if (input.phoneNumber) {
    payload.phoneNumber = Number(input.phoneNumber)
  } else {
    throw new Error("phoneNumber or username is required")
  }

  const response = await fetch(endpoint(credentials, "checkAccount"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = await parseJson<{
    exist?: boolean
    chatId?: string
    username?: string
    phoneNumber?: number
    status?: boolean
    reason?: string
  }>(response)

  if (!response.ok) {
    throw new Error(data?.reason || "Failed to check account")
  }

  if (data?.status === false) {
    throw new Error(data.reason || "Could not check this account")
  }

  return data
}

export async function sendMessage(
  credentials: Credentials,
  chatId: string,
  message: string
) {
  const response = await fetch(endpoint(credentials, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, message }),
  })

  if (!response.ok) {
    throw new Error("Failed to send message")
  }

  return parseJson<{ idMessage?: string }>(response)
}

export async function receiveNotification(
  credentials: Credentials,
  receiveTimeout = 5,
  signal?: AbortSignal
) {
  const response = await fetch(
    endpoint(
      credentials,
      "receiveNotification",
      `?receiveTimeout=${receiveTimeout}`
    ),
    { signal }
  )

  const data = await parseJson<
    | ReceiveNotificationResponse
    | { status?: string; message?: string; code?: string }
  >(response)

  if (
    data &&
    typeof data === "object" &&
    "status" in data &&
    data.status === "error"
  ) {
    throw new Error(
      data.message ||
        "Cannot receive notifications. Clear webhookUrl in GREEN-API cabinet."
    )
  }

  if (!response.ok) {
    throw new Error("Failed to receive notification")
  }

  if (!data || typeof data !== "object" || !("receiptId" in data)) {
    return null
  }

  return data as ReceiveNotificationResponse
}

export async function deleteNotification(
  credentials: Credentials,
  receiptId: number
) {
  const response = await fetch(
    `${endpoint(credentials, "deleteNotification")}/${receiptId}`,
    { method: "DELETE" }
  )

  if (!response.ok) {
    throw new Error("Failed to delete notification")
  }

  return parseJson<{ result?: boolean }>(response)
}

export type JournalMessage = {
  type?: string
  idMessage?: string
  timestamp?: number
  typeMessage?: string
  chatId?: string
  textMessage?: string
  senderId?: string
  senderName?: string
  senderContactName?: string
}

export async function lastIncomingMessages(
  credentials: Credentials,
  minutes = 60,
  signal?: AbortSignal
) {
  const response = await fetch(
    endpoint(credentials, "lastIncomingMessages", `?minutes=${minutes}`),
    { signal }
  )

  if (!response.ok) {
    throw new Error("Failed to load incoming messages")
  }

  const data = await parseJson<JournalMessage[] | null>(response)
  return Array.isArray(data) ? data : []
}

export function extractMessageText(body: NotificationBody): string | null {
  const messageData = body.messageData
  if (!messageData) return null

  const type = messageData.typeMessage

  if (type === "textMessage") {
    return messageData.textMessageData?.textMessage ?? null
  }

  if (type === "extendedTextMessage") {
    return messageData.extendedTextMessageData?.text ?? null
  }

  return (
    messageData.textMessageData?.textMessage ??
    messageData.extendedTextMessageData?.text ??
    null
  )
}

export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "")
}

export function formatPhoneDisplay(phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 12 && digits.startsWith("375")) {
    return `+375 (${digits.slice(3, 5)}) ${digits.slice(5, 8)}-${digits.slice(8, 10)}-${digits.slice(10)}`
  }
  return digits ? `+${digits}` : phone
}
