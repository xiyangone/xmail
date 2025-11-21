"use client";

import { useState, useEffect } from "react";
import { BrandHeader } from "@/components/ui/brand-header";
import { SharedMessageList } from "@/components/emails/shared-message-list";
import { SharedMessageDetail } from "@/components/emails/shared-message-detail";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Message {
  id: string;
  from_address?: string;
  to_address?: string;
  subject: string;
  received_at?: number | Date;
  sent_at?: number | Date;
}

interface Email {
  id: string;
  address: string;
  createdAt: Date;
  expiresAt: Date;
}

interface SharedEmailPageClientProps {
  email: Email;
  initialMessages: Message[];
  initialNextCursor: string | null;
  initialTotal: number;
  token: string;
}

export function SharedEmailPageClient({
  email,
  token,
}: SharedEmailPageClientProps) {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleBack = () => {
    setSelectedMessageId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* 顶部品牌区域 */}
        <div className="text-center mb-8">
          <BrandHeader showCTA={false} />

          {/* 邮箱信息卡片 */}
          <div className="mt-6 max-w-2xl mx-auto">
            <div className="bg-card border border-border rounded-xl shadow-lg p-6 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">{email.address}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                邮箱过期时间：
                {new Date(email.expiresAt).toLocaleString("zh-CN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* 邮件内容区域 */}
        <div className="max-w-7xl mx-auto">
          <div className="bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            <div className="h-[600px] flex">
              {isMobile ? (
                <>
                  {!selectedMessageId ? (
                    <div className="flex-1">
                      <SharedMessageList
                        token={token}
                        onMessageSelect={setSelectedMessageId}
                        selectedMessageId={selectedMessageId || undefined}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col">
                      <div className="p-2 border-b border-border bg-muted/30">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleBack}
                          className="gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          返回列表
                        </Button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <SharedMessageDetail
                          token={token}
                          messageId={selectedMessageId}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="w-80 border-r border-border">
                    <SharedMessageList
                      token={token}
                      onMessageSelect={setSelectedMessageId}
                      selectedMessageId={selectedMessageId || undefined}
                    />
                  </div>
                  <div className="flex-1">
                    {selectedMessageId ? (
                      <SharedMessageDetail
                        token={token}
                        messageId={selectedMessageId}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p className="text-sm">选择邮件查看详情</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
