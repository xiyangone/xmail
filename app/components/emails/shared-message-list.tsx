"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, RefreshCw, Loader2, Info } from "lucide-react";
import { formatContactDisplay } from "@/lib/contact-address";
import { cn } from "@/lib/utils";
import { useThrottle } from "@/hooks/use-throttle";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

interface Message {
  id: string;
  from_address?: string;
  to_address?: string;
  subject: string;
  received_at?: number;
  sent_at?: number;
}

interface SharedMessageListProps {
  token: string;
  onMessageSelect: (messageId: string) => void;
  selectedMessageId?: string;
}

interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  total: number;
}

export function SharedMessageList({
  token,
  onMessageSelect,
  selectedMessageId,
}: SharedMessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const t = useTranslations("shared");
  const te = useTranslations("email");
  const tc = useTranslations("common");

  const fetchMessages = async (
    cursor: string | null = null,
    isRefresh = false
  ) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const url = cursor
        ? `/api/shared/${token}/messages?cursor=${cursor}`
        : `/api/shared/${token}/messages`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = (await response.json()) as MessagesResponse;

      if (isRefresh) {
        setMessages(data.messages);
      } else {
        setMessages((prev) =>
          cursor ? [...prev, ...data.messages] : data.messages
        );
      }

      setNextCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast({
        title: t("fetchMessagesFailed"),
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchMessages(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore && nextCursor) {
      fetchMessages(nextCursor);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, nextCursor, token]);

  const throttledHandleScroll = useThrottle(() => {
    if (!listRef.current || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 100) {
      handleLoadMore();
    }
  }, 200);

  useEffect(() => {
    fetchMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;

    listElement.addEventListener("scroll", throttledHandleScroll);
    return () => {
      listElement.removeEventListener("scroll", throttledHandleScroll);
    };
  }, [throttledHandleScroll]);

  return (
    <div className="h-full flex flex-col bg-card">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw
            className={cn(
              "h-4 w-4 cursor-pointer text-muted-foreground hover:text-primary transition-colors",
              refreshing && "animate-spin"
            )}
            onClick={handleRefresh}
          />
          <span className="text-sm text-muted-foreground">{t("messageCount", { count: total })}</span>
        </div>
      </div>

      <div className="mx-3 mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300">
          <strong>{t("refreshHintTitle")}</strong>
          {t("refreshHint")}
        </p>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">{te("noEmails")}</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3 p-4 cursor-pointer text-sm group transition-all duration-150 border-b border-border/50",
                "hover:bg-muted/50",
                selectedMessageId === message.id && "bg-muted/80",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => onMessageSelect(message.id)}
            >
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-medium truncate">
                  {message.subject || te("noSubject")}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {formatContactDisplay(message.from_address) ||
                    t("unknownSender")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(
                    message.received_at || message.sent_at || 0
                  ).toLocaleString("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
            <span className="ml-2 text-sm text-muted-foreground">
              {tc("loading")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
