import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq } from "drizzle-orm";

import { getUserId } from "@/lib/apiKey";
import { createDb } from "@/lib/db";
import {
  createRealtimeTokenPayload,
  REALTIME_TOKEN_TTL_MS,
  signRealtimeToken,
} from "@/lib/realtime-token";
import { emails } from "@/lib/schema";

function normalizeWebSocketUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:") {
      url.protocol = "wss:";
    } else if (url.protocol === "http:") {
      url.protocol = "ws:";
    }

    if (url.protocol !== "wss:" && url.protocol !== "ws:") {
      return "";
    }

    if (url.pathname === "/" || !url.pathname) {
      url.pathname = "/ws";
    }

    return url.toString();
  } catch {
    return "";
  }
}

async function getRealtimeConfig() {
  const { env } = await getCloudflareContext();
  const [kvWsUrl] = await Promise.all([env.SITE_CONFIG.get("REALTIME_WS_URL")]);
  const wsUrl = normalizeWebSocketUrl(kvWsUrl || env.REALTIME_WS_URL || process.env.REALTIME_WS_URL || "");
  const secret = env.INTERNAL_WORKER_SECRET || process.env.INTERNAL_WORKER_SECRET || "";
  return { wsUrl, secret };
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const emailId = searchParams.get("emailId");
  if (!emailId) {
    return NextResponse.json({ error: "缺少邮箱 ID" }, { status: 400 });
  }

  const db = await createDb();
  const email = await db.query.emails.findFirst({
    columns: {
      id: true,
    },
    where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
  });

  if (!email) {
    return NextResponse.json({ error: "无权限查看" }, { status: 403 });
  }

  const { wsUrl, secret } = await getRealtimeConfig();
  if (!wsUrl || !secret) {
    return NextResponse.json(
      {
        enabled: false,
        reason: !wsUrl ? "missing_ws_url" : "missing_secret",
        ttlMs: 0,
        serverTime: Date.now(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const now = Date.now();
  const payload = createRealtimeTokenPayload(email.id, userId, now);
  const token = await signRealtimeToken(payload, secret);

  return NextResponse.json(
    {
      enabled: true,
      token,
      wsUrl,
      expiresAt: payload.exp,
      ttlMs: REALTIME_TOKEN_TTL_MS,
      serverTime: now,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
