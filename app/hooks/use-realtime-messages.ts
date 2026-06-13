"use client";

import { useEffect, useRef, useState } from "react";

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "fallback"
  | "offline"
  | "unavailable";

interface RealtimeMessageEvent {
  type: "new_message";
  emailId: string;
  messageId: string;
  receivedAt: string;
}

interface RealtimeTokenResponse {
  enabled: boolean;
  token?: string;
  wsUrl?: string;
  expiresAt?: number;
  ttlMs?: number;
  reason?: string;
  serverTime?: number;
}

interface UseRealtimeMessagesOptions {
  emailId: string;
  enabled: boolean;
  onMessage: (event: RealtimeMessageEvent) => void;
}

interface CachedRealtimeToken {
  token: string;
  wsUrl: string;
  expiresAt: number;
}

const TOKEN_REFRESH_SKEW_MS = 30_000;

function buildRealtimeUrl(wsUrl: string, token: string) {
  const url = new URL(wsUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

function isBrowserOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function useRealtimeMessages({ emailId, enabled, onMessage }: UseRealtimeMessagesOptions) {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !emailId) {
      setStatus("idle");
      return;
    }

    let stopped = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let hasConnected = false;
    let cachedToken: CachedRealtimeToken | null = null;

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (stopped) {
        return;
      }

      if (document.hidden) {
        setStatus("fallback");
        return;
      }

      if (isBrowserOffline()) {
        setStatus("offline");
        return;
      }

      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      attempt += 1;
      setStatus(hasConnected ? "reconnecting" : "fallback");
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        void connect(true);
      }, delay);
    };

    const getRealtimeToken = async (): Promise<CachedRealtimeToken | "unavailable" | null> => {
      if (cachedToken && Date.now() + TOKEN_REFRESH_SKEW_MS < cachedToken.expiresAt) {
        return cachedToken;
      }

      const response = await fetch(`/api/realtime/token?emailId=${encodeURIComponent(emailId)}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        cachedToken = null;
        return null;
      }

      const data = (await response.json()) as RealtimeTokenResponse;
      if (!data.enabled || !data.token || !data.wsUrl) {
        cachedToken = null;
        setStatus("unavailable");
        return "unavailable";
      }

      cachedToken = {
        token: data.token,
        wsUrl: data.wsUrl,
        expiresAt: data.expiresAt ?? Date.now() + (data.ttlMs ?? 60_000),
      };
      return cachedToken;
    };

    const connect = async (isReconnect = false) => {
      if (stopped || document.hidden) {
        return;
      }

      if (isBrowserOffline()) {
        setStatus("offline");
        return;
      }

      if (socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) {
        return;
      }

      try {
        setStatus(isReconnect ? "reconnecting" : "connecting");
        const realtimeToken = await getRealtimeToken();

        if (realtimeToken === "unavailable") {
          return;
        }

        if (!realtimeToken) {
          scheduleReconnect();
          return;
        }

        socket = new WebSocket(buildRealtimeUrl(realtimeToken.wsUrl, realtimeToken.token));

        socket.onopen = () => {
          attempt = 0;
          hasConnected = true;
          setStatus("connected");
        };

        socket.onmessage = (event) => {
          if (typeof event.data !== "string" || event.data === "pong") {
            return;
          }

          try {
            const payload = JSON.parse(event.data) as Partial<RealtimeMessageEvent>;
            if (payload.type === "new_message" && payload.emailId === emailId && payload.messageId && payload.receivedAt) {
              onMessageRef.current(payload as RealtimeMessageEvent);
            }
          } catch {
            // Ignore non-JSON control messages.
          }
        };

        socket.onclose = () => {
          socket = null;
          if (!stopped) {
            scheduleReconnect();
          }
        };

        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        scheduleReconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearReconnectTimer();
        socket?.close();
        socket = null;
        setStatus("fallback");
        return;
      }

      if (!socket || socket.readyState === WebSocket.CLOSED) {
        attempt = 0;
        void connect();
      }
    };

    const handleOffline = () => {
      clearReconnectTimer();
      socket?.close();
      socket = null;
      setStatus("offline");
    };

    const handleOnline = () => {
      if (stopped || document.hidden) {
        return;
      }

      attempt = 0;
      clearReconnectTimer();
      void connect();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    void connect();

    return () => {
      stopped = true;
      clearReconnectTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      socket?.close();
    };
  }, [emailId, enabled]);

  return { status, connected: status === "connected" };
}
