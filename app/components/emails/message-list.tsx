"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail,
  Calendar,
  RefreshCw,
  Trash2,
  Inbox,
  Send as SendIcon,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useThrottle } from "@/hooks/use-throttle";
import { EMAIL_CONFIG } from "@/config";
import { useToast } from "@/components/ui/use-toast";
import { useConfig } from "@/hooks/use-config";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageListSkeleton } from "@/components/ui/loading-skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { extractVerificationCodeFromMessage } from "@/lib/verification-code";

interface Message {
  id: string;
  from_address?: string;
  to_address?: string;
  subject: string;
  received_at?: number;
  sent_at?: number;
  content?: string;
  html?: string;
}

interface MessageListProps {
  email: {
    id: string;
    address: string;
  };
  messageType: "received" | "sent";
  onMessageSelect: (
    messageId: string | null,
    messageType?: "received" | "sent"
  ) => void;
  selectedMessageId?: string | null;
  refreshTrigger?: number;
}

interface MessageResponse {
  messages: Message[];
  nextCursor: string | null;
  total: number;
}

export function MessageList({
  email,
  messageType,
  onMessageSelect,
  selectedMessageId,
  refreshTrigger,
}: MessageListProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const pollTimeoutRef = useRef<Timer>(null);
  const messagesRef = useRef<Message[]>([]); // 添加 ref 来追踪最新的消息列表
  const [total, setTotal] = useState(0);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [countdown, setCountdown] = useState(0); // 倒计时秒数
  const countdownIntervalRef = useRef<Timer>(null);
  const { toast } = useToast();
  const { config } = useConfig();
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // 当 messages 改变时更新 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchMessages = async (cursor?: string, forceRefresh = false) => {
    try {
      const url = new URL(`/api/emails/${email.id}`, window.location.origin);
      if (messageType === "sent") {
        url.searchParams.set("type", "sent");
      }
      if (cursor) {
        url.searchParams.set("cursor", cursor);
      }
      const response = await fetch(url);
      const data = (await response.json()) as MessageResponse;

      if (!cursor) {
        // 如果是强制刷新,直接替换所有数据
        if (forceRefresh) {
          setMessages(data.messages);
          setNextCursor(data.nextCursor);
          setTotal(data.messages.length);
          // 重置倒计时
          resetCountdown();
          return;
        }

        const newMessages = data.messages;
        const oldMessages = messagesRef.current;

        // 创建新消息的 ID 集合,用于快速查找
        const newMessageIds = new Set(newMessages.map((m) => m.id));

        // 过滤掉已被删除的旧消息(服务器返回的新数据中不存在的)
        const validOldMessages = oldMessages.filter((m) =>
          newMessageIds.has(m.id)
        );

        const lastDuplicateIndex = newMessages.findIndex((newMsg) =>
          validOldMessages.some((oldMsg) => oldMsg.id === newMsg.id)
        );

        if (lastDuplicateIndex === -1) {
          setMessages(newMessages);
          setNextCursor(data.nextCursor);
          setTotal(newMessages.length);
          // 重置倒计时
          resetCountdown();
          return;
        }
        const uniqueNewMessages = newMessages.slice(0, lastDuplicateIndex);
        const updatedMessages = [...uniqueNewMessages, ...validOldMessages];
        setMessages(updatedMessages);
        setTotal(updatedMessages.length);
        // 重置倒计时
        resetCountdown();
        return;
      }
      setMessages((prev) => {
        const updated = [...prev, ...data.messages];
        setTotal(updated.length);
        return updated;
      });
      setNextCursor(data.nextCursor);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const resetCountdown = () => {
    const pollInterval = config?.messagePollInterval
      ? parseInt(config.messagePollInterval)
      : EMAIL_CONFIG.POLL_INTERVAL;
    const countdownSeconds = Math.floor(pollInterval / 1000);
    setCountdown(countdownSeconds);
  };

  const startPolling = () => {
    stopPolling();
    const pollInterval = config?.messagePollInterval
      ? parseInt(config.messagePollInterval)
      : EMAIL_CONFIG.POLL_INTERVAL;

    // 设置初始倒计时（转换为秒）
    const countdownSeconds = Math.floor(pollInterval / 1000);
    setCountdown(countdownSeconds);

    // 启动倒计时 - 每秒递减
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        // 当倒计时为1时,下一秒归零并触发刷新
        if (prev <= 1) {
          if (!refreshing && !loadingMore) {
            fetchMessages();
          }
          // 不在这里重置倒计时,而是在 fetchMessages 完成后重置
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopPolling = () => {
    if (pollTimeoutRef.current) {
      clearInterval(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchMessages();
    // 手动刷新后重置倒计时
    const pollInterval = config?.messagePollInterval
      ? parseInt(config.messagePollInterval)
      : EMAIL_CONFIG.POLL_INTERVAL;
    setCountdown(Math.floor(pollInterval / 1000));
  };

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    if (loadingMore) return;

    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    const threshold = clientHeight * 1.5;
    const remainingScroll = scrollHeight - scrollTop;

    if (remainingScroll <= threshold && nextCursor) {
      setLoadingMore(true);
      fetchMessages(nextCursor);
    }
  }, 200);

  const handleDelete = async (message: Message) => {
    try {
      const response = await fetch(
        `/api/emails/${email.id}/${message.id}${
          messageType === "sent" ? "?type=sent" : ""
        }`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: "错误",
          description: (data as { error: string }).error,
          variant: "destructive",
        });
        return;
      }

      if (selectedMessageId === message.id) {
        onMessageSelect(null);
      }

      toast({
        title: "成功",
        description: "邮件已删除",
      });

      // 强制刷新列表,清除缓存
      setLoading(true);
      await fetchMessages(undefined, true);
    } catch {
      toast({
        title: "错误",
        description: "删除邮件失败",
        variant: "destructive",
      });
    } finally {
      setMessageToDelete(null);
    }
  };

  const handleCopyCode = async (code: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(messageId);
      toast({
        title: "已复制",
        description: `验证码 ${code} 已复制到剪贴板`,
      });
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      toast({
        title: "复制失败",
        description: "无法复制到剪贴板",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!email.id) {
      return;
    }
    // 切换邮箱时立即清空消息列表,避免显示上一个邮箱的消息
    setMessages([]);
    setLoading(true);
    setNextCursor(null);
    setTotal(0);
    // 清空选中的消息
    onMessageSelect(null);
    fetchMessages();
    startPolling();

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email.id, config?.messagePollInterval]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      setRefreshing(true);
      fetchMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="p-2 flex justify-between items-center border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
              className={cn("h-8 w-8", refreshing && "animate-spin")}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {countdown > 0 && !refreshing && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/5 border border-primary/10">
                <div className="relative w-3 h-3">
                  <svg className="w-3 h-3 -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary/20"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      className="text-primary transition-all duration-1000"
                      strokeDasharray={`${2 * Math.PI * 10}`}
                      strokeDashoffset={`${
                        2 *
                        Math.PI *
                        10 *
                        (1 -
                          countdown /
                            Math.floor(
                              (config?.messagePollInterval
                                ? parseInt(config.messagePollInterval)
                                : EMAIL_CONFIG.POLL_INTERVAL) / 1000
                            ))
                      }`}
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <span className="text-xs font-medium text-primary tabular-nums">
                  {countdown}s
                </span>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-500">
            {total > 0 ? `${total} 封邮件` : "暂无邮件"}
          </span>
        </div>

        <div className="flex-1 overflow-auto" onScroll={handleScroll}>
          {loading ? (
            <MessageListSkeleton />
          ) : messages.length > 0 ? (
            <div className="divide-y divide-primary/10">
              {messages.map((message) => {
                const verificationCode =
                  extractVerificationCodeFromMessage(message);
                return (
                  <div
                    key={message.id}
                    onClick={() => onMessageSelect(message.id, messageType)}
                    className={cn(
                      "p-3 hover:bg-primary/5 cursor-pointer group relative",
                      selectedMessageId === message.id && "bg-primary/10"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-primary/60 mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {message.subject}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          {verificationCode ? (
                            <div
                              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyCode(verificationCode, message.id);
                              }}
                              title="点击复制验证码"
                            >
                              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                验证码
                              </span>
                              <span
                                className="text-sm font-bold text-orange-700 dark:text-orange-300 tracking-wider"
                                style={{
                                  fontFamily:
                                    '"JetBrains Mono Nerd Font", "Maple Mono", "JetBrains Mono", monospace',
                                }}
                              >
                                {verificationCode}
                              </span>
                              {copiedCodeId === message.id ? (
                                <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                              )}
                            </div>
                          ) : (
                            <span className="truncate text-xs text-gray-500">
                              {message.from_address || message.to_address || ""}
                            </span>
                          )}
                          <span className="flex items-center gap-1 text-xs text-gray-500 flex-shrink-0">
                            <Calendar className="w-3 h-3" />
                            {new Date(
                              message.received_at || message.sent_at || 0
                            ).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMessageToDelete(message);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {loadingMore && (
                <div className="text-center text-sm text-gray-500 py-2">
                  加载更多...
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={messageType === "sent" ? SendIcon : Inbox}
              title={
                messageType === "sent" ? "暂无发送的邮件" : "暂无收到的邮件"
              }
              description={
                messageType === "sent"
                  ? "使用此邮箱发送邮件后，将在这里显示"
                  : "当有人向此邮箱发送邮件时，将在这里显示"
              }
            />
          )}
        </div>
      </div>
      <AlertDialog
        open={!!messageToDelete}
        onOpenChange={() => setMessageToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除邮件 {messageToDelete?.subject} 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => messageToDelete && handleDelete(messageToDelete)}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
