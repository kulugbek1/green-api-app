export type Credentials = {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export type Chat = {
  id: string
  phone: string
  name: string
  lastMessage: string
  updatedAt: number
}

export type Message = {
  id: string
  chatId: string
  text: string
  timestamp: number
  fromMe: boolean
}

export type NotificationBody = {
  typeWebhook?: string
  timestamp?: number
  idMessage?: string
  senderData?: {
    chatId?: string
    chatName?: string
    senderName?: string
    senderContactName?: string
    senderPhoneNumber?: number | string
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: { textMessage?: string }
    extendedTextMessageData?: { text?: string }
  }
}

export type ReceiveNotificationResponse = {
  receiptId: number
  body: NotificationBody
} | null
