import { handleApiKeyAuth } from "@/lib/apiKey"
import { auth, checkPermission } from "@/lib/auth"
import { PERMISSIONS, type Permission } from "@/lib/permissions"
import { NextResponse } from "next/server"

const API_PERMISSIONS: Record<string, Permission> = {
  '/api/emails': PERMISSIONS.MANAGE_EMAIL,
  '/api/webhook': PERMISSIONS.MANAGE_WEBHOOK,
  '/api/roles/promote': PERMISSIONS.PROMOTE_USER,
  '/api/roles/users': PERMISSIONS.PROMOTE_USER,
  '/api/config': PERMISSIONS.MANAGE_CONFIG,
  '/api/api-keys': PERMISSIONS.MANAGE_API_KEY,
  '/api/cleanup': PERMISSIONS.MANAGE_CONFIG,
  '/api/admin': PERMISSIONS.MANAGE_CARD_KEYS,
}

export async function middleware(request: Request) {
  const pathname = new URL(request.url).pathname
  const method = request.method

  // Keep public config reads available before any auth gate.
  if ((pathname === '/api/config' || pathname === '/api/config/background') && method === 'GET') {
    return NextResponse.next()
  }

  const apiKey = request.headers.get("X-API-Key")
  if (apiKey) {
    return handleApiKeyAuth(apiKey, pathname, request.headers)
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "未授权" },
      { status: 401 }
    )
  }

  if (pathname.startsWith('/api/emails') && method === 'GET') {
    const hasTempPermission = await checkPermission(PERMISSIONS.VIEW_TEMP_EMAIL)
    if (hasTempPermission) {
      return NextResponse.next()
    }
  }

  for (const [route, permission] of Object.entries(API_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      const hasAccess = await checkPermission(permission)

      if (!hasAccess) {
        return NextResponse.json(
          { error: "权限不足" },
          { status: 403 }
        )
      }
      break
    }
  }

  return NextResponse.next()
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
