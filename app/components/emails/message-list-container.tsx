"use client";

import { useState, useEffect } from "react";
import { Send, Inbox } from "lucide-react";
import {
  Tabs,
  SlidingTabsList,
  SlidingTabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { MessageList } from "./message-list";
import { useTranslations } from "next-intl";

interface MessageListContainerProps {
  email: {
    id: string;
    address: string;
  };
  canSendEmails: boolean;
  onMessageSelect: (
    messageId: string | null,
    messageType?: "received" | "sent"
  ) => void;
  selectedMessageId?: string | null;
  refreshTrigger?: number;
}

export function MessageListContainer({
  email,
  canSendEmails,
  onMessageSelect,
  selectedMessageId,
  refreshTrigger,
}: MessageListContainerProps) {
  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const t = useTranslations("email");

  // 当邮箱切换时,重置 tab 到收件箱
  useEffect(() => {
    setActiveTab("received");
  }, [email.id]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as "received" | "sent");
    onMessageSelect(null);
  };

  return (
    <div className="h-full flex flex-col">
      {canSendEmails ? (
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="h-full flex flex-col"
        >
          <div className="p-2 border-b border-primary/20">
            <SlidingTabsList>
              <SlidingTabsTrigger value="received">
                <Inbox className="h-4 w-4" />
                {t("inbox")}
              </SlidingTabsTrigger>
              <SlidingTabsTrigger value="sent">
                <Send className="h-4 w-4" />
                {t("sent")}
              </SlidingTabsTrigger>
            </SlidingTabsList>
          </div>

          <TabsContent value="received" className="flex-1 overflow-hidden m-0">
            <MessageList
              email={email}
              messageType="received"
              onMessageSelect={onMessageSelect}
              selectedMessageId={selectedMessageId}
            />
          </TabsContent>

          <TabsContent value="sent" className="flex-1 overflow-hidden m-0">
            <MessageList
              email={email}
              messageType="sent"
              onMessageSelect={onMessageSelect}
              selectedMessageId={selectedMessageId}
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex-1 overflow-hidden">
          <MessageList
            email={email}
            messageType="received"
            onMessageSelect={onMessageSelect}
            selectedMessageId={selectedMessageId}
          />
        </div>
      )}
    </div>
  );
}
