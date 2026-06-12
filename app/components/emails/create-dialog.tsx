"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CalendarClock, Copy, Plus, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  CUSTOM_EXPIRY_OPTION_VALUE,
  calculateExpiryTime,
  EXPIRY_OPTIONS,
  type ExpiryUnit,
} from "@/types/email";
import { useCopy } from "@/hooks/use-copy";
import { useConfig } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useLocale, useTranslations } from "next-intl";

interface CreateDialogProps {
  onEmailCreated: () => void;
}

export function CreateDialog({ onEmailCreated }: CreateDialogProps) {
  const { config } = useConfig();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailName, setEmailName] = useState("");
  const [currentDomain, setCurrentDomain] = useState("");
  const [expiryTime, setExpiryTime] = useState(
    EXPIRY_OPTIONS[2].value.toString()
  );
  const [customExpiryValue, setCustomExpiryValue] = useState("7");
  const [customExpiryUnit, setCustomExpiryUnit] =
    useState<ExpiryUnit>("days");
  const { toast } = useToast();
  const { copyToClipboard } = useCopy();
  const emailNameInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("email");
  const tc = useTranslations("common");
  const locale = useLocale();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // 对话框打开时自动聚焦到邮箱名输入框
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        emailNameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const generateRandomName = async () => {
    try {
      const response = await fetch("/api/emails/preview-prefix");
      if (response.ok) {
        const data = (await response.json()) as { prefix: string };
        setEmailName(data.prefix);
      }
    } catch (error) {
      console.error("Failed to generate prefix:", error);
      // 如果失败，清空让后端在创建时生成
      setEmailName("");
    }
  };

  const copyEmailAddress = () => {
    copyToClipboard(`${emailName}@${currentDomain}`);
  };

  const createEmail = async () => {
    // 允许空前缀，由后端根据配置生成

    setLoading(true);
    try {
      const selectedExpiryTime =
        expiryTime === CUSTOM_EXPIRY_OPTION_VALUE
          ? calculateExpiryTime(
              customExpiryUnit,
              Number.parseInt(customExpiryValue, 10)
            )
          : Number.parseInt(expiryTime, 10);

      if (!Number.isSafeInteger(selectedExpiryTime) || selectedExpiryTime < 0) {
        toast({
          title: tc("error"),
          description: t("create.customExpiryInvalid"),
          variant: "destructive",
        });
        return;
      }

      const response = await fetch("/api/emails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: emailName,
          domain: currentDomain,
          expiryTime: selectedExpiryTime,
        }),
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
        description: t("create.success"),
      });
      onEmailCreated();
      setOpen(false);
      setEmailName("");
    } catch {
      toast({
        title: tc("error"),
        description: t("create.failed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if ((config?.emailDomainsArray?.length ?? 0) > 0) {
      setCurrentDomain(config?.emailDomainsArray[0] ?? "");
    }
  }, [config]);

  // 滚轮切换域名处理函数
  const handleDomainWheel = (e: React.WheelEvent) => {
    if (!config?.emailDomainsArray || config.emailDomainsArray.length <= 1) return;

    e.preventDefault();
    e.stopPropagation();

    const currentIndex = config.emailDomainsArray.indexOf(currentDomain);
    if (currentIndex === -1) return;

    let nextIndex: number;
    if (e.deltaY > 0) {
      // 向下滚动 - 下一个域名
      nextIndex = (currentIndex + 1) % config.emailDomainsArray.length;
    } else {
      // 向上滚动 - 上一个域名
      nextIndex = (currentIndex - 1 + config.emailDomainsArray.length) % config.emailDomainsArray.length;
    }

    setCurrentDomain(config.emailDomainsArray[nextIndex]);
  };

  // 自定义有效期的到期时间预览（仅在数值合法时展示）
  const customExpiryMs = calculateExpiryTime(
    customExpiryUnit,
    Number.parseInt(customExpiryValue, 10)
  );
  const customExpiryPreview =
    Number.isSafeInteger(customExpiryMs) && customExpiryMs > 0
      ? new Date(Date.now() + customExpiryMs).toLocaleString(
          locale === "zh" ? "zh-CN" : "en-US",
          {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }
        )
      : null;

  const isCustomExpiry = expiryTime === CUSTOM_EXPIRY_OPTION_VALUE;

  // 自定义有效期输入区（桌面在 Popover 内、移动端内联复用）
  const customExpiryFields = (
    <div className="space-y-2.5">
      <p className="text-xs font-medium text-muted-foreground">
        {t("create.expiry")}
      </p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="1"
          value={customExpiryValue}
          onChange={(event) => setCustomExpiryValue(event.target.value)}
          placeholder={t("create.customExpiryPlaceholder")}
          className="w-20"
        />
        <Select
          value={customExpiryUnit}
          onValueChange={(value) => setCustomExpiryUnit(value as ExpiryUnit)}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">{t("expiry.minutes")}</SelectItem>
            <SelectItem value="hours">{t("expiry.hours")}</SelectItem>
            <SelectItem value="days">{t("expiry.days")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {customExpiryPreview && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          <span className="truncate">{customExpiryPreview}</span>
        </div>
      )}
    </div>
  );

  const formBody = (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          ref={emailNameInputRef}
          value={emailName}
          onChange={(e) => setEmailName(e.target.value)}
          placeholder={t("create.prefixPlaceholder")}
          className="min-w-0 flex-1"
        />
        {(config?.emailDomainsArray?.length ?? 0) > 1 && (
          <div
            className="relative group shrink-0"
            title={t("create.domainScrollHint")}
            onWheel={handleDomainWheel}
          >
            <Select value={currentDomain} onValueChange={setCurrentDomain}>
              <SelectTrigger className="w-auto min-w-[150px] max-w-[260px] transition-all group-hover:ring-2 group-hover:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config?.emailDomainsArray?.map((d) => (
                  <SelectItem key={d} value={d}>
                    <span className="text-muted-foreground">@</span>
                    <span className="font-medium">{d}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={generateRandomName}
          type="button"
          title={t("create.randomPrefix")}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2.5">
        <Label className="text-muted-foreground">{t("create.expiry")}</Label>
        <RadioGroup
          value={expiryTime}
          onValueChange={setExpiryTime}
          className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2.5 md:flex-nowrap"
        >
          {EXPIRY_OPTIONS.map((option) => (
            <div
              key={option.value}
              className="flex items-center gap-1.5 whitespace-nowrap"
            >
              <RadioGroupItem
                value={option.value.toString()}
                id={option.value.toString()}
              />
              <Label
                htmlFor={option.value.toString()}
                className="cursor-pointer text-sm font-normal"
              >
                {t(option.label)}
              </Label>
            </div>
          ))}
          {isDesktop ? (
            <Popover open={isCustomExpiry}>
              <PopoverAnchor asChild>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                  <RadioGroupItem
                    value={CUSTOM_EXPIRY_OPTION_VALUE}
                    id={CUSTOM_EXPIRY_OPTION_VALUE}
                  />
                  <Label
                    htmlFor={CUSTOM_EXPIRY_OPTION_VALUE}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {t("expiry.custom")}
                  </Label>
                </div>
              </PopoverAnchor>
              <PopoverContent
                side="right"
                align="start"
                sideOffset={16}
                onOpenAutoFocus={(event) => event.preventDefault()}
                onInteractOutside={(event) => event.preventDefault()}
                className="w-auto"
              >
                {customExpiryFields}
              </PopoverContent>
            </Popover>
          ) : (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <RadioGroupItem
                value={CUSTOM_EXPIRY_OPTION_VALUE}
                id={CUSTOM_EXPIRY_OPTION_VALUE}
              />
              <Label
                htmlFor={CUSTOM_EXPIRY_OPTION_VALUE}
                className="cursor-pointer text-sm font-normal"
              >
                {t("expiry.custom")}
              </Label>
            </div>
          )}
        </RadioGroup>
        {!isDesktop && isCustomExpiry && (
          <div className="rounded-xl border bg-muted/30 p-3">
            {customExpiryFields}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="shrink-0">{t("fullAddress")}</span>
        {emailName ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{`${emailName}@${currentDomain}`}</span>
            <div
              className="shrink-0 cursor-pointer hover:text-primary transition-colors"
              onClick={copyEmailAddress}
            >
              <Copy className="size-4" />
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground">...</span>
        )}
      </div>
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
      <Button onClick={createEmail} disabled={loading}>
        {loading ? t("create.creating") : t("create.createButton")}
      </Button>
    </>
  );

  const triggerButton = (
    <Button className="gap-2">
      <Plus className="w-4 h-4" />
      {t("create.button")}
    </Button>
  );

  const srDescription =
    "设置邮箱前缀、域名和过期时间，创建一个新的临时邮箱。";

  // 移动端：底部抽屉；桌面：居中对话框
  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{triggerButton}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{t("create.title")}</DrawerTitle>
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
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
