"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatContactDisplay } from "@/lib/contact-address";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

interface Message {
  id: string;
  from_address?: string;
  to_address?: string;
  subject: string;
  content: string;
  html?: string;
  received_at?: number;
  sent_at?: number;
}

interface MessageViewProps {
  emailId: string;
  messageId: string;
  messageType?: "received" | "sent";
  onClose: () => void;
}

type ViewMode = "html" | "text";

export function MessageView({
  emailId,
  messageId,
  messageType = "received",
}: MessageViewProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("html");
  const { theme } = useTheme();
  const { toast } = useToast();
  const t = useTranslations("email");
  const tc = useTranslations("common");

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        setError(null);

        const url = `/api/emails/${emailId}/${messageId}${
          messageType === "sent" ? "?type=sent" : ""
        }`;

        const response = await fetch(url);

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage =
            (errorData as { error?: string }).error || t("fetchDetailFailed");
          setError(errorMessage);
          toast({
            title: tc("error"),
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        const data = (await response.json()) as { message: Message };
        setMessage(data.message);
        if (!data.message.html) {
          setViewMode("text");
        }
      } catch (error) {
        const errorMessage = tc("networkError");
        setError(errorMessage);
        toast({
          title: tc("error"),
          description: errorMessage,
          variant: "destructive",
        });
        console.error("Failed to fetch message:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [emailId, messageId, messageType, toast, t, tc]);

  const iframeSrcDoc = useCallback(() => {
    if (viewMode !== "html" || !message?.html) return undefined;
    return `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none';">
    <base target="_blank">
    <style>
      html, body {
        margin: 0;
        padding: 0;
        min-height: 100%;
        font-family: system-ui, -apple-system, sans-serif;
        color: ${theme === "dark" ? "#fff" : "#000"};
        background: ${theme === "dark" ? "#1a1a1a" : "#fff"};
      }
      body {
        padding: 20px;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      a {
        color: #2563eb;
      }
      ::-webkit-scrollbar {
        width: 6px;
        height: 6px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: ${
          theme === "dark"
            ? "rgba(130, 109, 217, 0.3)"
            : "rgba(130, 109, 217, 0.2)"
        };
        border-radius: 9999px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${
          theme === "dark"
            ? "rgba(130, 109, 217, 0.5)"
            : "rgba(130, 109, 217, 0.4)"
        };
      }
      * {
        scrollbar-width: thin;
        scrollbar-color: ${
          theme === "dark"
            ? "rgba(130, 109, 217, 0.3) transparent"
            : "rgba(130, 109, 217, 0.2) transparent"
        };
      }
    </style>
  </head>
  <body>${message.html}</body>
</html>`;
  }, [message, viewMode, theme]);

  // 移除了旧的 doc.write 方式，改用 srcdoc + sandbox 防止 XSS

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
        <span className="ml-2 text-sm text-gray-500">{t("loadingDetail")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <p className="text-sm text-destructive mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-primary hover:underline"
        >
          {tc("clickToRetry")}
        </button>
      </div>
    );
  }

  if (!message) return null;

  const fromLabel = formatContactDisplay(message.from_address);
  const toLabel = formatContactDisplay(message.to_address);

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4 space-y-3 border-b border-primary/20 shadow-sm">
        <h3 className="text-base font-bold">{message.subject}</h3>
        <div className="text-xs text-gray-500 space-y-1">
          {fromLabel && <p>{t("from", { address: fromLabel })}</p>}
          {toLabel && <p>{t("to", { address: toLabel })}</p>}
          <p>
            {t("time", { time: new Date(
              message.sent_at || message.received_at || 0
            ).toLocaleString() })}
          </p>
        </div>
      </div>

      {message.html && message.content && (
        <div className="border-b border-primary/20 p-2 bg-muted/30">
          <RadioGroup
            value={viewMode}
            onValueChange={(value) => setViewMode(value as ViewMode)}
            className="flex items-center gap-2 bg-background/50 backdrop-blur-sm p-1 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="html" id="html" />
              <Label
                htmlFor="html"
                className="text-xs cursor-pointer font-medium"
              >
                {t("htmlView")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="text" />
              <Label
                htmlFor="text"
                className="text-xs cursor-pointer font-medium"
              >
                {t("textView")}
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="flex-1 overflow-auto relative">
        {viewMode === "html" && message.html ? (
          <iframe
            className="absolute inset-0 w-full h-full border-0 bg-transparent"
            sandbox="allow-popups"
            srcDoc={iframeSrcDoc()}
            title={t("messageContent")}
          />
        ) : (
          <div className="p-4 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    </div>
  );
}
