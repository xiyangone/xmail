"use client";

import { useEffect, useRef, useState } from "react";

export type RealtimeStatus = "idle" | "connecting" | "connected" | "fallback" | "unavailable";

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
}

interface UseRealtimeMessagesOptions {
  emailId: string;
  enabled: boolean;
  onMessage: (event: RealtimeMessageEvent) => void;
}

function buildRealtimeUrl(wsUrl: string, token: string) {
  const url = new URL(wsUrl);
  url.searchParams.set("token", token);
  return url.toString();
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

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (stopped || document.hidden) {
        setStatus("fallback");
        return;
      }

      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      attempt += 1;
      setStatus("fallback");
      clearReconnectTimer();
      reconnectTimer = setTimeout(() => {
        void connect();
      }, delay);
    };

    const connect = async () => {
      try {
        setStatus("connecting");
        const response = await fetch(`/api/realtime/token?emailId=${encodeURIComponent(emailId)}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          scheduleReconnect();
          return;
        }

        const data = (await response.json()) as RealtimeTokenResponse;
        if (!data.enabled || !data.token || !data.wsUrl) {
          setStatus("unavailable");
          return;
        }

        socket = new WebSocket(buildRealtimeUrl(data.wsUrl, data.token));

        socket.onopen = () => {
          attempt = 0;
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
        setStatus("fallback");
        return;
      }

      if (!socket || socket.readyState === WebSocket.CLOSED) {
        attempt = 0;
        void connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void connect();

    return () => {
      stopped = true;
      clearReconnectTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      socket?.close();
    };
  }, [emailId, enabled]);

  return { status, connected: status === "connected" };
}
