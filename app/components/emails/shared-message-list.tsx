"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mail, RefreshCw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThrottle } from "@/hooks/use-throttle";
import { useToast } from "@/components/ui/use-toast";

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

  const fetchMessages = async (cursor: string | null = null, isRefresh = false) => {
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
        setMessages((prev) => (cursor ? [...prev, ...data.messages] : data.messages));
      }

      setNextCursor(data.nextCursor);
      setHasMore(!!data.nextCursor);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      toast({
        title: "获取消息失败",
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
    <div className="h-full flex flex-col bg-card border-r border-border">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">收件箱</h2>
          <p className="text-xs text-muted-foreground">共 {total} 封邮件</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8 w-8"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
        </Button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <Mail className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">暂无邮件</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg cursor-pointer text-sm group transition-all duration-200",
                "hover:bg-primary/10 hover:shadow-md",
                "border border-transparent hover:border-primary/20",
                selectedMessageId === message.id &&
                  "bg-primary/15 border-primary/30 shadow-md",
                "animate-fade-in"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
              onClick={() => onMessageSelect(message.id)}
            >
              <Mail className="h-5 w-5 text-primary/70 group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="font-medium truncate group-hover:text-primary transition-colors">
                  {message.subject || "(无主题)"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {message.from_address || "未知发件人"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(
                    message.received_at || message.sent_at || 0
                  ).toLocaleString("zh-CN", {
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
            <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
          </div>
        )}
      </div>
    </div>
  );
}

