"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { formatContactDisplay } from "@/lib/contact-address";
import { extractVerificationCodeFromMessage } from "@/lib/verification-code";
import { useTranslations } from "next-intl";

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

interface FetchMessagesOptions {
  cursor?: string;
  forceRefresh?: boolean;
  scheduleNext?: boolean;
  silentOnError?: boolean;
}

const MAX_ERROR_COUNT = 5;
const MAX_BACKOFF_INTERVAL = 5 * 60 * 1000;

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
  const [total, setTotal] = useState(0);
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [countdownTotal, setCountdownTotal] = useState(0);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const messagesRef = useRef<Message[]>([]);
  const errorCountRef = useRef(0);
  const isDocumentVisibleRef = useRef(true);
  const fetchMessagesRef = useRef<
    (options?: FetchMessagesOptions) => Promise<void>
  >(async () => {});

  const { toast } = useToast();
  const { config } = useConfig();
  const t = useTranslations("email");
  const tc = useTranslations("common");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    errorCountRef.current = errorCount;
  }, [errorCount]);

  const getBackoffInterval = useCallback(
    (currentErrorCount: number) => {
      const baseInterval = config?.messagePollInterval
        ? parseInt(config.messagePollInterval)
        : EMAIL_CONFIG.POLL_INTERVAL;

      if (currentErrorCount === 0) {
        return baseInterval;
      }

      return Math.min(
        baseInterval * Math.pow(2, currentErrorCount),
        MAX_BACKOFF_INTERVAL
      );
    },
    [config?.messagePollInterval]
  );

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
    setCountdownTotal(0);
  }, []);

  const scheduleNextPoll = useCallback(
    (intervalMs: number) => {
      stopPolling();

      if (!isDocumentVisibleRef.current) {
        return;
      }

      const countdownSeconds = Math.max(1, Math.ceil(intervalMs / 1000));
      setCountdown(countdownSeconds);
      setCountdownTotal(countdownSeconds);

      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => (prev <= 1 ? 1 : prev - 1));
      }, 1000);

      pollTimeoutRef.current = setTimeout(() => {
        void fetchMessagesRef.current({ silentOnError: true });
      }, intervalMs);
    },
    [stopPolling]
  );

  const fetchMessages = useCallback(
    async (options: FetchMessagesOptions = {}) => {
      const {
        cursor,
        forceRefresh = false,
        scheduleNext = !cursor,
        silentOnError = true,
      } = options;

      try {
        const url = new URL(`/api/emails/${email.id}`, window.location.origin);
        if (messageType === "sent") {
          url.searchParams.set("type", "sent");
        }
        if (cursor) {
          url.searchParams.set("cursor", cursor);
        }

        const response = await fetch(url);
        if (!response.ok) {
          let errorMessage = `HTTP error: ${response.status}`;
          if (response.headers.get("content-type")?.includes("application/json")) {
            try {
              const errorData = (await response.json()) as { error?: string };
              errorMessage = errorData.error || errorMessage;
            } catch {
              // ignore json parse failure and keep the status-based message
            }
          }
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as MessageResponse;

        if (errorCountRef.current !== 0) {
          errorCountRef.current = 0;
          setErrorCount(0);
        }

        if (!cursor) {
          if (forceRefresh) {
            setMessages(data.messages);
            setNextCursor(data.nextCursor);
            setTotal(data.messages.length);
            if (scheduleNext) {
              scheduleNextPoll(getBackoffInterval(0));
            }
            return;
          }

          const newMessages = data.messages;
          const oldMessages = messagesRef.current;
          const newMessageIds = new Set(newMessages.map((message) => message.id));
          const validOldMessages = oldMessages.filter((message) =>
            newMessageIds.has(message.id)
          );

          const lastDuplicateIndex = newMessages.findIndex((newMessage) =>
            validOldMessages.some((oldMessage) => oldMessage.id === newMessage.id)
          );

          if (lastDuplicateIndex === -1) {
            setMessages(newMessages);
            setNextCursor(data.nextCursor);
            setTotal(newMessages.length);
            if (scheduleNext) {
              scheduleNextPoll(getBackoffInterval(0));
            }
            return;
          }

          const uniqueNewMessages = newMessages.slice(0, lastDuplicateIndex);
          const updatedMessages = [...uniqueNewMessages, ...validOldMessages];
          setMessages(updatedMessages);
          setNextCursor(data.nextCursor);
          setTotal(updatedMessages.length);

          if (scheduleNext) {
            scheduleNextPoll(getBackoffInterval(0));
          }
          return;
        }

        setMessages((prev) => {
          const updated = [...prev, ...data.messages];
          setTotal(updated.length);
          return updated;
        });
        setNextCursor(data.nextCursor);

        if (scheduleNext) {
          scheduleNextPoll(getBackoffInterval(0));
        }
      } catch (error) {
        const nextErrorCount = Math.min(errorCountRef.current + 1, MAX_ERROR_COUNT);
        errorCountRef.current = nextErrorCount;
        setErrorCount(nextErrorCount);

        if (scheduleNext) {
          scheduleNextPoll(getBackoffInterval(nextErrorCount));
        }

        if (!silentOnError) {
          toast({
            title: tc("error"),
            description:
              error instanceof Error ? error.message : tc("networkError"),
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [email.id, getBackoffInterval, messageType, scheduleNextPoll, tc, toast]
  );

  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  const handleRefresh = async () => {
    stopPolling();
    setRefreshing(true);
    errorCountRef.current = 0;
    setErrorCount(0);
    await fetchMessages({ forceRefresh: true, silentOnError: false });
  };

  const handleScroll = useThrottle((e: React.UIEvent<HTMLDivElement>) => {
    if (loadingMore) {
      return;
    }

    const { scrollHeight, scrollTop, clientHeight } = e.currentTarget;
    const threshold = clientHeight * 1.5;
    const remainingScroll = scrollHeight - scrollTop;

    if (remainingScroll <= threshold && nextCursor) {
      setLoadingMore(true);
      stopPolling();
      void fetchMessages({ cursor: nextCursor, silentOnError: false }).finally(
        () => {
          scheduleNextPoll(getBackoffInterval(errorCountRef.current));
        }
      );
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
          title: tc("error"),
          description: (data as { error: string }).error,
          variant: "destructive",
        });
        return;
      }

      if (selectedMessageId === message.id) {
        onMessageSelect(null);
      }

      toast({
        title: tc("success"),
        description: t("delete.messageDeletd"),
      });

      stopPolling();
      setLoading(true);
      await fetchMessages({ forceRefresh: true, silentOnError: false });
    } catch {
      toast({
        title: tc("error"),
        description: t("delete.messageFailed"),
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
        title: tc("copied"),
        description: t("verificationCodeCopied", { code }),
      });
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      toast({
        title: tc("copyFailed"),
        description: tc("copyFailed"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!email.id) {
      return;
    }

    stopPolling();
    setMessages([]);
    setLoading(true);
    setNextCursor(null);
    setTotal(0);
    errorCountRef.current = 0;
    setErrorCount(0);
    onMessageSelect(null);
    void fetchMessages({ forceRefresh: true, silentOnError: true });

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email.id, messageType]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      stopPolling();
      setRefreshing(true);
      void fetchMessages({ forceRefresh: true, silentOnError: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isDocumentVisibleRef.current = !document.hidden;

      if (document.hidden) {
        stopPolling();
        return;
      }

      if (!email.id) {
        return;
      }

      void fetchMessagesRef.current({
        forceRefresh: true,
        silentOnError: true,
      });
    };

    isDocumentVisibleRef.current = !document.hidden;
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [email.id, stopPolling]);

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
                        (1 - countdown / Math.max(countdownTotal, 1))
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
            {total > 0 ? t("messageCount", { count: total }) : t("noMessages")}
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
                const contactLabel = formatContactDisplay(
                  message.from_address || message.to_address
                );
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
                              title={t("copyVerificationCode")}
                            >
                              <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                {t("verificationCode")}
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
                              {contactLabel || ""}
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
                  {tc("loadingMore")}
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              icon={messageType === "sent" ? SendIcon : Inbox}
              title={
                messageType === "sent"
                  ? t("noSentMessages")
                  : t("noReceivedMessages")
              }
              description={
                messageType === "sent" ? t("sentHint") : t("receivedHint")
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
            <AlertDialogTitle>{t("delete.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete.confirmMessage", {
                subject: messageToDelete?.subject ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => messageToDelete && handleDelete(messageToDelete)}
            >
              {tc("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
