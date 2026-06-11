"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Send } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useTranslations } from "next-intl";

interface SendDialogProps {
  emailId: string;
  fromAddress: string;
  onSendSuccess?: () => void;
}

export function SendDialog({
  emailId,
  fromAddress,
  onSendSuccess,
}: SendDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const { toast } = useToast();
  const toInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("email");
  const tc = useTranslations("common");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // 对话框打开时自动聚焦到收件人输入框
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        toInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !content.trim()) {
      toast({
        title: tc("error"),
        description: t("send.requiredFields"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/emails/${emailId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, subject, content }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast({
          title: tc("error"),
          description: (data as { error: string }).error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: tc("success"),
        description: t("send.success"),
      });
      setOpen(false);
      setTo("");
      setSubject("");
      setContent("");

      onSendSuccess?.();
    } catch {
      toast({
        title: tc("error"),
        description: t("send.failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerButton = (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 gap-2 hover:bg-primary/10 hover:text-primary transition-colors"
      title={t("send.tooltip")}
    >
      <Send className="h-4 w-4" />
      <span className="hidden sm:inline">{t("send.button")}</span>
    </Button>
  );

  const formBody = (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {t("sender", { address: fromAddress })}
      </div>
      <Input
        ref={toInputRef}
        value={to}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setTo(e.target.value)
        }
        placeholder={t("send.toPlaceholder")}
      />
      <Input
        value={subject}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setSubject(e.target.value)
        }
        placeholder={t("send.subjectPlaceholder")}
      />
      <Textarea
        value={content}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          setContent(e.target.value)
        }
        placeholder={t("send.contentPlaceholder")}
        rows={6}
      />
    </div>
  );

  const footerButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(false)}
        disabled={loading}
      >
        {tc("cancel")}
      </Button>
      <Button onClick={handleSend} disabled={loading}>
        {loading ? t("send.sending") : t("send.send")}
      </Button>
    </>
  );

  const srDescription =
    "填写收件人、主题和内容，从当前临时邮箱发送一封邮件。";

  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{t("send.title")}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {srDescription}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">{formBody}</div>
          <DrawerFooter className="flex-row justify-end">
            {footerButtons}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("send.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {srDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">{formBody}</div>
        <div className="flex justify-end gap-2">{footerButtons}</div>
      </DialogContent>
    </Dialog>
  );
}
