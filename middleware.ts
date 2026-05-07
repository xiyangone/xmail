import { authorizeRequest } from "@/lib/policy"
import { NextResponse } from "next/server"

export async function middleware(request: Request) {
  const decision = await authorizeRequest(request)
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.error ?? "无权访问" },
      { status: decision.status }
    )
  }

  return NextResponse.next({
    request: {
      headers: decision.requestHeaders ?? request.headers,
    },
  })
}

export const config = {
  matcher: [
    '/api/emails/:path*',
    '/api/webhook/:path*',
    '/api/roles/:path*',
    '/api/config/:path*',
    '/api/api-keys/:path*',
    '/api/cleanup/:path*',
    '/api/admin/:path*',
  ]
}
