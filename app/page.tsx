"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { buildApiUrl, getStateInstance } from "@/lib/green-api"
import { getCredentials, saveCredentials } from "@/lib/storage"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkAuthorization = async () => {
      const credentials = getCredentials()

      if (!credentials) {
        router.replace("/auth")
        return
      }

      const normalized = {
        ...credentials,
        apiUrl: credentials.apiUrl || buildApiUrl(credentials.idInstance),
      }

      try {
        const data = await getStateInstance(normalized)

        if (data.stateInstance === "authorized") {
          saveCredentials(normalized)
          router.replace("/chats")
        } else {
          router.replace("/auth")
        }
      } catch {
        router.replace("/auth")
      }
    }

    checkAuthorization()
  }, [router])

  return (
    <div className="flex h-full items-center justify-center bg-[#e8eef4] text-sm text-[#6b7785]">
      Checking session...
    </div>
  )
}
