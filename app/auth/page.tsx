"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import {
  buildApiUrl,
  getStateInstance,
  setHttpApiSettings,
} from "@/lib/green-api"
import { saveCredentials } from "@/lib/storage"

export default function AuthPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const idInstance = String(formData.get("idInstance") ?? "").trim()
    const apiTokenInstance = String(formData.get("apiTokenInstance") ?? "").trim()
    const apiUrlInput = String(formData.get("apiUrl") ?? "").trim()

    if (!idInstance || !apiTokenInstance) {
      setError("Enter both idInstance and apiTokenInstance")
      return
    }

    setError("")
    setLoading(true)

    const credentials = {
      idInstance,
      apiTokenInstance,
      apiUrl: (apiUrlInput || buildApiUrl(idInstance)).replace(/\/$/, ""),
    }

    try {
      const state = await getStateInstance(credentials)

      if (state.stateInstance !== "authorized") {
        setError(`Instance is not authorized: ${state.stateInstance ?? "unknown"}`)
        return
      }
      try {
        await setHttpApiSettings(credentials)
      } catch {
        console.warn(
          "setSettings failed. Clear webhookUrl and enable incomingWebhook in GREEN-API cabinet."
        )
      }

      saveCredentials(credentials)
      router.replace("/chats")
    } catch {
      setError(
        "Could not connect to GREEN-API. Check idInstance, token, and apiUrl from your cabinet."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,#dce8f8,#e8eef4_45%,#dfe6ee)] px-4">
      <div className="w-full max-w-md rounded-3xl bg-white/95 p-8">
        <h1 className="mt-2 text-center text-3xl font-semibold tracking-tight text-[#1b2430]">
          GREEN-API App
        </h1>
        <p className="mt-2 text-center text-sm leading-relaxed text-[#6b7785]">
          Enter credentials from your GREEN-API Telegram instance.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="idInstance"
              className="text-sm font-medium text-[#3d4754]"
            >
              ID Instance
            </label>
            <input
              id="idInstance"
              name="idInstance"
              type="text"
              required
              autoComplete="off"
              placeholder="idInstance"
              className="h-11 w-full rounded-xl border border-[#c9d2dc] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa5b1] focus:border-[#2a6df4] focus:ring-2 focus:ring-[#2a6df4]/20"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="apiTokenInstance"
              className="text-sm font-medium text-[#3d4754]"
            >
              API Token Instance
            </label>
            <input
              id="apiTokenInstance"
              name="apiTokenInstance"
              type="password"
              required
              autoComplete="off"
              placeholder="apiTokenInstance"
              className="h-11 w-full rounded-xl border border-[#c9d2dc] bg-white px-3 text-sm outline-none transition placeholder:text-[#9aa5b1] focus:border-[#2a6df4] focus:ring-2 focus:ring-[#2a6df4]/20"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-xl bg-[#2a6df4] text-sm font-medium text-white transition hover:bg-[#1f5ad1] disabled:opacity-50"
          >
            {loading ? "Connecting..." : "Connect"}
          </button>
        </form>
      </div>
    </div>
  )
}
