import { NextResponse } from "next/server"
import { auth } from "./auth"
import { headers } from "next/headers"
import { getApiKeyByKey, incrementApiKeyUsage } from "./api-key-service"

export async function handleApiKeyAuth(
  apiKey: string,
  _pathname: string,
  requestHeaders: Headers
) {
  const record = await getApiKeyByKey(apiKey)
  if (!record?.user?.id) {
    return NextResponse.json(
      { error: "无效的 API Key" },
      { status: 401 }
    )
  }

  try {
    await incrementApiKeyUsage(record.id)
  } catch (error) {
    console.error("Failed to record API key usage:", error)
  }

  const nextHeaders = new Headers(requestHeaders)
  nextHeaders.delete("X-User-Id")
  nextHeaders.delete("X-Auth-Source")
  nextHeaders.delete("X-Api-Key-Id")
  nextHeaders.set("X-User-Id", record.user.id)
  nextHeaders.set("X-Auth-Source", "api_key")
  nextHeaders.set("X-Api-Key-Id", record.id)

  const response = NextResponse.next({
    request: {
      headers: nextHeaders,
    },
  })

  // 便于调试（客户端也能看到）
  response.headers.set("X-User-Id", record.user.id)
  return response
}

export const getUserId = async () => {
  const headersList = await headers()
  const userId = headersList.get("X-User-Id")
  
  if (userId) return userId

  const session = await auth()

  return session?.user.id
}
