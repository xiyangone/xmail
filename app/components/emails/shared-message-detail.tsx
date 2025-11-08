"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Loader2, Copy } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useToast } from "@/components/ui/use-toast";
import { useCopy } from "@/hooks/use-copy";

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

export function SharedMessageDetail({ token, messageId }: SharedMessageDetailProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("html");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  const { copyToClipboard } = useCopy();

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/shared/${token}/messages/${messageId}`);

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage =
            (errorData as { error?: string }).error || "获取邮件详情失败";
          setError(errorMessage);
          toast({
            title: "错误",
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
        const errorMessage = "网络错误，请稍后重试";
        setError(errorMessage);
        toast({
          title: "错误",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMessage();
  }, [token, messageId, toast]);

  const handleCopyContent = async () => {
    if (!message) return;
    const content = viewMode === "html" ? message.html : message.content;
    if (!content) return;

    const success = await copyToClipboard(content);
    if (success) {
      toast({
        title: "内容已复制",
      });
    } else {
      toast({
        title: "复制失败",
        variant: "destructive",
      });
    }
  };

  const updateIframeContent = useCallback(() => {
    if (viewMode === "html" && message?.html) {
      const iframe = iframeRef.current;
      if (!iframe) return;

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              /* Webkit 滚动条 */
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
        </html>
      `);
      doc.close();
    }
  }, [message, viewMode, theme]);

  useEffect(() => {
    updateIframeContent();
  }, [updateIframeContent]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
        <span className="ml-2 text-sm text-gray-500">加载邮件详情...</span>
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

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4 space-y-3 border-b border-primary/20 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-bold flex-1">{message.subject}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCopyContent}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          {message.from_address && <p>发件人：{message.from_address}</p>}
          {message.to_address && <p>收件人：{message.to_address}</p>}
          <p>
            时间：
            {new Date(
              message.sent_at || message.received_at || 0
            ).toLocaleString()}
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
                HTML 格式
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="text" />
              <Label
                htmlFor="text"
                className="text-xs cursor-pointer font-medium"
              >
                纯文本
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {viewMode === "html" && message.html ? (
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-same-origin"
            title="邮件内容"
          />
        ) : (
          <div className="h-full overflow-y-auto p-4">
            <pre className="whitespace-pre-wrap break-words text-sm font-mono">
              {message.content || "无内容"}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

