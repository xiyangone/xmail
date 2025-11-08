"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { BrandHeader } from "@/components/ui/brand-header";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
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
  received_at?: Date;
  sent_at?: Date;
  expiresAt?: Date;
  emailAddress?: string;
  emailExpiresAt?: Date;
}

interface SharedMessagePageClientProps {
  message: Message;
}

type ViewMode = "html" | "text";

export function SharedMessagePageClient({ message }: SharedMessagePageClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(
    message.html ? "html" : "text"
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { theme } = useTheme();
  const { toast } = useToast();
  const { copyToClipboard } = useCopy();

  const handleCopyContent = async () => {
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
    if (viewMode === "html" && message.html) {
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
  }, [message.html, viewMode, theme]);

  useEffect(() => {
    updateIframeContent();
  }, [updateIframeContent]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-4xl mx-auto">
        <BrandHeader />

        <div className="px-4 pb-4">
          <div className="bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            <div className="p-4 bg-muted/30 border-b border-border space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold flex-1">{message.subject}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleCopyContent}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                {message.from_address && <p>发件人：{message.from_address}</p>}
                {message.to_address && <p>收件人：{message.to_address}</p>}
                {message.emailAddress && <p>邮箱：{message.emailAddress}</p>}
                <p>
                  时间：
                  {new Date(
                    message.sent_at || message.received_at || 0
                  ).toLocaleString("zh-CN")}
                </p>
              </div>
            </div>

            {message.html && message.content && (
              <div className="border-b border-border p-2 bg-muted/30">
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

            <div className="h-[600px] overflow-hidden">
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
        </div>
      </div>
    </div>
  );
}

