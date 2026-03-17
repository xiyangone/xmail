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
  content?: string;
  html?: string;
  received_at?: number;
  sent_at?: number;
}

interface SharedMessageDetailProps {
  token: string;
  messageId: string;
}

type ViewMode = "html" | "text";

export function SharedMessageDetail({
  token,
  messageId,
}: SharedMessageDetailProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("html");
  const { theme } = useTheme();
  const { toast } = useToast();
  const t = useTranslations("shared");
  const te = useTranslations("email");
  const tc = useTranslations("common");

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/shared/${token}/messages/${messageId}`
        );

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
      } catch {
        const errorMessage = tc("networkError");
        setError(errorMessage);
        toast({
          title: tc("error"),
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, messageId, toast]);

  const iframeSrcDoc = useCallback(() => {
    if (viewMode !== "html" || !message?.html) return undefined;
    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none';">
    <style>
      body {
        margin: 0;
        padding: 16px;
        font-family: system-ui, -apple-system, sans-serif;
        line-height: 1.6;
        color: ${theme === "dark" ? "#e5e7eb" : "#1f2937"};
        background: ${theme === "dark" ? "#1f2937" : "#ffffff"};
        word-wrap: break-word;
        overflow-wrap: break-word;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      a {
        color: ${theme === "dark" ? "#a78bfa" : "#7c3aed"};
      }
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
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
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: ${
          theme === "dark"
            ? "rgba(130, 109, 217, 0.5)"
            : "rgba(130, 109, 217, 0.4)"
        };
      }
    </style>
  </head>
  <body>${message.html}</body>
</html>`;
  }, [message, viewMode, theme]);

  // 使用 srcdoc + sandbox 防止 XSS，无需 useEffect 写入

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
        <span className="ml-2 text-sm text-gray-500">{te("loadingDetail")}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <p className="text-sm text-destructive mb-2">{error}</p>
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
          {fromLabel && <p>{te("from", { address: fromLabel })}</p>}
          {toLabel && <p>{te("to", { address: toLabel })}</p>}
          <p>
            {te("time", {
              time: new Date(
                message.sent_at || message.received_at || 0
              ).toLocaleString(),
            })}
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
                {te("htmlView")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="text" />
              <Label
                htmlFor="text"
                className="text-xs cursor-pointer font-medium"
              >
                {te("textView")}
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {viewMode === "html" && message.html ? (
          <iframe
            className="w-full h-full border-0"
            sandbox="allow-popups"
            srcDoc={iframeSrcDoc()}
            title={te("messageContent")}
          />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap break-words text-sm font-mono">
              {message.content || t("noContent")}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
