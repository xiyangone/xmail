"use client";

import { useEffect, useState } from "react";
import { EmailList } from "./email-list";
import { MessageListContainer } from "./message-list-container";
import { MessageView } from "./message-view";
import { SendDialog } from "./send-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useCopy } from "@/hooks/use-copy";
import { useSendPermission } from "@/hooks/use-send-permission";
import { Copy, FileText, Inbox, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

interface Email {
  id: string;
  address: string;
}

export function ThreeColumnLayout() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [selectedMessageType, setSelectedMessageType] = useState<
    "received" | "sent"
  >("received");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { copyToClipboard } = useCopy();
  const { canSend: canSendEmails } = useSendPermission();
  const t = useTranslations("email");
  const tc = useTranslations("common");
  const ts = useTranslations("shared");

  const columnClass = "surface-panel-workspace flex min-h-0 flex-col";
  const desktopHeaderClass =
    "surface-toolbar-workspace flex min-h-[78px] shrink-0 items-center justify-between gap-4 px-5 py-4";
  const mobileHeaderClass =
    "surface-toolbar-workspace flex shrink-0 items-center justify-between gap-2 px-4 py-3";
  const headerIntroClass = "flex min-w-0 items-center gap-3";
  const headerIconClass =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-background/36 text-primary shadow-sm backdrop-blur-xl";
  const headerTitleClass = "truncate text-sm font-semibold leading-5";
  const headerSubtitleClass = "mt-1 truncate text-xs text-muted-foreground/90";
  const copyButtonClass =
    "flex h-8 w-8 items-center justify-center rounded-xl border border-primary/14 bg-background/34 text-primary transition-all duration-200 hover:border-primary/28 hover:bg-primary/10 hover:text-primary";
  const emptyStateClass = "h-full px-6 py-10";

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateLayout = () => {
      setIsDesktop(mediaQuery.matches);
    };

    updateLayout();
    mediaQuery.addEventListener("change", updateLayout);

    return () => {
      mediaQuery.removeEventListener("change", updateLayout);
    };
  }, []);

  // 移动端视图逻辑
  const getMobileView = () => {
    if (selectedMessageId) return "message";
    if (selectedEmail) return "emails";
    return "list";
  };

  const mobileView = getMobileView();

  if (isDesktop === null) {
    return <div className="flex h-full min-h-0 flex-col" />;
  }

  const copyEmailAddress = () => {
    copyToClipboard(selectedEmail?.address || "");
  };

  const handleMessageSelect = (
    messageId: string | null,
    messageType: "received" | "sent" = "received"
  ) => {
    setSelectedMessageId(messageId);
    setSelectedMessageType(messageType);
  };

  const handleSendSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {isDesktop ? (
        <div className="grid flex-1 min-h-0 grid-cols-12 gap-4">
          <div className={cn("col-span-3", columnClass)}>
            <div className={desktopHeaderClass}>
              <div className={headerIntroClass}>
                <div className={headerIconClass}>
                  <Inbox className="h-4 w-4" />
                </div>
                <h2 className={headerTitleClass}>{t("myMailbox")}</h2>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <EmailList
                onEmailSelect={(email) => {
                  setSelectedEmail(email);
                  setSelectedMessageId(null);
                  setSelectedMessageType("received");
                }}
                selectedEmailId={selectedEmail?.id}
              />
            </div>
          </div>

          <div className={cn("col-span-4", columnClass)}>
            <div className={desktopHeaderClass}>
              <div className={headerIntroClass}>
                <div className={headerIconClass}>
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className={headerTitleClass}>
                    {selectedEmail ? selectedEmail.address : t("noEmailSelected")}
                  </h2>
                  <p className={headerSubtitleClass}>
                    {selectedEmail
                      ? t("receivedHint")
                      : t("create.noMailboxHint")}
                  </p>
                </div>
              </div>
              {selectedEmail && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    className={copyButtonClass}
                    onClick={copyEmailAddress}
                    title={tc("copy")}
                    aria-label={tc("copy")}
                  >
                    <Copy className="size-4" />
                  </button>
                  {canSendEmails && (
                    <SendDialog
                      emailId={selectedEmail.id}
                      fromAddress={selectedEmail.address}
                      onSendSuccess={handleSendSuccess}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {selectedEmail ? (
                <MessageListContainer
                  email={selectedEmail}
                  canSendEmails={canSendEmails}
                  onMessageSelect={handleMessageSelect}
                  selectedMessageId={selectedMessageId}
                  refreshTrigger={refreshTrigger}
                />
              ) : (
                <EmptyState
                  icon={Mail}
                  title={t("noEmailSelected")}
                  description={t("create.noMailboxHint")}
                  className={emptyStateClass}
                />
              )}
            </div>
          </div>

          <div className={cn("col-span-5", columnClass)}>
            <div className={desktopHeaderClass}>
              <div className={headerIntroClass}>
                <div className={headerIconClass}>
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h2 className={headerTitleClass}>
                    {selectedMessageId
                      ? t("messageContent")
                      : t("noMessageSelected")}
                  </h2>
                  <p className={headerSubtitleClass}>
                    {selectedMessageId && selectedEmail
                      ? selectedEmail.address
                      : selectedEmail
                        ? ts("selectMessage")
                        : t("noEmailSelected")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {selectedEmail && selectedMessageId ? (
                <MessageView
                  emailId={selectedEmail.id}
                  messageId={selectedMessageId}
                  messageType={selectedMessageType}
                  onClose={() => setSelectedMessageId(null)}
                />
              ) : (
                <EmptyState
                  icon={selectedEmail ? FileText : Inbox}
                  title={
                    selectedEmail ? t("messageContent") : t("noMessageSelected")
                  }
                  description={
                    selectedEmail ? ts("selectMessage") : t("noEmailSelected")
                  }
                  className={emptyStateClass}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={cn("flex-1 min-h-0", columnClass)}>
          {mobileView === "list" && (
            <>
              <div className={mobileHeaderClass}>
                <h2 className={headerTitleClass}>{t("myMailbox")}</h2>
              </div>
              <div className="flex-1 overflow-auto">
                <EmailList
                  onEmailSelect={(email) => {
                    setSelectedEmail(email);
                    setSelectedMessageId(null);
                    setSelectedMessageType("received");
                  }}
                  selectedEmailId={selectedEmail?.id}
                />
              </div>
            </>
          )}

          {mobileView === "emails" && selectedEmail && (
            <div className="h-full flex flex-col">
              <div className={cn(mobileHeaderClass, "gap-2")}>
                <button
                  onClick={() => {
                    setSelectedEmail(null);
                  }}
                  className="text-sm text-primary shrink-0"
                >
                  {t("backToMailbox")}
                </button>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate min-w-0 text-right text-sm font-medium">
                      {selectedEmail.address}
                    </span>
                    <button
                      type="button"
                      className={copyButtonClass}
                      onClick={copyEmailAddress}
                      title={tc("copy")}
                      aria-label={tc("copy")}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  {canSendEmails && (
                    <SendDialog
                      emailId={selectedEmail.id}
                      fromAddress={selectedEmail.address}
                      onSendSuccess={handleSendSuccess}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <MessageListContainer
                  email={selectedEmail}
                  canSendEmails={canSendEmails}
                  onMessageSelect={handleMessageSelect}
                  selectedMessageId={selectedMessageId}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            </div>
          )}

          {mobileView === "message" && selectedEmail && selectedMessageId && (
            <div className="h-full flex flex-col">
              <div className={mobileHeaderClass}>
                <button
                  onClick={() => setSelectedMessageId(null)}
                  className="text-sm text-primary"
                >
                  {t("backToMessages")}
                </button>
                <span className="truncate text-sm font-medium">
                  {t("messageContent")}
                </span>
              </div>
              <div className="flex-1 overflow-auto">
                <MessageView
                  emailId={selectedEmail.id}
                  messageId={selectedMessageId}
                  messageType={selectedMessageType}
                  onClose={() => setSelectedMessageId(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
